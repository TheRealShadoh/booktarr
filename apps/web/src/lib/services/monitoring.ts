import { db } from '../db';
import {
  series,
  seriesBooks,
  seriesVolumes,
  editions,
  userBooks,
  activityLog,
  downloadClients,
  indexers,
  monitoringConfig,
} from '@booktarr/database';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/**
 * A volume that is monitored but not yet owned by the user.
 * Status mirrors the download lifecycle from the monitoring schema.
 */
export interface WantedVolume {
  seriesId: string;
  seriesName: string;
  volumeNumber: number;
  coverUrl: string | null;
  releaseDate: Date | null;
  /** Current acquisition state */
  status: 'missing' | 'searching' | 'downloading';
  monitored: boolean;
}

/**
 * A single entry in the activity feed.
 */
export interface ActivityEntry {
  id: string;
  userId: string | null;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  details: Record<string, unknown> | null;
  read: boolean;
  createdAt: Date;
}

/**
 * Per-user monitoring preferences that mirror the monitoringConfig schema.
 */
export interface MonitoringConfig {
  id: string;
  userId: string;
  autoMonitorNewSeries: boolean;
  searchOnAdd: boolean;
  defaultFormat: string;
  notifyOnNewVolume: boolean;
  notifyOnDownloadComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Activity feed filter options
// ---------------------------------------------------------------------------

export interface ActivityFeedFilters {
  eventType?: string;
  unreadOnly?: boolean;
}

// ---------------------------------------------------------------------------
// MonitoringService
// ---------------------------------------------------------------------------

export class MonitoringService {
  /**
   * Toggle monitoring for a series and record the change in the activity log.
   */
  async toggleSeriesMonitoring(seriesId: string, monitored: boolean): Promise<void> {
    // Fetch the series so we can capture its name for the activity entry.
    const [seriesRow] = await db
      .select({ id: series.id, name: series.name })
      .from(series)
      .where(eq(series.id, seriesId))
      .limit(1);

    if (!seriesRow) {
      throw new Error(`Series not found: ${seriesId}`);
    }

    // Flip the monitored flag.
    await db
      .update(series)
      .set({ monitored, updatedAt: new Date() })
      .where(eq(series.id, seriesId));

    // Write an activity log entry so the feed reflects the change.
    await this.logActivity({
      eventType: 'series_monitored',
      entityType: 'series',
      entityId: seriesId,
      entityName: seriesRow.name,
      details: { monitored },
    });
  }

  /**
   * Return all volumes that are monitored but not yet owned by the given user.
   *
   * Strategy mirrors the gap-detection logic in SeriesService.getSeriesById:
   *   1. Collect all monitored series.
   *   2. For each series, build the complete expected volume list (from
   *      seriesVolumes + seriesBooks, same as SeriesService does).
   *   3. Check ownership via editions → userBooks.
   *   4. Return volumes that are missing / not owned.
   */
  async getWantedVolumes(userId: string): Promise<WantedVolume[]> {
    // Fetch only monitored series.
    const monitoredSeries = await db
      .select()
      .from(series)
      .where(eq(series.monitored, true))
      .orderBy(series.name);

    const wanted: WantedVolume[] = [];

    for (const s of monitoredSeries) {
      // --- Replicate SeriesService gap-detection logic ---

      // Pull known volume metadata (from enrichment pipeline).
      const volumeEntries = await db
        .select()
        .from(seriesVolumes)
        .where(eq(seriesVolumes.seriesId, s.id))
        .orderBy(seriesVolumes.volumeNumber);

      // Pull books physically linked to this series.
      const seriesBookEntries = await db
        .select({
          bookId: seriesBooks.bookId,
          volumeNumber: seriesBooks.volumeNumber,
        })
        .from(seriesBooks)
        .where(eq(seriesBooks.seriesId, s.id));

      // Build a unified volume map keyed by volume number.
      type VolumeMapEntry = {
        volumeEntry?: (typeof volumeEntries)[0];
        seriesBookEntry?: (typeof seriesBookEntries)[0];
      };
      const volumeMap = new Map<number, VolumeMapEntry>();

      for (const vol of volumeEntries) {
        volumeMap.set(vol.volumeNumber, { volumeEntry: vol });
      }

      for (const sb of seriesBookEntries) {
        const existing = volumeMap.get(sb.volumeNumber);
        if (existing) {
          existing.seriesBookEntry = sb;
        } else {
          volumeMap.set(sb.volumeNumber, { seriesBookEntry: sb });
        }
      }

      // Infer total volume count the same way SeriesService does.
      const maxVolNum = [...volumeMap.keys()].reduce((m, n) => Math.max(m, n), 0);
      const inferredTotal = s.totalVolumes || maxVolNum || volumeMap.size;

      // Fill in gap entries (volumes expected but with no metadata yet).
      for (let i = 1; i <= inferredTotal; i++) {
        if (!volumeMap.has(i)) {
          volumeMap.set(i, {});
        }
      }

      // Check ownership for each volume.
      for (const [volNum, entry] of volumeMap.entries()) {
        const bookId = entry.volumeEntry?.bookId ?? entry.seriesBookEntry?.bookId;

        let owned = false;

        if (bookId) {
          // Check if the user owns any edition of this book.
          const editionList = await db
            .select({ id: editions.id })
            .from(editions)
            .where(eq(editions.bookId, bookId));

          for (const ed of editionList) {
            const [ub] = await db
              .select({ id: userBooks.id })
              .from(userBooks)
              .where(
                and(
                  eq(userBooks.editionId, ed.id),
                  eq(userBooks.userId, userId),
                  eq(userBooks.status, 'owned')
                )
              )
              .limit(1);

            if (ub) {
              owned = true;
              break;
            }
          }
        }

        if (!owned) {
          // Derive the best available cover URL for this volume.
          const coverUrl =
            entry.volumeEntry?.coverUrl ?? s.coverUrl ?? null;

          wanted.push({
            seriesId: s.id,
            seriesName: s.name,
            volumeNumber: volNum,
            coverUrl,
            releaseDate: entry.volumeEntry?.releaseDate ?? null,
            status: 'missing',
            monitored: true,
          });
        }
      }
    }

    return wanted;
  }

