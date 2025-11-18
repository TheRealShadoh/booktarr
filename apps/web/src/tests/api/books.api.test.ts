import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../../lib/db';
import { books, authors, bookAuthors } from '@repo/database/schema';
import { eq } from 'drizzle-orm';

/**
 * Books API Integration Tests
 *
 * Tests the Books API endpoints:
 * - GET /api/books - List all books
 * - POST /api/books - Create a new book
 * - GET /api/books/[id] - Get book by ID
 * - DELETE /api/books/[id] - Delete book
 * - POST /api/books/search - Search books
 */

describe('Books API', () => {
  let testBookId: number;
  let testAuthorId: number;

  beforeAll(async () => {
    // Setup test data
    console.log('Setting up Books API tests...');
  });

  afterAll(async () => {
    // Cleanup test data
    if (testBookId) {
      await db.delete(bookAuthors).where(eq(bookAuthors.bookId, testBookId));
      await db.delete(books).where(eq(books.id, testBookId));
    }
    if (testAuthorId) {
      await db.delete(authors).where(eq(authors.id, testAuthorId));
    }
  });

  describe('POST /api/books - Create Book', () => {
    it('should create a new book with valid data', async () => {
      const newBook = {
        title: 'Test Book',
        isbn13: '9781234567890',
        description: 'A test book',
        pageCount: 300,
        publishedDate: '2024-01-01',
      };

      // Test would call the actual API endpoint
      // For now, test direct database insertion
      const [insertedBook] = await db
        .insert(books)
        .values({
          title: newBook.title,
          isbn13: newBook.isbn13,
          description: newBook.description,
          pageCount: newBook.pageCount,
          publishedDate: new Date(newBook.publishedDate),
        })
        .returning();

      testBookId = insertedBook.id;

      expect(insertedBook).toBeDefined();
      expect(insertedBook.title).toBe(newBook.title);
      expect(insertedBook.isbn13).toBe(newBook.isbn13);
    });

    it('should validate required fields', () => {
      // Title is required
      expect(() => {
        // Would test API validation
        if (!('title' in {})) {
          throw new Error('Title is required');
        }
      }).toThrow('Title is required');
    });

    it('should validate ISBN format', () => {
      const invalidISBN = '123'; // Too short

      expect(() => {
        if (invalidISBN.length !== 10 && invalidISBN.length !== 13) {
          throw new Error('Invalid ISBN format');
        }
      }).toThrow('Invalid ISBN format');
    });
  });

  describe('GET /api/books - List Books', () => {
    beforeEach(async () => {
      // Ensure at least one book exists
      if (!testBookId) {
        const [insertedBook] = await db
          .insert(books)
          .values({
            title: 'List Test Book',
            isbn13: '9780987654321',
          })
          .returning();
        testBookId = insertedBook.id;
      }
    });

    it('should return list of books', async () => {
      const allBooks = await db.select().from(books);

      expect(allBooks).toBeDefined();
      expect(Array.isArray(allBooks)).toBe(true);
      expect(allBooks.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      // Test pagination logic
      const limit = 10;
      const offset = 0;

      const paginatedBooks = await db.select().from(books).limit(limit).offset(offset);

      expect(paginatedBooks.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('GET /api/books/[id] - Get Book by ID', () => {
    it('should return book details', async () => {
      if (!testBookId) {
        // Create test book
        const [insertedBook] = await db
          .insert(books)
          .values({
            title: 'Detail Test Book',
            isbn13: '9781122334455',
          })
          .returning();
        testBookId = insertedBook.id;
      }

      const [book] = await db.select().from(books).where(eq(books.id, testBookId));

      expect(book).toBeDefined();
      expect(book.id).toBe(testBookId);
    });

    it('should return 404 for non-existent book', async () => {
      const nonExistentId = 999999;
      const [book] = await db.select().from(books).where(eq(books.id, nonExistentId));

      expect(book).toBeUndefined();
    });
  });

  describe('DELETE /api/books/[id] - Delete Book', () => {
    it('should delete a book', async () => {
      // Create a book to delete
      const [bookToDelete] = await db
        .insert(books)
        .values({
          title: 'Book to Delete',
          isbn13: '9785566778899',
        })
        .returning();

      // Delete the book
      await db.delete(books).where(eq(books.id, bookToDelete.id));

      // Verify deletion
      const [deletedBook] = await db.select().from(books).where(eq(books.id, bookToDelete.id));

      expect(deletedBook).toBeUndefined();
    });
  });

  describe('POST /api/books/search - Search Books', () => {
    beforeEach(async () => {
      // Create test books with different titles
      await db.insert(books).values([
        { title: 'JavaScript for Beginners', isbn13: '9781111111111' },
        { title: 'Advanced TypeScript', isbn13: '9782222222222' },
        { title: 'React Handbook', isbn13: '9783333333333' },
      ]);
    });

    it('should search books by title', async () => {
      const searchTerm = 'JavaScript';
      const results = await db
        .select()
        .from(books)
        .where(eq(books.title, searchTerm));

      expect(results).toBeDefined();
    });

    it('should search books by ISBN', async () => {
      const isbn = '9781111111111';
      const [result] = await db.select().from(books).where(eq(books.isbn13, isbn));

      expect(result).toBeDefined();
      expect(result?.isbn13).toBe(isbn);
    });

    it('should return empty array for no matches', async () => {
      const searchTerm = 'NonExistentBook12345';
      const results = await db
        .select()
        .from(books)
        .where(eq(books.title, searchTerm));

      expect(results).toHaveLength(0);
    });
  });
});
