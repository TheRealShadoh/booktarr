import { pgTable, text, timestamp, uuid, varchar, integer, decimal, date, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { books } from './books';

/**
 * Reading Progress - Track user's reading status for each book
 */
export const readingProgress = pgTable('reading_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  bookId: uuid('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),

  // Reading status
  status: varchar('status', { length: 50 }).notNull().default('want_to_read'),
  // want_to_read, currently_reading, finished, dnf (did not finish), on_hold

  // Progress tracking
  currentPage: integer('current_page').default(0),
  totalPages: integer('total_pages'),
  progressPercentage: integer('progress_percentage').default(0), // 0-100

  // Dates
  startedAt: timestamp('started_at', { mode: 'date' }),
  finishedAt: timestamp('finished_at', { mode: 'date' }),
  lastReadAt: timestamp('last_read_at', { mode: 'date' }),

  // Rating and review
  rating: integer('rating'), // 1-5 stars
  review: text('review'),
  reviewPublic: varchar('review_public', { length: 50 }).default('private'), // private, friends, public

  // Reading sessions (for analytics)
  readingSessions: integer('reading_sessions').default(0),
  totalReadingTime: integer('total_reading_time').default(0), // Total time in minutes

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  userBookIdx: index('reading_progress_user_book_idx').on(table.userId, table.bookId),
  statusIdx: index('reading_progress_status_idx').on(table.status),
  finishedIdx: index('reading_progress_finished_idx').on(table.userId, table.finishedAt),
}));

/**
 * Reading Goals - User's reading goals (e.g., 50 books per year)
 */
export const readingGoals = pgTable('reading_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Goal details
  year: integer('year').notNull(),
  targetBooks: integer('target_books').notNull(),
  targetPages: integer('target_pages'),

  // Progress (denormalized for performance)
  booksRead: integer('books_read').default(0),
  pagesRead: integer('pages_read').default(0),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  userYearIdx: index('reading_goals_user_year_idx').on(table.userId, table.year),
}));

/**
 * Wishlist - Books users want to acquire
 */
export const wishlists = pgTable('wishlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  bookId: uuid('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),

  // Wishlist details
  priority: integer('priority').default(3), // 1-5 (5 = highest)
  priceLimit: decimal('price_limit', { precision: 10, scale: 2 }),
  targetDate: date('target_date', { mode: 'string' }), // Date user wants to acquire by

  // Notifications
  notifyOnPriceDrop: varchar('notify_on_price_drop', { length: 50 }).default('never'), // never, always, threshold
  priceDropThreshold: decimal('price_drop_threshold', { precision: 10, scale: 2 }),
  notifyOnRelease: varchar('notify_on_release', { length: 50 }).default('never'), // For pre-release books

  notes: text('notes'),

  addedAt: timestamp('added_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('wishlists_user_idx').on(table.userId),
  bookIdx: index('wishlists_book_idx').on(table.bookId),
  priorityIdx: index('wishlists_priority_idx').on(table.userId, table.priority),
}));

/**
 * Price Tracking - Historical price data for books
 * Helps identify price drops for wishlist items
 */
export const priceTracking = pgTable('price_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookId: uuid('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),

  // Price details
  source: varchar('source', { length: 100 }).notNull(), // amazon, bookdepository, barnes_noble, etc.
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  url: text('url'), // Purchase link

  // Metadata
  inStock: varchar('in_stock', { length: 50 }).default('unknown'), // in_stock, out_of_stock, pre_order, unknown
  condition: varchar('condition', { length: 50 }).default('new'), // new, used

  checkedAt: timestamp('checked_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  bookDateIdx: index('price_tracking_book_date_idx').on(table.bookId, table.checkedAt),
}));

/**
 * Pre-orders - Track pre-ordered books
 */
export const preOrders = pgTable('pre_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  bookId: uuid('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),

  // Pre-order details
  source: varchar('source', { length: 100 }).notNull(), // Where pre-ordered
  orderNumber: varchar('order_number', { length: 255 }),
  price: decimal('price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('USD'),

  // Dates
  orderedAt: date('ordered_at', { mode: 'string' }).notNull(),
  expectedReleaseDate: date('expected_release_date', { mode: 'string' }),
  receivedAt: date('received_at', { mode: 'string' }),

  // Status
  status: varchar('status', { length: 50 }).default('pending'), // pending, shipped, delivered, cancelled

  notes: text('notes'),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('pre_orders_user_idx').on(table.userId),
  statusIdx: index('pre_orders_status_idx').on(table.status),
  releaseIdx: index('pre_orders_release_idx').on(table.expectedReleaseDate),
}));

/**
 * Drizzle ORM Relations
 * Required for db.query API to work properly
 */

// Reading Progress relations
export const readingProgressRelations = relations(readingProgress, ({ one }) => ({
  user: one(users, {
    fields: [readingProgress.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [readingProgress.bookId],
    references: [books.id],
  }),
}));

// Reading Goals relations
export const readingGoalsRelations = relations(readingGoals, ({ one }) => ({
  user: one(users, {
    fields: [readingGoals.userId],
    references: [users.id],
  }),
}));

// Wishlists relations
export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, {
    fields: [wishlists.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [wishlists.bookId],
    references: [books.id],
  }),
}));

// Price Tracking relations
export const priceTrackingRelations = relations(priceTracking, ({ one }) => ({
  book: one(books, {
    fields: [priceTracking.bookId],
    references: [books.id],
  }),
}));

// Pre-orders relations
export const preOrdersRelations = relations(preOrders, ({ one }) => ({
  user: one(users, {
    fields: [preOrders.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [preOrders.bookId],
    references: [books.id],
  }),
}));