  /**
   * Retrieve the activity feed for a user with optional filtering and pagination.
   */
  async getActivityFeed(
    userId: string,
    filters?: ActivityFeedFilters,
    limit = 50,
    offset = 0
  ): Promise<ActivityEntry[]> {
    // Build conditions dynamically.
    const conditions = [eq(activityLog.userId, userId)];

    if (filters?.unreadOnly) {
      conditions.push(eq(activityLog.read, false));
    }

    if (filters?.eventType) {
      conditions.push(eq(activityLog.eventType, filters.eventType));
    }

    const rows = await db
      .select()
      .from(activityLog)
      .where(and(...conditions))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      eventType: row.eventType,
      entityType: row.entityType,
      entityId: row.entityId ? String(row.entityId) : null,
      entityName: row.entityName,
      details: (row.details as Record<string, unknown>) ?? null,
      read: row.read ?? false,
      createdAt: row.createdAt,
    }));
  }

  /**
   * Mark a set of activity log entries as read for the given user.
   */
  async markActivitiesRead(activityIds: string[]): Promise<void> {
    if (activityIds.length === 0) return;

    await db
      .update(activityLog)
      .set({ read: true })
      .where(inArray(activityLog.id, activityIds));
  }

  /**
   * Return the count of unread activity entries for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLog)
      .where(and(eq(activityLog.userId, userId), eq(activityLog.read, false)));

    return Number(result?.count ?? 0);
  }

  /**
   * Write a structured event to the activity log.
   *
   * `userId` is optional so that system-level events (e.g. cron jobs) can be
   * recorded without being tied to a specific user.
   */
  async logActivity(event: {
    userId?: string;
    eventType: string;
    entityType: string;
    entityId: string;
    entityName: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    await db.insert(activityLog).values({
      userId: event.userId ?? null,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      entityName: event.entityName,
      details: event.details ?? null,
      read: false,
    });
  }

  /**
   * Return (or create) the monitoring configuration row for a user.
   */
  async getMonitoringConfig(userId: string): Promise<MonitoringConfig> {
    const [existing] = await db
      .select()
      .from(monitoringConfig)
      .where(eq(monitoringConfig.userId, userId))
      .limit(1);

    if (existing) {
      return this._mapConfig(existing);
    }

    // Create a default configuration row on first access.
    const [created] = await db
      .insert(monitoringConfig)
      .values({ userId })
      .returning();

    return this._mapConfig(created);
  }

  /**
   * Update (upsert) monitoring configuration for a user.
   */
  async updateMonitoringConfig(
    userId: string,
    updates: Partial<Omit<MonitoringConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<MonitoringConfig> {
    // Ensure the row exists first.
    await this.getMonitoringConfig(userId);

    const [updated] = await db
      .update(monitoringConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(monitoringConfig.userId, userId))
      .returning();

    return this._mapConfig(updated);
  }

  // ---------------------------------------------------------------------------
  // Download-client helpers (used by API routes)
  // ---------------------------------------------------------------------------

  async listDownloadClients(userId: string) {
    return db
      .select()
      .from(downloadClients)
      .where(eq(downloadClients.userId, userId))
      .orderBy(desc(downloadClients.priority), downloadClients.name);
  }

  async createDownloadClient(
    userId: string,
    input: {
      name: string;
      type: string;
      host: string;
      username?: string;
      password?: string;
      apiKey?: string;
      category?: string;
      priority?: number;
      enabled?: boolean;
    }
  ) {
    const [created] = await db
      .insert(downloadClients)
      .values({ ...input, userId })
      .returning();

    await this.logActivity({
      userId,
      eventType: 'download_client_added',
      entityType: 'download_client',
      entityId: created.id,
      entityName: created.name,
      details: { type: created.type, host: created.host },
    });

    return created;
  }

  async updateDownloadClient(
    clientId: string,
    userId: string,
    updates: Partial<{
      name: string;
      type: string;
      host: string;
      username: string | null;
      password: string | null;
      apiKey: string | null;
      category: string | null;
      priority: number;
      enabled: boolean;
    }>
  ) {
    const [updated] = await db
      .update(downloadClients)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(downloadClients.id, clientId), eq(downloadClients.userId, userId)))
      .returning();

    return updated ?? null;
  }

  async deleteDownloadClient(clientId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(downloadClients)
      .where(and(eq(downloadClients.id, clientId), eq(downloadClients.userId, userId)))
      .returning({ id: downloadClients.id });

    return result.length > 0;
  }

  async getDownloadClientById(clientId: string, userId: string) {
    const [client] = await db
      .select()
      .from(downloadClients)
      .where(and(eq(downloadClients.id, clientId), eq(downloadClients.userId, userId)))
      .limit(1);

    return client ?? null;
  }

  // ---------------------------------------------------------------------------
  // Indexer helpers (used by API routes)
  // ---------------------------------------------------------------------------

  async listIndexers(userId: string) {
    return db
      .select()
      .from(indexers)
      .where(eq(indexers.userId, userId))
      .orderBy(desc(indexers.priority), indexers.name);
  }

  async createIndexer(
    userId: string,
    input: {
      name: string;
      type: string;
      url: string;
      apiKey?: string;
      categories?: string[];
      supportsSearch?: boolean;
      priority?: number;
      enabled?: boolean;
    }
  ) {
    const [created] = await db
      .insert(indexers)
      .values({ ...input, userId })
      .returning();

    await this.logActivity({
      userId,
      eventType: 'indexer_added',
      entityType: 'indexer',
      entityId: created.id,
      entityName: created.name,
      details: { type: created.type, url: created.url },
    });

    return created;
  }

  async updateIndexer(
    indexerId: string,
    userId: string,
    updates: Partial<{
      name: string;
      type: string;
      url: string;
      apiKey: string | null;
      categories: string[] | null;
      supportsSearch: boolean;
      priority: number;
      enabled: boolean;
    }>
  ) {
    const [updated] = await db
      .update(indexers)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(indexers.id, indexerId), eq(indexers.userId, userId)))
      .returning();

    return updated ?? null;
  }

  async deleteIndexer(indexerId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(indexers)
      .where(and(eq(indexers.id, indexerId), eq(indexers.userId, userId)))
      .returning({ id: indexers.id });

    return result.length > 0;
  }

  async getIndexerById(indexerId: string, userId: string) {
    const [indexer] = await db
      .select()
      .from(indexers)
      .where(and(eq(indexers.id, indexerId), eq(indexers.userId, userId)))
      .limit(1);

    return indexer ?? null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _mapConfig(row: typeof monitoringConfig.$inferSelect): MonitoringConfig {
    return {
      id: row.id,
      userId: row.userId,
      autoMonitorNewSeries: row.autoMonitorNewSeries ?? true,
      searchOnAdd: row.searchOnAdd ?? true,
      defaultFormat: row.defaultFormat ?? 'any',
      notifyOnNewVolume: row.notifyOnNewVolume ?? true,
      notifyOnDownloadComplete: row.notifyOnDownloadComplete ?? true,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
