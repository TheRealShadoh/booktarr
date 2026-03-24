import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AniListClient } from '@/lib/services/anilist';
import { MonitoringService } from '@/lib/services/monitoring';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';
const BATCH_SIZE = 3;

// Status map shared with enrichment service conventions
const ANILIST_STATUS_MAP: Record<string, string> = {
  FINISHED: 'completed',
  RELEASING: 'ongoing',
  NOT_YET_RELEASED: 'announced',
  CANCELLED: 'cancelled',
  HIATUS: 'hiatus',
};

/**
 * Search Google Books for a specific volume in a series.
 * Returns the number of results found (> 0 means the volume likely exists).
 */
async function searchGoogleBooksForVolume(seriesName: string, volumeNumber: number): Promise<number> {
  const query = `intitle:"${seriesName}" Vol ${volumeNumber}`;
  try {
    const response = await fetch(
      `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&maxResults=1`
    );
    if (!response.ok) {
      logger.warn('[Monitor] Google Books search failed', { status: response.status, query });
      return 0;
    }
    const data = await response.json();
    return data?.totalItems ?? 0;
  } catch (error) {
    logger.error(
      '[Monitor] Google Books search error',
      error instanceof Error ? error : new Error(String(error))
    );
    return 0;
  }
}

/**
 * GET /api/cron/monitor
 * Daily discovery cron — checks monitored series for new volumes or status changes.
 * Processes up to 3 series per run (oldest metadataLastUpdated first) to stay
 * within the Vercel 60-second function timeout.
 */
export async function GET(req: Request) {
  // Verify cron secret if configured (Vercel sends Authorization header)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('[Monitor] No valid CRON_SECRET, proceeding anyway');
  }

  const summary = { processed: 0, discovered: 0, errors: 0 };

  try {
    const { series } = await import('@booktarr/database');
    const { sql: sqlFn, eq, asc } = await import('drizzle-orm');

    // Fetch the oldest-checked monitored series first so every series gets a
    // turn over time (round-robin across daily runs).
    const monitoredSeries = await db
      .select()
      .from(series)
      .where(eq(series.monitored, true))
      .orderBy(sqlFn`${series.metadataLastUpdated} ASC NULLS FIRST`)
      .limit(BATCH_SIZE);

    if (monitoredSeries.length === 0) {
      logger.info('[Monitor] No monitored series found, nothing to do');
      return NextResponse.json({ success: true, ...summary, timestamp: new Date().toISOString() });
    }

    logger.info('[Monitor] Starting discovery run', { count: monitoredSeries.length });

    const anilistClient = new AniListClient();
    const monitoringService = new MonitoringService();

    for (const s of monitoredSeries) {
      try {
        summary.processed++;
        let newVolumesFound = false;

        // ------------------------------------------------------------------
        // Path A: Series has an AniList ID — query by ID for exact data
        // ------------------------------------------------------------------
        if (s.anilistId) {
          const remote = await anilistClient.getSeriesById(s.anilistId);

          if (!remote) {
            logger.warn('[Monitor] AniList returned null for known ID', {
              seriesId: s.id,
              anilistId: s.anilistId,
            });
            // Still stamp the timestamp so we don't keep hammering a missing ID
            await db
              .update(series)
              .set({ metadataLastUpdated: new Date(), updatedAt: new Date() })
              .where(eq(series.id, s.id));
            continue;
          }

          const remoteVolumes = remote.totalVolumes ?? null;
          const localVolumes = s.totalVolumes ?? null;
          const remoteStatus = remote.status; // already mapped by AniListClient.parseMedia

          const updates: Record<string, unknown> = {
            metadataLastUpdated: new Date(),
            updatedAt: new Date(),
          };

          // Detect new volumes
          if (
            remoteVolumes !== null &&
            (localVolumes === null || remoteVolumes > localVolumes)
          ) {
            newVolumesFound = true;
            summary.discovered++;
            updates.totalVolumes = remoteVolumes;

            logger.info('[Monitor] New volumes discovered via AniList', {
              series: s.name,
              previousTotal: localVolumes,
              newTotal: remoteVolumes,
            });

            await monitoringService.logActivity({
              eventType: 'new_volume_discovered',
              entityType: 'series',
              entityId: s.id,
              entityName: s.name,
              details: {
                source: 'anilist',
                previousTotalVolumes: localVolumes,
                newTotalVolumes: remoteVolumes,
                anilistId: s.anilistId,
              },
            });
          }

          // Detect status change
          if (remoteStatus && remoteStatus !== s.status) {
            logger.info('[Monitor] Series status changed via AniList', {
              series: s.name,
              previousStatus: s.status,
              newStatus: remoteStatus,
            });

            updates.status = remoteStatus;

            await monitoringService.logActivity({
              eventType: 'series_status_changed',
              entityType: 'series',
              entityId: s.id,
              entityName: s.name,
              details: {
                source: 'anilist',
                previousStatus: s.status,
                newStatus: remoteStatus,
                anilistId: s.anilistId,
              },
            });
          }

          await db
            .update(series)
            .set(updates)
            .where(eq(series.id, s.id));

        // ------------------------------------------------------------------
        // Path B: No AniList ID — fall back to Google Books volume probe
        // ------------------------------------------------------------------
        } else {
          // Determine the next volume to check: totalVolumes + 1, or 1 if unknown
          const nextVolumeToCheck = (s.totalVolumes ?? 0) + 1;

          const hits = await searchGoogleBooksForVolume(s.name, nextVolumeToCheck);

          if (hits > 0) {
            newVolumesFound = true;
            summary.discovered++;

            logger.info('[Monitor] Potential new volume detected via Google Books', {
              series: s.name,
              probedVolume: nextVolumeToCheck,
              hits,
            });

            await monitoringService.logActivity({
              eventType: 'new_volume_discovered',
              entityType: 'series',
              entityId: s.id,
              entityName: s.name,
              details: {
                source: 'google_books',
                probedVolume: nextVolumeToCheck,
                previousTotalVolumes: s.totalVolumes,
                googleBooksHits: hits,
              },
            });

            // Update totalVolumes to reflect the newly detected volume
            await db
              .update(series)
              .set({
                totalVolumes: nextVolumeToCheck,
                metadataLastUpdated: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(series.id, s.id));
          } else {
            // No new volume found — just refresh the timestamp
            await db
              .update(series)
              .set({ metadataLastUpdated: new Date(), updatedAt: new Date() })
              .where(eq(series.id, s.id));
          }
        }

        logger.info('[Monitor] Processed series', {
          series: s.name,
          newVolumesFound,
          hasAnilistId: !!s.anilistId,
        });

      } catch (seriesError) {
        // Isolate per-series failures so the rest of the batch still runs
        summary.errors++;
        logger.error(
          '[Monitor] Error processing series',
          seriesError instanceof Error ? seriesError : new Error(String(seriesError)),
          { seriesId: s.id, seriesName: s.name }
        );
      }
    }

    logger.info('[Monitor] Discovery run complete', summary);

    return NextResponse.json({
      success: true,
      ...summary,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error(
      '[Monitor] Cron failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
