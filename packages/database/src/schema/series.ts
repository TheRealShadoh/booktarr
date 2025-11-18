import { pgTable, text, timestamp, uuid, varchar, integer, boolean, index } from 'drizzle-orm/pg-core';
import { books } from './books';

/**
 * Series table - Book series metadata
 * Tracks series information with proper volume counting
 */
export const series = pgTable('series', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 500 }).notNull(),
  description: text('description'),
  coverUrl: text('cover_url'), // Series cover image URL

  // Series metadata
  totalVolumes: integer('total_volumes'), // Total expected volumes (null if ongoing)
  status: varchar('status', { length: 50 }).default('ongoing'), // ongoing, completed, hiatus, cancelled

  // Series type
  type: varchar('type', { length: 50 }), // novel, manga, light_novel, comic, etc.

  // External IDs
  anilistId: integer('anilist_id'),
  myAnimeListId: integer('myanimelist_id'),
  googleBooksId: varchar('google_books_id', { length: 100 }),

  // Metadata tracking
  metadataSource: varchar('metadata_source', { length: 50 }), // anilist, google_books, manual
  metadataLastUpdated: timestamp('metadata_last_updated', { mode: 'date' }),

  // Manual override flag - if true, don't auto-update from external sources
  manualOverride: boolean('manual_override').default(false),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('series_name_idx').on(table.name),
  anilistIdx: index('series_anilist_idx').on(table.anilistId),
}));

/**
 * Series Books - Junction table linking books to series
 * Includes volume/position information
 *
 * KEY IMPROVEMENT: Separate volume_number from the book entity
 * This fixes the issue where one book could be in multiple series
 */
export const seriesBooks = pgTable('series_books', {
  id: uuid('id').primaryKey().defaultRandom(),
  seriesId: uuid('series_id')
    .notNull()
    .references(() => series.id, { onDelete: 'cascade' }),
  bookId: uuid('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),

  // Volume information
  volumeNumber: integer('volume_number').notNull(), // 1, 2, 3, etc.
  volumeName: varchar('volume_name', { length: 500 }), // Optional volume-specific title

  // Part/arc information (for series divided into arcs)
  partNumber: integer('part_number'), // For multi-part volumes
  arcName: varchar('arc_name', { length: 255 }), // Story arc name

  // Ordering
  displayOrder: integer('display_order').notNull(), // For custom ordering beyond volume numbers

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  seriesIdx: index('series_books_series_idx').on(table.seriesId),
  bookIdx: index('series_books_book_idx').on(table.bookId),
  volumeIdx: index('series_books_volume_idx').on(table.seriesId, table.volumeNumber),
}));

/**
 * Series Volumes - Metadata for expected volumes in a series
 * This helps track "missing" volumes even if the book doesn't exist in our database yet
 *
 * KEY IMPROVEMENT: Track expected volumes separately from actual books
 * This fixes the completion ratio issues (e.g., "9/1 - Citrus")
 */
export const seriesVolumes = pgTable('series_volumes', {
  id: uuid('id').primaryKey().defaultRandom(),
  seriesId: uuid('series_id')
    .notNull()
    .references(() => series.id, { onDelete: 'cascade' }),

  // Volume metadata (from external APIs like AniList)
  volumeNumber: integer('volume_number').notNull(),
  title: varchar('title', { length: 500 }),
  description: text('description'),
  coverUrl: text('cover_url'),

  // Publishing info
  releaseDate: timestamp('release_date', { mode: 'date' }),
  isbn13: varchar('isbn_13', { length: 13 }), // If known

  // Link to actual book (if exists in our database)
  bookId: uuid('book_id').references(() => books.id, { onDelete: 'set null' }),

  // Status
  announced: boolean('announced').default(false), // Future volumes
  released: boolean('released').default(true), // Already published

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  seriesVolumeIdx: index('series_volumes_series_volume_idx').on(table.seriesId, table.volumeNumber),
  bookIdx: index('series_volumes_book_idx').on(table.bookId),
}));
