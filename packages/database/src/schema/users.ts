import { boolean, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * Users table - Multi-user support from day 1
 * Supports both local auth and OAuth providers
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  name: varchar('name', { length: 255 }),
  image: text('image'),
  passwordHash: text('password_hash'), // Only for local auth, null for OAuth
  role: varchar('role', { length: 50 }).notNull().default('user'), // user, admin, readonly
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

/**
 * OAuth accounts table - For social login support
 */
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(), // google, github, etc.
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { mode: 'date' }),
  tokenType: varchar('token_type', { length: 50 }),
  scope: text('scope'),
  idToken: text('id_token'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
});

/**
 * Sessions table - For JWT session management
 */
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
});

/**
 * Verification tokens - For email verification
 */
export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

/**
 * Library shares table - Tracks shared library access between users
 * Supports view/edit permissions with an acceptance flow
 */
export const libraryShares = pgTable('library_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sharedWithId: uuid('shared_with_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permission: varchar('permission', { length: 10 }).notNull().default('view'),
  status: varchar('status', { length: 10 }).notNull().default('pending'),
  forcedByAdmin: boolean('forced_by_admin').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at', { mode: 'date' }),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  uniqueShare: unique().on(table.ownerId, table.sharedWithId),
}));
