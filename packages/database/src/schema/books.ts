import { pgTable, text, timestamp, uuid, varchar, integer, decimal, date, boolean, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

/**
 * Books table - Core book entity (format-agnostic)
 * One book can have multiple editions (hardcover, paperback, ebook, etc.)
 */
export const books = pgTable('books', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 500 }).notNull(),
  subtitle: varchar('subtitle', { length: 500 }),
  description: text('description'),
  language: varchar('language', { length: 10 }).default('en'),
  publisher: varchar('publisher', { length: 255 }),
  publishedDate: date('published_date', { mode: 'string' }),
  pageCount: integer('page_count'),
  categories: text('categories').array(), // Array of genre/category tags

  // External IDs for metadata refresh
  googleBooksId: varchar('google_books_id', { length: 100 }),
  openLibraryId: varchar('open_library_id', { length: 100 }),
  goodreadsId: varchar('goodreads_id', { length: 100 }),

  // Metadata tracking
  metadataSource: varchar('metadata_source', { length: 50 }), // google, openlibrary, manual
  metadataLastUpdated: timestamp('metadata_last_updated', { mode: 'date' }),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  titleIdx: index('books_title_idx').on(table.title),
  googleBooksIdx: index('books_google_id_idx').on(table.googleBooksId),
  openLibraryIdx: index('books_openlibrary_id_idx').on(table.openLibraryId),
}));

/**
 * Authors table - Normalized author entities
 */
export const authors = pgTable('authors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  bio: text('bio'),
  imageUrl: text('image_url'),
  website: varchar('website', { length: 500 }),

  // External IDs
  goodreadsId: varchar('goodreads_id', { length: 100 }),
  googleBooksId: varchar('google_books_id', { length: 100 }),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('authors_name_idx').on(table.name),
}));

/**
 * Book-Authors junction table - Many-to-many relationship
 * Supports multiple authors per book and role specification
 */
export const bookAuthors = pgTable('book_authors', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookId: uuid('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => authors.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).default('author'), // author, illustrator, translator, etc.
  displayOrder: integer('display_order').default(0), // For ordering co-authors
}, (table) => ({
  bookIdx: index('book_authors_book_idx').on(table.bookId),
  authorIdx: index('book_authors_author_idx').on(table.authorId),
}));

/**
 * Editions table - Specific physical/digital formats of a book
 * One book can have multiple editions (hardcover, paperback, Kindle, audiobook, etc.)
 */
export const editions = pgTable('editions', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookId: uuid('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),

  // ISBN identifiers
  isbn10: varchar('isbn_10', { length: 10 }),
  isbn13: varchar('isbn_13', { length: 13 }),
  asin: varchar('asin', { length: 10 }), // Amazon Standard Identification Number

  // Edition details
  format: varchar('format', { length: 50 }), // hardcover, paperback, ebook, audiobook, manga, etc.
  pages: integer('pages'),
  edition: varchar('edition', { length: 100 }), // "1st Edition", "Revised", etc.

  // Publishing details
  publisher: varchar('publisher', { length: 255 }),
  publishedDate: date('published_date', { mode: 'string' }),

  // Pricing (for tracking wishlist items)
  price: decimal('price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('USD'),

  // Cover image
  coverUrl: text('cover_url'),
  coverThumbnailUrl: text('cover_thumbnail_url'),

  // Availability
  inPrint: boolean('in_print').default(true),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  bookIdx: index('editions_book_idx').on(table.bookId),
  isbn10Idx: index('editions_isbn10_idx').on(table.isbn10),
  isbn13Idx: index('editions_isbn13_idx').on(table.isbn13),
  asinIdx: index('editions_asin_idx').on(table.asin),
}));

/**
 * User Books - Ownership/collection status for each user
 * Links users to specific editions they own, want, or are missing
 */
export const userBooks = pgTable('user_books', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  editionId: uuid('edition_id')
    .notNull()
    .references(() => editions.id, { onDelete: 'cascade' }),

  // Ownership status
  status: varchar('status', { length: 50 }).notNull().default('owned'), // owned, wanted, missing, loaned

  // Collection details
  acquisitionDate: date('acquisition_date', { mode: 'string' }),
  acquisitionPrice: decimal('acquisition_price', { precision: 10, scale: 2 }),
  location: varchar('location', { length: 255 }), // shelf location, room, etc.
  condition: varchar('condition', { length: 50 }), // new, like_new, good, fair, poor

  // Additional info
  signed: boolean('signed').default(false),
  firstEdition: boolean('first_edition').default(false),
  notes: text('notes'),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('user_books_user_idx').on(table.userId),
  editionIdx: index('user_books_edition_idx').on(table.editionId),
  statusIdx: index('user_books_status_idx').on(table.status),
}));

/**
 * Metadata Cache - Cache external API responses to reduce API calls
 * Stores raw metadata from Google Books, OpenLibrary, etc.
 */
export const metadataCache = pgTable('metadata_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: varchar('source', { length: 50 }).notNull(), // google_books, open_library, anilist, etc.
  identifier: varchar('identifier', { length: 255 }).notNull(), // ISBN, external ID, etc.
  identifierType: varchar('identifier_type', { length: 50 }).notNull(), // isbn13, isbn10, google_id, etc.

  // Cached data
  data: jsonb('data').notNull(), // Raw JSON response from API

  // Cache management
  ttl: integer('ttl').default(2592000), // Time to live in seconds (default: 30 days)
  lastFetched: timestamp('last_fetched', { mode: 'date' }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  sourceIdentifierUnique: unique('metadata_cache_source_identifier_unique').on(table.source, table.identifier),
  sourceIdentifierIdx: index('metadata_cache_source_identifier_idx').on(table.source, table.identifier),
  expiresIdx: index('metadata_cache_expires_idx').on(table.expiresAt),
}));

/**
 * Drizzle ORM Relations
 * Required for db.query API to work properly
 */

// Books relations
export const booksRelations = relations(books, ({ many }) => ({
  editions: many(editions),
  bookAuthors: many(bookAuthors),
}));

// Authors relations
export const authorsRelations = relations(authors, ({ many }) => ({
  bookAuthors: many(bookAuthors),
}));

// Book-Authors junction relations
export const bookAuthorsRelations = relations(bookAuthors, ({ one }) => ({
  book: one(books, {
    fields: [bookAuthors.bookId],
    references: [books.id],
  }),
  author: one(authors, {
    fields: [bookAuthors.authorId],
    references: [authors.id],
  }),
}));

// Editions relations
export const editionsRelations = relations(editions, ({ one, many }) => ({
  book: one(books, {
    fields: [editions.bookId],
    references: [books.id],
  }),
  userBooks: many(userBooks),
}));

// User Books relations
export const userBooksRelations = relations(userBooks, ({ one }) => ({
  user: one(users, {
    fields: [userBooks.userId],
    references: [users.id],
  }),
  edition: one(editions, {
    fields: [userBooks.editionId],
    references: [editions.id],
  }),
}));
