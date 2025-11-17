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

    return newSeries;
  }

  async getSeries(userId: string, filters?: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    // Get all series
    let query = db
      .select({
        series: series,
      })
      .from(series)
      .orderBy(series.name)
      .limit(limit)
      .offset(offset);

    const allSeries = await query;

    // For each series, get completion stats
    const seriesWithStats = await Promise.all(
      allSeries.map(async (s) => {
        // Count total volumes in series
        const [volumeCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(seriesBooks)
          .where(eq(seriesBooks.seriesId, s.series.id));

        // Count owned volumes (books in user's collection)
        const [ownedCount] = await db
          .select({ count: sql<number>`count(distinct ${seriesBooks.volumeNumber})` })
          .from(seriesBooks)
          .innerJoin(editions, eq(editions.bookId, seriesBooks.bookId))
          .innerJoin(userBooks, eq(userBooks.editionId, editions.id))
          .where(
            and(
              eq(seriesBooks.seriesId, s.series.id),
              eq(userBooks.userId, userId),
              eq(userBooks.status, 'owned')
            )
          );

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
    const seriesData = await db.query.series.findFirst({
      where: eq(series.id, seriesId),
    });

    if (!seriesData) {
      return null;
    }

    // Get all books in series
    const seriesBooksData = await db
      .select({
        seriesBook: seriesBooks,
        book: books,
      })
      .from(seriesBooks)
      .innerJoin(books, eq(seriesBooks.bookId, books.id))
      .where(eq(seriesBooks.seriesId, seriesId))
      .orderBy(seriesBooks.volumeNumber);

    // Get ownership status for each volume
    const volumesWithStatus = await Promise.all(
      seriesBooksData.map(async (sb) => {
        const editionsData = await db
          .select({
            edition: editions,
            userBook: userBooks,
          })
          .from(editions)
          .leftJoin(
            userBooks,
            and(
              eq(userBooks.editionId, editions.id),
              eq(userBooks.userId, userId)
            )
          )
          .where(eq(editions.bookId, sb.book.id));

        const owned = editionsData.some((e) => e.userBook?.status === 'owned');
        const wanted = editionsData.some((e) => e.userBook?.status === 'wanted');

        return {
          volumeNumber: sb.seriesBook.volumeNumber,
          volumeName: sb.seriesBook.volumeName,
          book: sb.book,
          owned,
          wanted,
          status: owned ? 'owned' : wanted ? 'wanted' : 'missing',
        };
      })
    );

    const totalVolumes = seriesData.totalVolumes || volumesWithStatus.length;
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
    const existing = await db.query.seriesBooks.findFirst({
      where: and(
        eq(seriesBooks.seriesId, input.seriesId),
        eq(seriesBooks.bookId, input.bookId)
      ),
    });

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

    return updated;
  }
}
