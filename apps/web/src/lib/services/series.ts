import { db } from '../db';
import {
  series,
  seriesBooks,
  seriesVolumes,
  books,
  userBooks,
  editions,
} from '@booktarr/database';
import { eq, and, sql, desc } from 'drizzle-orm';
import { VolumeReconciliationService } from './volume-reconciliation';

export interface CreateSeriesInput {
  name: string;
  description?: string;
  totalVolumes?: number;
  status?: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
  type?: string;
}

export interface AddBookToSeriesInput {
  seriesId: string;
  bookId: string;
  volumeNumber: number;
  volumeName?: string;
  partNumber?: number;
  arcName?: string;
}

export class SeriesService {
  private volumeReconciliation: VolumeReconciliationService;

  constructor() {
    this.volumeReconciliation = new VolumeReconciliationService();
  }

  async createSeries(input: CreateSeriesInput) {
    const [newSeries] = await db
      .insert(series)
      .values({
        name: input.name,
        description: input.description,
        totalVolumes: input.totalVolumes,
        status: input.status || 'ongoing',
        type: input.type,
        metadataSource: 'manual',
      })
      .returning();

    // If totalVolumes is set, populate expected volume entries
    if (input.totalVolumes && input.totalVolumes > 0) {
      await this.volumeReconciliation.populateExpectedVolumes(newSeries.id);
    }

    return newSeries;
  }

  /**
   * Find series by name (case-insensitive) or create if doesn't exist
   */
  async findOrCreateSeries(name: string, type?: string): Promise<any> {
    // Search for existing series (case-insensitive, simple query for neon-http)
    const [existing] = await db
      .select()
      .from(series)
      .where(sql`LOWER(${series.name}) = LOWER(${name})`)
      .limit(1);

    if (existing) {
      return existing;
    }

    // Create new series
    return this.createSeries({
      name,
      type,
      status: 'ongoing',
    });
  }

