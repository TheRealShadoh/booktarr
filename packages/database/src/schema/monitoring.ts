import { pgTable, text, timestamp, uuid, integer, boolean, jsonb, bigint, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { series } from './series';

/**
 * Activity Log - Event journal for monitoring system actions
 * Records all significant system and user events for the activity feed
 */
export const activityLog = pgTable('activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' }), // nullable for system events

  // Event classification
  eventType: text('event_type').notNull(),
  // new_volume_discovered, series_status_changed, price_drop, volume_released,
  // series_monitored, download_started, download_completed, indexer_result

  // Entity reference (denormalized for display without joins)
  entityType: text('entity_type'), // 'series', 'book', 'author', 'edition'
  entityId: uuid('entity_id'),
  entityName: text('entity_name'), // denormalized for fast display

  // Arbitrary structured event data
  details: jsonb('details'),

  // Notification state
  read: boolean('read').default(false),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  userCreatedIdx: index('activity_log_user_created_idx').on(table.userId, table.createdAt),
  eventTypeIdx: index('activity_log_event_type_idx').on(table.eventType),
  entityIdx: index('activity_log_entity_idx').on(table.entityType, table.entityId),
  readIdx: index('activity_log_read_idx').on(table.userId, table.read),
}));

/**
 * Download Clients - Configured download client integrations
 * Supports Deluge, SABnzbd, Transmission, qBittorrent, NZBGet
 */
export const downloadClients = pgTable('download_clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  type: text('type').notNull(), // 'deluge', 'sabnzbd', 'transmission', 'qbittorrent', 'nzbget'

  // Connection details
  host: text('host').notNull(), // e.g. 'http://localhost:8112'
  username: text('username'),
  password: text('password'),   // for Deluge
  apiKey: text('api_key'),      // for SABnzbd

  // Download settings
  category: text('category').default('books'), // download category/label

  // Selection priority — higher integer means preferred
  priority: integer('priority').default(0),
  enabled: boolean('enabled').default(true),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('download_clients_user_idx').on(table.userId),
  enabledIdx: index('download_clients_enabled_idx').on(table.userId, table.enabled),
}));

/**
 * Indexers - Torrent and Usenet indexer configurations
 * Supports Torznab, Newznab, and plain RSS feeds
 */
export const indexers = pgTable('indexers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  type: text('type').notNull(), // 'torznab', 'newznab', 'rss'

  // Connection details
  url: text('url').notNull(),   // API base URL
  apiKey: text('api_key'),

  // Category codes (Newznab/Torznab standard — e.g. ['7020'] for ebooks)
  categories: text('categories').array(),

  // Capability flags
  supportsSearch: boolean('supports_search').default(true),

  // Selection priority — higher integer means preferred
  priority: integer('priority').default(0),
  enabled: boolean('enabled').default(true),

  lastChecked: timestamp('last_checked', { mode: 'date' }),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('indexers_user_idx').on(table.userId),
  enabledIdx: index('indexers_enabled_idx').on(table.userId, table.enabled),
}));

/**
 * Download Queue - Active, pending, and historical download records
 * Tracks the full lifecycle from search through import
 */
export const downloadQueue = pgTable('download_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // What is being downloaded
  seriesId: uuid('series_id')
    .references(() => series.id, { onDelete: 'set null' }), // nullable
  bookTitle: text('book_title').notNull(),
  volumeNumber: integer('volume_number'), // nullable for standalone books

  // Where the release came from
  indexerName: text('indexer_name'),
  downloadClientId: uuid('download_client_id')
    .references(() => downloadClients.id, { onDelete: 'set null' }), // nullable

  // Reference on the download client side
  externalId: text('external_id'), // torrent hash or NZB ID

  // Lifecycle state
  status: text('status').notNull().default('searching'),
  // searching, snatched, downloading, completed, failed, imported

  // Transfer metadata
  size: bigint('size', { mode: 'number' }), // bytes, nullable
  downloadUrl: text('download_url'),         // magnet link or NZB URL
  releaseTitle: text('release_title'),       // exact release name from indexer

  // Arbitrary structured data (error messages, quality info, etc.)
  details: jsonb('details'),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('download_queue_user_idx').on(table.userId),
  statusIdx: index('download_queue_status_idx').on(table.userId, table.status),
  seriesIdx: index('download_queue_series_idx').on(table.seriesId),
  externalIdIdx: index('download_queue_external_id_idx').on(table.externalId),
}));

/**
 * Monitoring Config - Per-user monitoring and automation preferences
 * One row per user; unique constraint enforces the 1:1 relationship
 */
export const monitoringConfig = pgTable('monitoring_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Series monitoring defaults
  autoMonitorNewSeries: boolean('auto_monitor_new_series').default(true),
  searchOnAdd: boolean('search_on_add').default(true), // auto-search when series becomes monitored

  // Preferred acquisition format
  defaultFormat: text('default_format').default('any'),
  // 'physical', 'ebook', 'audiobook', 'any'

  // Notification preferences
  notifyOnNewVolume: boolean('notify_on_new_volume').default(true),
  notifyOnDownloadComplete: boolean('notify_on_download_complete').default(true),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  userUnique: unique('monitoring_config_user_unique').on(table.userId),
}));

/**
 * Drizzle ORM Relations
 * Required for db.query API to work properly
 */

// Activity Log relations
export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

// Download Clients relations
export const downloadClientsRelations = relations(downloadClients, ({ one, many }) => ({
  user: one(users, {
    fields: [downloadClients.userId],
    references: [users.id],
  }),
  downloadQueue: many(downloadQueue),
}));

// Indexers relations
export const indexersRelations = relations(indexers, ({ one }) => ({
  user: one(users, {
    fields: [indexers.userId],
    references: [users.id],
  }),
}));

// Download Queue relations
export const downloadQueueRelations = relations(downloadQueue, ({ one }) => ({
  user: one(users, {
    fields: [downloadQueue.userId],
    references: [users.id],
  }),
  series: one(series, {
    fields: [downloadQueue.seriesId],
    references: [series.id],
  }),
  downloadClient: one(downloadClients, {
    fields: [downloadQueue.downloadClientId],
    references: [downloadClients.id],
  }),
}));

// Monitoring Config relations
export const monitoringConfigRelations = relations(monitoringConfig, ({ one }) => ({
  user: one(users, {
    fields: [monitoringConfig.userId],
    references: [users.id],
  }),
}));
