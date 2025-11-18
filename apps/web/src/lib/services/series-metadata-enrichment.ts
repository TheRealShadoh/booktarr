/**
 * Series Metadata Enrichment Service
 * Fetches series metadata (cover images, total volumes) from external APIs
 * with proper rate limiting
 */

import { db } from '@/lib/db';
import { series } from '@booktarr/database';
import { eq } from 'drizzle-orm';

interface SeriesMetadata {
  coverUrl?: string;
  totalVolumes?: number;
  description?: string;
  status?: string;
  anilistId?: number;
}

export class SeriesMetadataEnrichmentService {
  private readonly ANILIST_API = 'https://graphql.anilist.co';
  private readonly GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

  // Rate limiting: 90 requests per minute for AniList
  private lastAnilistRequest = 0;
  private readonly ANILIST_MIN_INTERVAL = 700; // ~85 requests per minute

  // Rate limiting: 1000 requests per day for Google Books (free tier)
  private lastGoogleBooksRequest = 0;
  private readonly GOOGLE_BOOKS_MIN_INTERVAL = 100; // ~600 requests per hour

  /**
   * Wait for rate limit compliance
   */
  private async waitForRateLimit(lastRequest: number, minInterval: number): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequest;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Fetch series metadata from AniList
   */
  private async fetchFromAniList(seriesName: string): Promise<SeriesMetadata | null> {
    await this.waitForRateLimit(this.lastAnilistRequest, this.ANILIST_MIN_INTERVAL);
    this.lastAnilistRequest = Date.now();

    const query = `
      query ($search: String) {
        Media(search: $search, type: MANGA) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          volumes
          description
          status
        }
      }
    `;

    try {
      const response = await fetch(this.ANILIST_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { search: seriesName },
        }),
      });

      if (!response.ok) {
        console.error(`[AniList] HTTP error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const media = data?.data?.Media;

      if (!media) {
        return null;
      }

      // Map AniList status to our status
      const statusMap: Record<string, string> = {
        'FINISHED': 'completed',
        'RELEASING': 'ongoing',
        'NOT_YET_RELEASED': 'announced',
        'CANCELLED': 'cancelled',
        'HIATUS': 'hiatus',
      };

      return {
        coverUrl: media.coverImage?.large,
        totalVolumes: media.volumes || undefined,
        description: media.description?.replace(/<[^>]*>/g, ''), // Strip HTML
        status: statusMap[media.status] || 'ongoing',
        anilistId: media.id,
      };
    } catch (error) {
      console.error('[AniList] Fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch series metadata from Google Books
   */
  private async fetchFromGoogleBooks(seriesName: string): Promise<SeriesMetadata | null> {
    await this.waitForRateLimit(this.lastGoogleBooksRequest, this.GOOGLE_BOOKS_MIN_INTERVAL);
    this.lastGoogleBooksRequest = Date.now();

    try {
      const response = await fetch(
        `${this.GOOGLE_BOOKS_API}?q=intitle:${encodeURIComponent(seriesName)}&maxResults=1`
      );

      if (!response.ok) {
        console.error(`[Google Books] HTTP error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const item = data?.items?.[0];

      if (!item) {
        return null;
      }

      const volumeInfo = item.volumeInfo;

      return {
        coverUrl: volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'),
        description: volumeInfo.description,
      };
    } catch (error) {
      console.error('[Google Books] Fetch error:', error);
      return null;
    }
  }

  /**
   * Enrich a single series with metadata from external APIs
   */
  async enrichSeries(seriesId: string): Promise<void> {
    const seriesData = await db.query.series.findFirst({
      where: eq(series.id, seriesId),
    });

    if (!seriesData) {
      console.error(`[Enrichment] Series ${seriesId} not found`);
      return;
    }

    console.log(`[Enrichment] Fetching metadata for "${seriesData.name}"`);

    // Try AniList first (better for manga/light novels)
    let metadata = await this.fetchFromAniList(seriesData.name);

    // Fall back to Google Books if AniList didn't return results
    if (!metadata?.coverUrl) {
      const googleData = await this.fetchFromGoogleBooks(seriesData.name);
      metadata = {
        ...metadata,
        coverUrl: metadata?.coverUrl || googleData?.coverUrl,
        description: metadata?.description || googleData?.description,
      };
    }

    if (!metadata) {
      console.log(`[Enrichment] No metadata found for "${seriesData.name}"`);
      return;
    }

    // Update series with fetched metadata
    const updates: Partial<typeof seriesData> = {
      metadataLastUpdated: new Date(),
    };

    if (metadata.coverUrl && !seriesData.manualOverride) {
      updates.coverUrl = metadata.coverUrl;
    }

    if (metadata.totalVolumes && !seriesData.totalVolumes && !seriesData.manualOverride) {
      updates.totalVolumes = metadata.totalVolumes;
    }

    if (metadata.description && !seriesData.description && !seriesData.manualOverride) {
      updates.description = metadata.description;
    }

    if (metadata.status && !seriesData.manualOverride) {
      updates.status = metadata.status;
    }

    if (metadata.anilistId) {
      updates.anilistId = metadata.anilistId;
      updates.metadataSource = 'anilist';
    }

    await db
      .update(series)
      .set(updates)
      .where(eq(series.id, seriesId));

    console.log(`[Enrichment] Updated "${seriesData.name}" with metadata:`, {
      coverUrl: !!metadata.coverUrl,
      totalVolumes: metadata.totalVolumes,
      status: metadata.status,
    });
  }

  /**
   * Enrich all series that don't have metadata
   */
  async enrichAllSeries(): Promise<{ processed: number; updated: number; errors: number }> {
    const allSeries = await db.query.series.findMany({
      where: (s, { isNull, or }) => or(
        isNull(s.metadataLastUpdated),
        isNull(s.coverUrl),
        isNull(s.totalVolumes)
      ),
    });

    console.log(`[Enrichment] Found ${allSeries.length} series needing enrichment`);

    let updated = 0;
    let errors = 0;

    for (const s of allSeries) {
      try {
        await this.enrichSeries(s.id);
        updated++;
      } catch (error) {
        console.error(`[Enrichment] Error enriching ${s.name}:`, error);
        errors++;
      }
    }

    return {
      processed: allSeries.length,
      updated,
      errors,
    };
  }
}
