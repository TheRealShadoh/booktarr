import { db } from '../db';
import { readingProgress, readingGoals, books, editions, authors, bookAuthors, userBooks } from '@booktarr/database';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';

export type ReadingStatus = 'want_to_read' | 'currently_reading' | 'finished' | 'dnf' | 'on_hold';

export interface CreateReadingProgressInput {
  userId: string;
  bookId: string;
  status?: ReadingStatus;
  currentPage?: number;
  totalPages?: number;
  rating?: number;
  review?: string;
}

export interface UpdateReadingProgressInput {
  status?: ReadingStatus;
  currentPage?: number;
  totalPages?: number;
  progressPercentage?: number;
  rating?: number;
  review?: string;
  reviewPublic?: 'private' | 'friends' | 'public';
}

export interface ReadingStats {
  totalBooksRead: number;
  currentlyReading: number;
  wantToRead: number;
  booksFinishedThisYear: number;
  booksFinishedThisMonth: number;
  averageRating: number;
  totalPagesRead: number;
  totalReadingTime: number;
  favoriteGenres: string[];
}

export class ReadingProgressService {
  /**
   * Get or create reading progress for a book
   */
  async getOrCreateProgress(userId: string, bookId: string): Promise<any> {
    const existing = await db
      .select()
      .from(readingProgress)
      .where(and(eq(readingProgress.userId, userId), eq(readingProgress.bookId, bookId)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const [progress] = await db
      .insert(readingProgress)
      .values({
        userId,
        bookId,
        status: 'want_to_read',
        currentPage: 0,
        progressPercentage: 0,
        readingSessions: 0,
        totalReadingTime: 0,
      })
      .returning();

    return progress;
  }

  /**
   * Update reading progress
   */
  async updateProgress(
    userId: string,
    bookId: string,
    input: UpdateReadingProgressInput
  ): Promise<any> {
    // Calculate progress percentage if pages are provided
    let progressPercentage = input.progressPercentage;
    if (input.currentPage !== undefined && input.totalPages !== undefined && input.totalPages > 0) {
      progressPercentage = Math.round((input.currentPage / input.totalPages) * 100);
    }

    // If status is changing to currently_reading and no startedAt, set it
    const updates: any = {
      ...input,
      updatedAt: new Date(),
      lastReadAt: new Date(),
    };

    if (progressPercentage !== undefined) {
      updates.progressPercentage = progressPercentage;
    }

    // Get existing progress to check status changes
    const existing = await this.getOrCreateProgress(userId, bookId);

    if (input.status === 'currently_reading' && !existing.startedAt) {
      updates.startedAt = new Date();
    }

    if (input.status === 'finished' && !existing.finishedAt) {
      updates.finishedAt = new Date();
      updates.progressPercentage = 100;
      updates.currentPage = input.totalPages || existing.totalPages;
    }

    const [updated] = await db
      .update(readingProgress)
      .set(updates)
      .where(and(eq(readingProgress.userId, userId), eq(readingProgress.bookId, bookId)))
      .returning();

    return updated;
  }

  /**
   * Start reading a book
   */
  async startReading(userId: string, bookId: string, totalPages?: number): Promise<any> {
    const progress = await this.getOrCreateProgress(userId, bookId);

    return this.updateProgress(userId, bookId, {
      status: 'currently_reading',
      totalPages: totalPages || progress.totalPages || undefined,
      currentPage: progress.currentPage || 0,
    });
  }

  /**
   * Finish reading a book
   */
  async finishReading(
    userId: string,
    bookId: string,
    rating?: number,
    review?: string
  ): Promise<any> {
    const progress = await this.getOrCreateProgress(userId, bookId);

    return this.updateProgress(userId, bookId, {
      status: 'finished',
      currentPage: progress.totalPages || progress.currentPage,
      rating,
      review,
    });
  }

  /**
   * Get currently reading books for a user
   */
  async getCurrentlyReading(userId: string): Promise<any[]> {
    const results = await db
      .select({
        readingProgress: readingProgress,
        book: books,
        edition: editions,
        userBook: userBooks,
      })
      .from(readingProgress)
      .innerJoin(books, eq(readingProgress.bookId, books.id))
      .innerJoin(editions, eq(books.id, editions.bookId))
      .innerJoin(userBooks, and(
        eq(userBooks.editionId, editions.id),
        eq(userBooks.userId, userId)
      ))
      .where(and(
        eq(readingProgress.userId, userId),
        eq(readingProgress.status, 'currently_reading')
      ))
      .orderBy(desc(readingProgress.lastReadAt));

    // Get authors for each book
    const booksWithAuthors = await Promise.all(
      results.map(async (result) => {
        const bookAuthorsData = await db
          .select({
            author: authors,
            role: bookAuthors.role,
          })
          .from(bookAuthors)
          .innerJoin(authors, eq(bookAuthors.authorId, authors.id))
          .where(eq(bookAuthors.bookId, result.book.id))
          .orderBy(bookAuthors.displayOrder);

        return {
          userBook: result.userBook,
          edition: result.edition,
          book: result.book,
          authors: bookAuthorsData.map((ba) => ba.author),
          readingProgress: result.readingProgress,
        };
      })
    );

    return booksWithAuthors;
  }

  /**
   * Get books by status
   */
  async getBooksByStatus(userId: string, status: ReadingStatus): Promise<any[]> {
    const results = await db
      .select({
        progress: readingProgress,
        book: books,
      })
      .from(readingProgress)
      .innerJoin(books, eq(readingProgress.bookId, books.id))
      .where(and(eq(readingProgress.userId, userId), eq(readingProgress.status, status)))
      .orderBy(desc(readingProgress.updatedAt));

    return results;
  }

  /**
   * Get reading statistics for a user
   */
  async getReadingStats(userId: string): Promise<ReadingStats> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Get all reading progress for user
    const allProgress = await db
      .select()
      .from(readingProgress)
      .where(eq(readingProgress.userId, userId));

    // Calculate stats
    const totalBooksRead = allProgress.filter((p) => p.status === 'finished').length;
    const currentlyReading = allProgress.filter((p) => p.status === 'currently_reading').length;
    const wantToRead = allProgress.filter((p) => p.status === 'want_to_read').length;

    const booksFinishedThisYear = allProgress.filter(
      (p) =>
        p.status === 'finished' &&
        p.finishedAt &&
        new Date(p.finishedAt).getFullYear() === currentYear
    ).length;

    const booksFinishedThisMonth = allProgress.filter(
      (p) =>
        p.status === 'finished' &&
        p.finishedAt &&
        new Date(p.finishedAt).getFullYear() === currentYear &&
        new Date(p.finishedAt).getMonth() === currentMonth
    ).length;

    const ratingsSum = allProgress.reduce((sum, p) => sum + (p.rating || 0), 0);
    const ratingsCount = allProgress.filter((p) => p.rating !== null).length;
    const averageRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;

    const totalPagesRead = allProgress.reduce((sum, p) => {
      if (p.status === 'finished' && p.totalPages) {
        return sum + p.totalPages;
      }
      if (p.status === 'currently_reading' && p.currentPage) {
        return sum + p.currentPage;
      }
      return sum;
    }, 0);

    const totalReadingTime = allProgress.reduce((sum, p) => sum + (p.totalReadingTime || 0), 0);

    return {
      totalBooksRead,
      currentlyReading,
      wantToRead,
      booksFinishedThisYear,
      booksFinishedThisMonth,
      averageRating: Math.round(averageRating * 10) / 10,
      totalPagesRead,
      totalReadingTime,
      favoriteGenres: [], // TODO: Implement genre tracking
    };
  }

  /**
   * Get reading progress for a specific book
   */
  async getProgressForBook(userId: string, bookId: string): Promise<any | null> {
    const results = await db
      .select()
      .from(readingProgress)
      .where(and(eq(readingProgress.userId, userId), eq(readingProgress.bookId, bookId)))
      .limit(1);

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Delete reading progress
   */
  async deleteProgress(userId: string, bookId: string): Promise<void> {
    await db
      .delete(readingProgress)
      .where(and(eq(readingProgress.userId, userId), eq(readingProgress.bookId, bookId)));
  }

  /**
   * Get or create reading goal for a year
   */
  async getOrCreateGoal(userId: string, year: number): Promise<any> {
    const existing = await db
      .select()
      .from(readingGoals)
      .where(and(eq(readingGoals.userId, userId), eq(readingGoals.year, year)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const [goal] = await db
      .insert(readingGoals)
      .values({
        userId,
        year,
        targetBooks: 50, // Default goal
        booksRead: 0,
        pagesRead: 0,
      })
      .returning();

    return goal;
  }

  /**
   * Update reading goal
   */
  async updateGoal(userId: string, year: number, targetBooks: number, targetPages?: number): Promise<any> {
    await this.getOrCreateGoal(userId, year);

    const [updated] = await db
      .update(readingGoals)
      .set({
        targetBooks,
        targetPages,
        updatedAt: new Date(),
      })
      .where(and(eq(readingGoals.userId, userId), eq(readingGoals.year, year)))
      .returning();

    return updated;
  }
}
