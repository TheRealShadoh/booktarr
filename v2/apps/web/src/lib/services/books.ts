import { db } from '../db';
import { books, editions, authors, bookAuthors, userBooks, readingProgress } from '@booktarr/database';
import { eq, and, or, like, desc, sql } from 'drizzle-orm';
import { MetadataService } from './metadata';
import { BookMetadata } from './google-books';

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
  status?: 'owned' | 'wanted' | 'missing';
}

export class BookService {
  private metadataService: MetadataService;

  constructor() {
    this.metadataService = new MetadataService();
  }

  async createBook(input: CreateBookInput) {
    let metadata: BookMetadata | null = null;

    // 1. Get or fetch metadata
    if (input.isbn) {
      metadata = await this.metadataService.enrichByISBN(input.isbn);
    }

    if (!metadata && input.title) {
      const results = await this.metadataService.searchByTitle(
        input.title,
        input.author
      );
      metadata = results[0] || null;
    }

    if (!metadata && input.manualEntry) {
      // Create metadata from manual entry (fallback when API enrichment fails)
      metadata = {
        ...input.manualEntry,
        isbn10: input.edition?.isbn10,
        isbn13: input.edition?.isbn13,
      };
    }

    if (!metadata) {
      throw new Error('Could not find book metadata');
    }

    // 2. Check if book already exists (by ISBN or title+author)
    let existingBook = null;

    if (metadata.isbn13 || metadata.isbn10) {
      const existingEdition = await db.query.editions.findFirst({
        where: or(
          metadata.isbn13 ? eq(editions.isbn13, metadata.isbn13) : undefined,
          metadata.isbn10 ? eq(editions.isbn10, metadata.isbn10) : undefined
        ),
        with: { book: true },
      });

      if (existingEdition) {
        existingBook = existingEdition.book;
      }
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
          let author = await db.query.authors.findFirst({
            where: eq(authors.name, authorName),
          });

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
    }

    // 5. Create or get edition
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

    // 6. Add to user's collection (or update if already exists)
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

    let query = db
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

    // Add search filter if provided
    if (filters?.search) {
      query = query.where(
        or(
          like(books.title, `%${filters.search}%`),
          like(books.description, `%${filters.search}%`)
        )
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
        query = query.where(and(...yearConditions));
      }
    }

    const results = await query;

    // Get authors and reading progress for each book
    let booksWithAuthors = await Promise.all(
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

        // Get reading progress for this book
        const progress = await db.query.readingProgress.findFirst({
          where: and(
            eq(readingProgress.userId, userId),
            eq(readingProgress.bookId, result.book.id)
          ),
        });

        return {
          ...result,
          authors: bookAuthorsData.map((ba) => ba.author),
          readingProgress: progress || null,
        };
      })
    );

    // Apply post-query filters
    if (filters?.author) {
      booksWithAuthors = booksWithAuthors.filter((book) =>
        book.authors.some((a) =>
          a.name.toLowerCase().includes(filters.author!.toLowerCase())
        )
      );
    }

    if (filters?.readingStatus) {
      booksWithAuthors = booksWithAuthors.filter(
        (book) => book.readingProgress?.status === filters.readingStatus
      );
    }

    if (filters?.minRating) {
      booksWithAuthors = booksWithAuthors.filter(
        (book) => book.readingProgress?.rating && book.readingProgress.rating >= filters.minRating!
      );
    }

    // Get total count without pagination
    const countQuery = await db
      .select({ count: sql<number>`count(*)` })
      .from(userBooks)
      .innerJoin(editions, eq(userBooks.editionId, editions.id))
      .innerJoin(books, eq(editions.bookId, books.id))
      .where(and(...conditions));

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

    // Get authors
    const bookAuthorsData = await db
      .select({
        author: authors,
        role: bookAuthors.role,
      })
      .from(bookAuthors)
      .innerJoin(authors, eq(bookAuthors.authorId, authors.id))
      .where(eq(bookAuthors.bookId, book.id))
      .orderBy(bookAuthors.displayOrder);

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
    await db.transaction(async (tx) => {
      // First, delete all reading progress for this user
      await tx.delete(readingProgress).where(eq(readingProgress.userId, userId));

      // Then, delete all user's book ownerships
      await tx.delete(userBooks).where(eq(userBooks.userId, userId));
    });

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
        book: books,
        edition: editions,
      })
      .from(books)
      .innerJoin(editions, eq(books.id, editions.bookId))
      .where(
        or(
          eq(books.description, ''),
          eq(books.description, null),
          eq(editions.coverUrl, ''),
          eq(editions.coverUrl, null),
          eq(books.pageCount, null),
          eq(books.publisher, ''),
          eq(books.publisher, null)
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

    for (const { book } of booksToEnrich) {
      const success = await this.enrichBookMetadata(book.id);
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
}
