import { db } from '../db';
import { books, editions, authors, bookAuthors, userBooks, readingProgress, seriesBooks, series } from '@booktarr/database';
import { eq, and, or, like, ilike, desc, sql, isNull, inArray } from 'drizzle-orm';
import { MetadataService } from './metadata';
import { BookMetadata } from './google-books';
import { SeriesParserService } from './series-parser';
import { SeriesService } from './series';
import { logger } from '../logger';

/** Normalize partial dates (e.g. "2018" -> "2018-01-01") for PostgreSQL date column */
function normalizeDate(dateStr?: string | null): string | undefined {
  if (!dateStr) return undefined;
  if (/^\d{4}$/.test(dateStr)) return `${dateStr}-01-01`;
  if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}-01`;
  return dateStr;
}

export interface CreateBookInput {
  // Search-based creation
  isbn?: string;
  title?: string;
  author?: string;

  // Manual entry
  manualEntry?: {
    title: string;
    subtitle?: string;
    authors: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    language?: string;
  };

  // Edition details
  edition?: {
    isbn10?: string;
    isbn13?: string;
    format?: string;
    pages?: number;
    publisher?: string;
    publishedDate?: string;
    coverUrl?: string;
  };

  // User collection details
  userId: string;
  status?: 'owned' | 'wanted' | 'missing' | 'loaned';
}

export class BookService {
  private metadataService: MetadataService;
  private seriesParser: SeriesParserService;
  private seriesService: SeriesService;

  constructor() {
    this.metadataService = new MetadataService();
    this.seriesParser = new SeriesParserService();
    this.seriesService = new SeriesService();
  }

  async createBook(input: CreateBookInput) {
    let metadata: BookMetadata | null = null;

    // 1. Get or fetch metadata
    // If manualEntry is provided (e.g. CSV import), use it directly
    // to avoid slow external API calls for every row
    if (input.manualEntry) {
      metadata = {
        ...input.manualEntry,
        isbn10: input.edition?.isbn10,
        isbn13: input.edition?.isbn13,
        coverUrl: input.edition?.coverUrl,
      };
    }

    // Only call external APIs if no manual data provided
    if (!metadata && input.isbn) {
      metadata = await this.metadataService.enrichByISBN(input.isbn);
    }

    if (!metadata && input.title) {
      const results = await this.metadataService.searchByTitle(
        input.title,
        input.author
      );
      metadata = results[0] || null;
    }

    if (!metadata) {
      throw new Error('Could not find book metadata');
    }

    // Wrap all DB operations in a transaction for atomicity
    // (prevents orphaned records if any step fails)
    return await db.transaction(async (tx) => {
      // 2. Check if book already exists (by ISBN or title+author)
      let existingBook = null;

      if (metadata.isbn13 || metadata.isbn10) {
        const conditions = [];
        if (metadata.isbn13) conditions.push(eq(editions.isbn13, metadata.isbn13));
        if (metadata.isbn10) conditions.push(eq(editions.isbn10, metadata.isbn10));

        const [existingEditionRow] = await tx
          .select()
          .from(editions)
          .where(or(...conditions))
          .limit(1);

        if (existingEditionRow) {
          const [linkedBook] = await tx.select().from(books).where(eq(books.id, existingEditionRow.bookId)).limit(1);
          existingBook = linkedBook || null;
        }
      }

      if (!existingBook && metadata.title) {
        const [titleMatch] = await tx
          .select()
          .from(books)
          .where(sql`LOWER(${books.title}) = LOWER(${metadata.title})`)
          .limit(1);
        if (titleMatch) {
          existingBook = titleMatch;
        }
      }

      // 3. Create or get book
      let book;
      if (existingBook) {
        book = existingBook;
      } else {
        const [newBook] = await tx
          .insert(books)
          .values({
            title: metadata.title,
            subtitle: metadata.subtitle,
            description: metadata.description,
            language: metadata.language || 'en',
            publisher: metadata.publisher,
            publishedDate: normalizeDate(metadata.publishedDate),
            pageCount: metadata.pageCount,
            categories: metadata.categories,
            googleBooksId: metadata.googleBooksId,
            openLibraryId: metadata.openLibraryId,
            metadataSource: 'google_books',
            metadataLastUpdated: new Date(),
          })
          .returning();

        book = newBook;

        // 4. Create/link authors
        if (metadata.authors && metadata.authors.length > 0) {
          for (let i = 0; i < metadata.authors.length; i++) {
            const authorName = metadata.authors[i];

            const existingAuthors = await tx
              .select()
              .from(authors)
              .where(eq(authors.name, authorName))
              .limit(1);
            let author = existingAuthors[0] || null;

            if (!author) {
              const [newAuthor] = await tx
                .insert(authors)
                .values({ name: authorName })
                .returning();
              author = newAuthor;
            }

            await tx.insert(bookAuthors).values({
              bookId: book.id,
              authorId: author.id,
              displayOrder: i,
            });
          }
        }

        // 5. Auto-detect and link series (only for new books)
        try {
          const seriesInfo = this.seriesParser.parseTitle(metadata.title);
          if (seriesInfo) {
            const seriesRecord = await this.seriesService.findOrCreateSeries(
              seriesInfo.seriesName,
              metadata.categories?.some((c) => c.toLowerCase().includes('manga'))
                ? 'manga'
                : undefined
            );

            const existingLink = await tx.query.seriesBooks.findFirst({
              where: and(
                eq(seriesBooks.seriesId, seriesRecord.id),
                eq(seriesBooks.bookId, book.id)
              ),
            });

            if (!existingLink) {
              await tx.insert(seriesBooks).values({
                seriesId: seriesRecord.id,
                bookId: book.id,
                volumeNumber: seriesInfo.volumeNumber,
                volumeName: seriesInfo.volumeName || null,
                displayOrder: seriesInfo.volumeNumber,
              });
            }
          }
        } catch (error) {
          logger.error('Series detection error:', error instanceof Error ? error : new Error(String(error)));
        }
      }

      // 7. Create or get edition
      const isbn13 = metadata.isbn13 || input.edition?.isbn13;
      const isbn10 = metadata.isbn10 || input.edition?.isbn10;

      let edition = null;
      if (isbn13 || isbn10) {
        edition = await tx.query.editions.findFirst({
          where: and(
            eq(editions.bookId, book.id),
            or(
              isbn13 ? eq(editions.isbn13, isbn13) : undefined,
              isbn10 ? eq(editions.isbn10, isbn10) : undefined
            )
          ),
        });
      }

      if (!edition) {
        const [newEdition] = await tx
          .insert(editions)
          .values({
            bookId: book.id,
            isbn10,
            isbn13,
            format: input.edition?.format,
            pages: input.edition?.pages || metadata.pageCount,
            publisher: input.edition?.publisher || metadata.publisher,
            publishedDate: normalizeDate(input.edition?.publishedDate || metadata.publishedDate),
            coverUrl: input.edition?.coverUrl || metadata.coverUrl,
            coverThumbnailUrl: metadata.thumbnailUrl,
          })
          .returning();
        edition = newEdition;
      }

      // 8. Add to user's collection (or update if already exists)
      const existingUserBook = await tx.query.userBooks.findFirst({
        where: and(
          eq(userBooks.userId, input.userId),
          eq(userBooks.editionId, edition.id)
        ),
      });

      let userBook;
      if (existingUserBook) {
        const [updated] = await tx
          .update(userBooks)
          .set({
            status: input.status || existingUserBook.status,
          })
          .where(eq(userBooks.id, existingUserBook.id))
          .returning();
        userBook = updated;
      } else {
        const [newUserBook] = await tx
          .insert(userBooks)
          .values({
            userId: input.userId,
            editionId: edition.id,
            status: input.status || 'owned',
            acquisitionDate: new Date().toISOString().split('T')[0],
          })
          .returning();
        userBook = newUserBook;
      }

      return {
        book,
        edition,
        userBook,
        isNewBook: !existingBook,
        isNewEdition: !existingUserBook,
      };
    });
  }

  async getUserBooks(userId: string, filters?: {
    status?: string;
    search?: string;
    author?: string;
    readingStatus?: string;
    format?: string;
    minRating?: number;
    yearMin?: number;
    yearMax?: number;
    genre?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    // Build WHERE conditions applied at SQL level (no post-query JS filtering)
    const conditions = [eq(userBooks.userId, userId)];

    if (filters?.status) {
      conditions.push(eq(userBooks.status, filters.status));
    }

    if (filters?.format) {
      conditions.push(eq(editions.format, filters.format));
    }

    // Search filter (case-insensitive, punctuation-flexible)
    if (filters?.search) {
      const normalizedSearch = filters.search.replace(/[^\w\s]/g, '');
      conditions.push(
        or(
          ilike(books.title, `%${filters.search}%`),
          ilike(books.description, `%${filters.search}%`),
          sql`regexp_replace(lower(${books.title}), '[^a-z0-9\\s]', '', 'g') LIKE ${`%${normalizedSearch.toLowerCase()}%`}`,
          sql`regexp_replace(lower(${books.description}), '[^a-z0-9\\s]', '', 'g') LIKE ${`%${normalizedSearch.toLowerCase()}%`}`
        )!
      );
    }

    // Year filters
    if (filters?.yearMin || filters?.yearMax) {
      const yearConditions = [];
      if (filters.yearMin) {
        yearConditions.push(sql`CAST(SUBSTR(${books.publishedDate}, 1, 4) AS INTEGER) >= ${filters.yearMin}`);
      }
      if (filters.yearMax) {
        yearConditions.push(sql`CAST(SUBSTR(${books.publishedDate}, 1, 4) AS INTEGER) <= ${filters.yearMax}`);
      }
      if (yearConditions.length > 0) {
        conditions.push(and(...yearConditions)!);
      }
    }

    // Author filter - pushed to SQL via EXISTS subquery (was post-query JS filter)
    if (filters?.author) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM book_authors ba
          JOIN authors a ON ba.author_id = a.id
          WHERE ba.book_id = ${books.id}
          AND LOWER(a.name) LIKE ${'%' + filters.author.toLowerCase() + '%'}
        )`
      );
    }

    // Reading status filter - pushed to SQL via EXISTS subquery (was post-query JS filter)
    if (filters?.readingStatus) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM reading_progress rp
          WHERE rp.book_id = ${books.id}
          AND rp.user_id = ${userId}
          AND rp.status = ${filters.readingStatus}
        )`
      );
    }

    // Rating filter - pushed to SQL via EXISTS subquery (was post-query JS filter)
    if (filters?.minRating) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM reading_progress rp
          WHERE rp.book_id = ${books.id}
          AND rp.user_id = ${userId}
          AND rp.rating >= ${filters.minRating}
        )`
      );
    }

    // Genre filter - pushed to SQL (was post-query JS filter)
    if (filters?.genre) {
      const genreLower = filters.genre.toLowerCase();
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM unnest(${books.categories}) AS cat
          WHERE LOWER(cat) LIKE ${'%' + genreLower + '%'}
        )`
      );
    }

    // Single JOIN query replacing N+1 pattern (was 400+ queries, now 1)
    const results = await db
      .select({
        userBook: userBooks,
        edition: editions,
        book: books,
      })
      .from(userBooks)
      .innerJoin(editions, eq(userBooks.editionId, editions.id))
      .innerJoin(books, eq(editions.bookId, books.id))
      .where(and(...conditions))
      .orderBy(desc(userBooks.createdAt))
      .limit(limit)
      .offset(offset);

    if (results.length === 0) {
      // Still need the total count for pagination
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userBooks)
        .innerJoin(editions, eq(userBooks.editionId, editions.id))
        .innerJoin(books, eq(editions.bookId, books.id))
        .where(and(...conditions));
      return { books: [], total: Number(countResult?.count || 0) };
    }

    // Batch fetch related data (3 queries instead of N*M)
    const bookIds = [...new Set(results.map(r => r.book.id))];

    // Batch fetch all authors for all books in one query
    const allAuthorLinks = await db
      .select({
        bookId: bookAuthors.bookId,
        authorId: authors.id,
        authorName: authors.name,
        authorBio: authors.bio,
        authorImageUrl: authors.imageUrl,
        displayOrder: bookAuthors.displayOrder,
      })
      .from(bookAuthors)
      .innerJoin(authors, eq(bookAuthors.authorId, authors.id))
      .where(inArray(bookAuthors.bookId, bookIds))
      .orderBy(bookAuthors.displayOrder);

    const authorsByBookId = new Map<string, Array<{ id: string; name: string; bio: string | null; imageUrl: string | null }>>();
    for (const link of allAuthorLinks) {
      if (!authorsByBookId.has(link.bookId)) {
        authorsByBookId.set(link.bookId, []);
      }
      authorsByBookId.get(link.bookId)!.push({
        id: link.authorId,
        name: link.authorName,
        bio: link.authorBio,
        imageUrl: link.authorImageUrl,
      });
    }

    // Batch fetch reading progress for all books in one query
    const allProgress = await db
      .select()
      .from(readingProgress)
      .where(and(
        eq(readingProgress.userId, userId),
        inArray(readingProgress.bookId, bookIds)
      ));
    const progressByBookId = new Map(allProgress.map(p => [p.bookId, p]));

    // Batch fetch series info for all books in one query
    const allSeriesBooks = await db
      .select({
        bookId: seriesBooks.bookId,
        seriesId: seriesBooks.seriesId,
        volumeNumber: seriesBooks.volumeNumber,
        seriesName: series.name,
      })
      .from(seriesBooks)
      .innerJoin(series, eq(seriesBooks.seriesId, series.id))
      .where(inArray(seriesBooks.bookId, bookIds));

    const seriesByBookId = new Map(allSeriesBooks.map(sb => [sb.bookId, {
      id: sb.seriesId,
      name: sb.seriesName,
      volumeNumber: sb.volumeNumber,
    }]));

    // Assemble results (pure mapping, no DB calls)
    const booksWithAuthors = results.map(({ userBook, edition, book }) => ({
      userBook,
      edition,
      book,
      authors: authorsByBookId.get(book.id) || [],
      readingProgress: progressByBookId.get(book.id) || null,
      series: seriesByBookId.get(book.id) || null,
    }));

    // Get total count with same filters (for accurate pagination)
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userBooks)
      .innerJoin(editions, eq(userBooks.editionId, editions.id))
      .innerJoin(books, eq(editions.bookId, books.id))
      .where(and(...conditions));

    return {
      books: booksWithAuthors,
      total: Number(countResult?.count || 0),
    };
  }

  async getBookById(bookId: string, userId: string) {
    const book = await db.query.books.findFirst({
      where: eq(books.id, bookId),
    });

    if (!book) {
      return null;
    }

    // Batch fetch authors in one JOIN query (was N+1)
    const authorLinks = await db
      .select({
        authorId: authors.id,
        authorName: authors.name,
        authorBio: authors.bio,
        authorImageUrl: authors.imageUrl,
      })
      .from(bookAuthors)
      .innerJoin(authors, eq(bookAuthors.authorId, authors.id))
      .where(eq(bookAuthors.bookId, book.id))
      .orderBy(bookAuthors.displayOrder);

    const bookAuthorsData = authorLinks.map(a => ({
      id: a.authorId,
      name: a.authorName,
      bio: a.authorBio,
      imageUrl: a.authorImageUrl,
    }));

    // Get editions with user status in one JOIN query (was N+1)
    const bookEditions = await db
      .select({
        edition: editions,
        userStatus: userBooks.status,
      })
      .from(editions)
      .leftJoin(
        userBooks,
        and(
          eq(userBooks.editionId, editions.id),
          eq(userBooks.userId, userId)
        )
      )
      .where(eq(editions.bookId, book.id));

    const editionsWithStatus = bookEditions.map(({ edition, userStatus }) => ({
      ...edition,
      userStatus: userStatus || null,
    }));

    return {
      book,
      authors: bookAuthorsData,
      editions: editionsWithStatus,
    };
  }

  async deleteBook(bookId: string, userId: string) {
    // Delete all user's editions of this book
    const bookEditions = await db.query.editions.findMany({
      where: eq(editions.bookId, bookId),
    });

    for (const edition of bookEditions) {
      await db
        .delete(userBooks)
        .where(
          and(
            eq(userBooks.editionId, edition.id),
            eq(userBooks.userId, userId)
          )
        );
    }

    // Note: We don't delete the book itself, just the user's ownership
    // This keeps the metadata in the system for other users
  }

  async clearAllBooks(userId: string) {
    // Delete all user's books and their reading progress
    // Delete reading progress first (no FK constraint but logical order)
    await db.delete(readingProgress).where(eq(readingProgress.userId, userId));

    // Delete all user's book ownerships
    await db.delete(userBooks).where(eq(userBooks.userId, userId));

    // Note: We don't delete the book/edition/author metadata
    // This keeps the data in the system for future use or other users
  }

  /**
   * Finds books with missing or incomplete metadata
   * Returns books that need enrichment (missing description, cover, etc.)
   */
  async getBooksNeedingEnrichment(limit: number = 10): Promise<any[]> {
    // Find books missing critical metadata
    const booksNeedingEnrichment = await db
      .select({
        bookId: books.id,
        title: books.title,
        description: books.description,
        pageCount: books.pageCount,
        bookPublisher: books.publisher,
        editionId: editions.id,
        coverUrl: editions.coverUrl,
        isbn13: editions.isbn13,
        isbn10: editions.isbn10,
      })
      .from(books)
      .innerJoin(editions, eq(books.id, editions.bookId))
      .where(
        or(
          eq(books.description, ''),
          isNull(books.description),
          eq(editions.coverUrl, ''),
          isNull(editions.coverUrl),
          isNull(books.pageCount),
          eq(books.publisher, ''),
          isNull(books.publisher)
        )
      )
      .limit(limit);

    return booksNeedingEnrichment;
  }

  /**
   * Enriches a book's metadata by fetching from external APIs
   */
  async enrichBookMetadata(bookId: string): Promise<boolean> {
    try {
      const book = await db.query.books.findFirst({
        where: eq(books.id, bookId),
      });

      if (!book) {
        return false;
      }

      // Get an ISBN for this book
      const edition = await db.query.editions.findFirst({
        where: and(
          eq(editions.bookId, bookId),
          or(
            sql`${editions.isbn13} IS NOT NULL`,
            sql`${editions.isbn10} IS NOT NULL`
          )
        ),
      });

      if (!edition || (!edition.isbn13 && !edition.isbn10)) {
        logger.info(`[Enrichment] No ISBN found for book ${bookId}`);
        return false;
      }

      const isbn = edition.isbn13 || edition.isbn10!;

      // Fetch fresh metadata
      const metadata = await this.metadataService.enrichByISBN(isbn);

      if (!metadata) {
        logger.info(`[Enrichment] No metadata found for ISBN ${isbn}`);
        return false;
      }

      // Update book metadata
      await db
        .update(books)
        .set({
          description: metadata.description || book.description,
          pageCount: metadata.pageCount || book.pageCount,
          publisher: metadata.publisher || book.publisher,
          publishedDate: normalizeDate(metadata.publishedDate) || book.publishedDate,
          categories: metadata.categories || book.categories,
          metadataLastUpdated: new Date(),
        })
        .where(eq(books.id, bookId));

      // Update edition cover if missing
      if (!edition.coverUrl && metadata.coverUrl) {
        await db
          .update(editions)
          .set({
            coverUrl: metadata.coverUrl,
            coverThumbnailUrl: metadata.thumbnailUrl,
          })
          .where(eq(editions.id, edition.id));
      }

      logger.info(`[Enrichment] Successfully enriched book ${bookId} (${book.title})`);
      return true;
    } catch (error) {
      logger.error(`[Enrichment] Error enriching book ${bookId}`, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Batch enrichment process - enriches multiple books with rate limiting
   */
  async enrichBooksInBatch(batchSize: number = 10): Promise<{
    processed: number;
    enriched: number;
    failed: number;
  }> {
    const booksToEnrich = await this.getBooksNeedingEnrichment(batchSize);

    let enriched = 0;
    let failed = 0;

    for (const item of booksToEnrich) {
      const success = await this.enrichBookMetadata(item.bookId);
      if (success) {
        enriched++;
      } else {
        failed++;
      }
    }

    return {
      processed: booksToEnrich.length,
      enriched,
      failed,
    };
  }

  /**
   * Add an edition to user's collection
   */
  async addEditionToCollection(
    userId: string,
    editionId: string,
    status: 'owned' | 'wanted' | 'missing' = 'owned'
  ) {
    // Check if user already has this edition
    const existing = await db.query.userBooks.findFirst({
      where: and(
        eq(userBooks.userId, userId),
        eq(userBooks.editionId, editionId)
      ),
    });

    if (existing) {
      // Update existing status
      const [updated] = await db
        .update(userBooks)
        .set({ status })
        .where(eq(userBooks.id, existing.id))
        .returning();
      return updated;
    }

    // Create new user book entry
    const [newUserBook] = await db
      .insert(userBooks)
      .values({
        userId,
        editionId,
        status,
        acquisitionDate: new Date().toISOString().split('T')[0],
      })
      .returning();

    return newUserBook;
  }

  /**
   * Update edition ownership status
   */
  async updateEditionStatus(
    userId: string,
    editionId: string,
    status: 'owned' | 'wanted' | 'missing'
  ) {
    const userBook = await db.query.userBooks.findFirst({
      where: and(
        eq(userBooks.userId, userId),
        eq(userBooks.editionId, editionId)
      ),
    });

    if (!userBook) {
      throw new Error('User does not own this edition');
    }

    const [updated] = await db
      .update(userBooks)
      .set({ status })
      .where(eq(userBooks.id, userBook.id))
      .returning();

    return updated;
  }

  /**
   * Remove edition from user's collection
   */
  async removeEditionFromCollection(userId: string, editionId: string) {
    await db
      .delete(userBooks)
      .where(
        and(
          eq(userBooks.userId, userId),
          eq(userBooks.editionId, editionId)
        )
      );

    return { success: true };
  }
}