  async getSeries(userId: string, filters?: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    // Get all series (simple select, no nested wrapper)
    const allSeriesRaw = await db
      .select()
      .from(series)
      .orderBy(series.name)
      .limit(limit)
      .offset(offset);

    // Wrap in { series: ... } format for compatibility with downstream code
    const allSeries = allSeriesRaw.map(s => ({ series: s }));

    // For each series, get completion stats
    const seriesWithStats = await Promise.all(
      allSeries.map(async (s) => {
        // Count total volumes in series
        const [volumeCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(seriesBooks)
          .where(eq(seriesBooks.seriesId, s.series.id));

        // Count owned volumes - separate queries to avoid joins
        const seriesBookEntries = await db
          .select({ bookId: seriesBooks.bookId, volumeNumber: seriesBooks.volumeNumber })
          .from(seriesBooks)
          .where(eq(seriesBooks.seriesId, s.series.id));

        let ownedVolumeNumbers = new Set<number>();
        for (const sb of seriesBookEntries) {
          // Check if user owns any edition of this book
          const editionList = await db
            .select({ id: editions.id })
            .from(editions)
            .where(eq(editions.bookId, sb.bookId));

          for (const ed of editionList) {
            const [ub] = await db
              .select({ id: userBooks.id })
              .from(userBooks)
              .where(and(
                eq(userBooks.editionId, ed.id),
                eq(userBooks.userId, userId),
                eq(userBooks.status, 'owned')
              ))
              .limit(1);

            if (ub) {
              ownedVolumeNumbers.add(sb.volumeNumber);
              break;
            }
          }
        }

        const ownedCount = { count: ownedVolumeNumbers.size };

        const totalVolumes = s.series.totalVolumes || Number(volumeCount.count);
        const owned = Number(ownedCount.count);
        const completionPercentage =
          totalVolumes > 0 ? Math.round((owned / totalVolumes) * 100) : 0;

        return {
          ...s.series,
          totalVolumes,
          ownedVolumes: owned,
          completionPercentage,
        };
      })
    );

    return seriesWithStats;
  }

  async getSeriesById(seriesId: string, userId: string) {
    const [seriesData] = await db
      .select()
      .from(series)
      .where(eq(series.id, seriesId))
      .limit(1);

    if (!seriesData) {
      return null;
    }

    // Get all expected volumes (separate queries to avoid joins)
    const volumeEntries = await db
      .select()
      .from(seriesVolumes)
      .where(eq(seriesVolumes.seriesId, seriesId))
      .orderBy(seriesVolumes.volumeNumber);

    // Hydrate each volume with book data
    const volumesData = await Promise.all(
      volumeEntries.map(async (vol) => {
        let book = null;
        if (vol.bookId) {
          const [b] = await db.select().from(books).where(eq(books.id, vol.bookId)).limit(1);
          book = b || null;
        }
        return { volume: vol, book };
      })
    );

    // Get ownership status for each volume
    const volumesWithStatus = await Promise.all(
      volumesData.map(async (v) => {
        let owned = false;
        let wanted = false;
        let coverUrl: string | null = null;

        // If volume has a linked book, check ownership and get cover
        if (v.book) {
          const editionList = await db
            .select()
            .from(editions)
            .where(eq(editions.bookId, v.book.id));

          for (const ed of editionList) {
            const [ub] = await db.select().from(userBooks)
              .where(and(eq(userBooks.editionId, ed.id), eq(userBooks.userId, userId)))
              .limit(1);
            if (ub?.status === 'owned') owned = true;
            if (ub?.status === 'wanted') wanted = true;
          }

          // Get cover from first edition with a cover
          coverUrl = editionList.find(e => e.coverUrl)?.coverUrl || null;
        }

        // Fallback to volume-specific cover, then series cover
        if (!coverUrl) {
          coverUrl = v.volume.coverUrl || seriesData.coverUrl || null;
        }

        return {
          volumeNumber: v.volume.volumeNumber,
          volumeName: v.volume.title,
          coverUrl,
          book: v.book,
          owned,
          wanted,
          status: owned ? ('owned' as const) : wanted ? ('wanted' as const) : ('missing' as const),
        };
      })
    );

    const totalVolumes = seriesData.totalVolumes || volumesData.length;
    const ownedVolumes = volumesWithStatus.filter((v) => v.owned).length;

    return {
      series: seriesData,
      volumes: volumesWithStatus,
      stats: {
        totalVolumes,
        ownedVolumes,
        missingVolumes: totalVolumes - ownedVolumes,
        completionPercentage:
          totalVolumes > 0 ? Math.round((ownedVolumes / totalVolumes) * 100) : 0,
      },
    };
  }

  async addBookToSeries(input: AddBookToSeriesInput) {
    // Check if book already in series
    const [existing] = await db
      .select()
      .from(seriesBooks)
      .where(and(
        eq(seriesBooks.seriesId, input.seriesId),
        eq(seriesBooks.bookId, input.bookId)
      ))
      .limit(1);

    if (existing) {
      throw new Error('Book already in series');
    }

    const [seriesBook] = await db
      .insert(seriesBooks)
      .values({
        seriesId: input.seriesId,
        bookId: input.bookId,
        volumeNumber: input.volumeNumber,
        volumeName: input.volumeName,
        partNumber: input.partNumber,
        arcName: input.arcName,
        displayOrder: input.volumeNumber,
      })
      .returning();

    // Reconcile volume entry after adding book
    await this.volumeReconciliation.reconcileAfterBookAdded(
      input.seriesId,
      input.bookId,
      input.volumeNumber,
      input.volumeName || undefined
    );

    return seriesBook;
  }

  async removeBookFromSeries(seriesId: string, bookId: string) {
    await db
      .delete(seriesBooks)
      .where(
        and(
          eq(seriesBooks.seriesId, seriesId),
          eq(seriesBooks.bookId, bookId)
        )
      );
  }

  async deleteSeries(seriesId: string) {
    // Cascade will handle deletion of seriesBooks and seriesVolumes
    await db.delete(series).where(eq(series.id, seriesId));
  }

  async updateSeries(
    seriesId: string,
    updates: Partial<CreateSeriesInput>
  ) {
    const [updated] = await db
      .update(series)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(series.id, seriesId))
      .returning();

    // If totalVolumes was updated, reconcile volume entries
    if (updates.totalVolumes !== undefined && updates.totalVolumes > 0) {
      await this.volumeReconciliation.populateExpectedVolumes(seriesId);
    }

    return updated;
  }
}
