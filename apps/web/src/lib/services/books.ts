import { db } from '../db';
import { books, editions, authors, bookAuthors, userBooks, readingProgress, seriesBooks, series } from '@booktarr/database';
import { eq, and, or, like, ilike, desc, sql, isNull } from 'drizzle-orm';
import { MetadataService } from './metadata';
import { BookMetadata } from './google-books';
import { SeriesParserService } from './series-parser';
import { SeriesService } from './series';

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

    // 2. Check if book already exists (by ISBN or title+author)
    let existingBook = null;

    if (metadata.isbn13 || metadata.isbn10) {
      // Find existing edition by ISBN (simple query, no joins)
      const conditions = [];
      if (metadata.isbn13) conditions.push(eq(editions.isbn13, metadata.isbn13));
      if (metadata.isbn10) conditions.push(eq(editions.isbn10, metadata.isbn10));

      const [existingEditionRow] = await db
        .select()
        .from(editions)
        .where(or(...conditions))
        .limit(1);

      if (existingEditionRow) {
        // Get the linked book
        const [linkedBook] = await db.select().from(books).where(eq(books.id, existingEditionRow.bookId)).limit(1);
        existingBook = linkedBook || null;
      }

      // existingBook was already set above from linkedBook
    }

    // 3. Create or get book
    let book;
    if (existingBook) {
      book = existingBook;
    } else {
      const [newBook] = await db
        .insert(books)
        .values({
          title: metadata.title,
          subtitle: metadata.subtitle,
          description: metadata.description,
          language: metadata.language || 'en',
          publisher: metadata.publisher,
          publishedDate: metadata.publishedDate,
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

          // Find or create author
          // Use db.select() instead of db.query to avoid lateral joins on neon-http
          const existingAuthors = await db
            .select()
            .from(authors)
            .where(eq(authors.name, authorName))
            .limit(1);
          let author = existingAuthors[0] || null;

          if (!author) {
            const [newAuthor] = await db
              .insert(authors)
              .values({ name: authorName })
              .returning();
            author = newAuthor;
          }

          // Link book to author
          await db.insert(bookAuthors).values({
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
          // Find or create series
          const seriesRecord = await this.seriesService.findOrCreateSeries(
            seriesInfo.seriesName,
            // Detect type from categories if available
            metadata.categories?.some((c) => c.toLowerCase().includes('manga'))
              ? 'manga'
              : undefined
          );

          // Check if book is already linked to this series
          const existingLink = await db.query.seriesBooks.findFirst({
            where: and(
              eq(seriesBooks.seriesId, seriesRecord.id),
              eq(seriesBooks.bookId, book.id)
            ),
          });

          // Link book to series if not already linked
          if (!existingLink) {
            await db.insert(seriesBooks).values({
              seriesId: seriesRecord.id,
              bookId: book.id,
              volumeNumber: seriesInfo.volumeNumber,
              volumeName: seriesInfo.volumeName || null,
              displayOrder: seriesInfo.volumeNumber,
            });
          }
        }
      } catch (error) {
        // Log series detection error but don't fail book creation
        console.error('Series detection error:', error);
      }
    }

    // 7. Create or get edition
    const isbn13 = metadata.isbn13 || input.edition?.isbn13;
    const isbn10 = metadata.isbn10 || input.edition?.isbn10;

    // Check if this exact edition already exists
    let edition = null;
    if (isbn13 || isbn10) {
      edition = await db.query.editions.findFirst({
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
      // Create new edition
      const [newEdition] = await db
        .insert(editions)
        .values({
          bookId: book.id,
          isbn10,
          isbn13,
          format: input.edition?.format,
          pages: input.edition?.pages || metadata.pageCount,
          publisher: input.edition?.publisher || metadata.publisher,
          publishedDate: input.edition?.publishedDate || metadata.publishedDate,
          coverUrl: input.edition?.coverUrl || metadata.coverUrl,
          coverThumbnailUrl: metadata.thumbnailUrl,
        })
        .returning();
      edition = newEdition;
    }

    // 8. Add to user's collection (or update if already exists)
    // Check if user already owns this edition
    const existingUserBook = await db.query.userBooks.findFirst({
      where: and(
        eq(userBooks.userId, input.userId),
        eq(userBooks.editionId, edition.id)
      ),
    });

    let userBook;
    if (existingUserBook) {
      // Update existing ownership
      const [updated] = await db
        .update(userBooks)
        .set({
          status: input.status || existingUserBook.status,
        })
        .where(eq(userBooks.id, existingUserBook.id))
        .returning();
      userBook = updated;
    } else {
      // Add new ownership
      const [newUserBook] = await db
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

    const conditions = [eq(userBooks.userId, userId)];

    if (filters?.status) {
      conditions.push(eq(userBooks.status, filters.status));
    }

    if (filters?.format) {
      conditions.push(eq(editions.format, filters.format));
    }

    // Add search filter if provided (case-insensitive, punctuation-flexible)
    if (filters?.search) {
      // Strip punctuation from search term for flexible matching
      const normalizedSearch = filters.search.replace(/[^\w\s]/g, '');

      // Search using PostgreSQL's regexp_replace to strip punctuation from database values
      // This allows "dont" to match "don't", "cant" to match "can't", etc.
      conditions.push(
        or(
          // Regular search (exact match with punctuation)
          ilike(books.title, `%${filters.search}%`),
          ilike(books.description, `%${filters.search}%`),
          // Punctuation-stripped search (flexible match)
          sql`regexp_replace(lower(${books.title}), '[^a-z0-9\\s]', '', 'g') LIKE ${`%${normalizedSearch.toLowerCase()}%`}`,
          sql`regexp_replace(lower(${books.description}), '[^a-z0-9\\s]', '', 'g') LIKE ${`%${normalizedSearch.toLowerCase()}%`}`
        )!
      );
    }

    // Add year filters if provided
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

    // Get user's book entries (no joins to avoid column name conflicts on Neon)
    const userBookResults = await db
      .select()
      .from(userBooks)
      .where(and(...conditions))
      .orderBy(desc(userBooks.createdAt))
      .limit(limit)
      .offset(offset);

    // Hydrate each user book with edition, book, authors, etc.
    let booksWithAuthors = await Promise.all(
      userBookResults.map(async (userBook) => {
        // Get edition
        const edition = await db.query.editions.findFirst({
          where: eq(editions.id, userBook.editionId),
        });

        if (!edition) return null;

        // Get book
        const book = await db.query.books.findFirst({
          where: eq(books.id, edition.bookId),
        });

        if (!book) return null;

        // Get authors (separate queries to avoid lateral joins on neon-http)
        const bookAuthorLinks = await db
          .select()
          .from(bookAuthors)
          .where(eq(bookAuthors.bookId, book.id))
          .orderBy(bookAuthors.displayOrder);

        const bookAuthorsData = await Promise.all(
          bookAuthorLinks.map(async (link) => {
            const author = await db.select().from(authors).where(eq(authors.id, link.authorId)).limit(1);
            return { author: author[0] || null, role: link.role };
          })
        );

        // Get reading progress
        const progress = await db.query.readingProgress.findFirst({
          where: and(
            eq(readingProgress.userId, userId),
            eq(readingProgress.bookId, book.id)
          ),
        });

        // Get series information
        const seriesBookEntry = await db.query.seriesBooks.findFirst({
          where: eq(seriesBooks.bookId, book.id),
        });

        let seriesInfo = null;
        if (seriesBookEntry) {
          const seriesRecord = await db.query.series.findFirst({
            where: eq(series.id, seriesBookEntry.seriesId),
          });
          if (seriesRecord) {
            seriesInfo = {
              id: seriesRecord.id,
              name: seriesRecord.name,
              volumeNumber: seriesBookEntry.volumeNumber,
            };
          }
        }

        return {
          userBook,
          edition,
          book,
          authors: bookAuthorsData.map((ba) => ba.author),
          readingProgress: progress || null,
          series: seriesInfo,
        };
      })
    );

    // Filter out nulls (broken references)
    booksWithAuthors = booksWithAuthors.filter(Boolean) as typeof booksWithAuthors;

    // Apply post-query filters
    if (filters?.author) {
      booksWithAuthors = booksWithAuthors.filter((book) =>
        book?.authors.some((a) =>
          a.name.toLowerCase().includes(filters.author!.toLowerCase())
        )
      );
    }

    if (filters?.readingStatus) {
      booksWithAuthors = booksWithAuthors.filter(
        (book) => book?.readingProgress?.status === filters.readingStatus
      );
    }

    if (filters?.minRating) {
      booksWithAuthors = booksWithAuthors.filter(
        (book) => book?.readingProgress?.rating && book.readingProgress.rating >= filters.minRating!
      );
    }

    if (filters?.genre) {
      const genreLower = filters.genre.toLowerCase();
      booksWithAuthors = booksWithAuthors.filter((book) =>
        book?.book.categories?.some((cat: string) => cat.toLowerCase().includes(genreLower))
      );
    }

    // Get total count
    const countQuery = await db
      .select({ count: sql<number>`count(*)` })
      .from(userBooks)
      .where(eq(userBooks.userId, userId));

    const totalCount = Number(countQuery[0]?.count || 0);

    return {
      books: booksWithAuthors,
      total: totalCount,
    };
  }

  async getBookById(bookId: string, userId: string) {
    const book = await db.query.books.findFirst({
      where: eq(books.id, bookId),
    });

    if (!book) {
      return null;
    }

    // Get authors (separate queries to avoid lateral joins on neon-http)
    const bookAuthorLinks = await db
      .select()
      .from(bookAuthors)
      .where(eq(bookAuthors.bookId, book.id))
      .orderBy(bookAuthors.displayOrder);

    const bookAuthorsData = await Promise.all(
      bookAuthorLinks.map(async (link) => {
        const author = await db.select().from(authors).where(eq(authors.id, link.authorId)).limit(1);
        return { author: author[0] || null, role: link.role };
      })
    );

    // Get editions
    const bookEditions = await db.query.editions.findMany({
      where: eq(editions.bookId, book.id),
    });

    // Get user's ownership status for each edition
    const editionsWithStatus = await Promise.all(
      bookEditions.map(async (edition) => {
        const userBook = await db.query.userBooks.findFirst({
          where: and(
            eq(userBooks.editionId, edition.id),
            eq(userBooks.userId, userId)
          ),
        });

        return {
          ...edition,
          userStatus: userBook?.status || null,
        };
      })
    );

    return {
      book,
      authors: bookAuthorsData.map((ba) => ba.author),
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
        console.log(`[Enrichment] No ISBN found for book ${bookId}`);
        return false;
      }

      const isbn = edition.isbn13 || edition.isbn10!;

      // Fetch fresh metadata
      const metadata = await this.metadataService.enrichByISBN(isbn);

      if (!metadata) {
        console.log(`[Enrichment] No metadata found for ISBN ${isbn}`);
        return false;
      }

      // Update book metadata
      await db
        .update(books)
        .set({
          description: metadata.description || book.description,
          pageCount: metadata.pageCount || book.pageCount,
          publisher: metadata.publisher || book.publisher,
          publishedDate: metadata.publishedDate || book.publishedDate,
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

      console.log(`[Enrichment] Successfully enriched book ${bookId} (${book.title})`);
      return true;
    } catch (error) {
      console.error(`[Enrichment] Error enriching book ${bookId}:`, error);
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
