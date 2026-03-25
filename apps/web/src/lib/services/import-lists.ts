import { db } from '../db';
import { importLists, series, activityLog } from '@booktarr/database';
import { eq, and, sql } from 'drizzle-orm';
import { AniListClient } from './anilist';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportList {
  id: string;
  userId: string;
  name: string;
  source: 'anilist_reading' | 'anilist_planning' | 'manual';
  sourceConfig: Record<string, unknown> | null;
  autoMonitor: boolean;
  lastSynced: Date | null;
  syncInterval: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateImportListInput {
  name: string;
  source: 'anilist_reading' | 'anilist_planning' | 'manual';
  sourceConfig?: Record<string, unknown>;
  autoMonitor?: boolean;
  syncInterval?: number;
  enabled?: boolean;
}

export interface UpdateImportListInput {
  name?: string;
  sourceConfig?: Record<string, unknown>;
  autoMonitor?: boolean;
  syncInterval?: number;
  enabled?: boolean;
}

export interface SyncResult {
  importListId: string;
  importListName: string;
  imported: number;
  skipped: number;
  errors: number;
  seriesNames: string[];
}

// AniList MediaListCollection response shape
interface AniListMediaEntry {
  media: {
    id: number;
    title: {
      english?: string;
      romaji?: string;
    };
    volumes?: number;
    status?: string;
  };
}

interface AniListMediaList {
  entries: AniListMediaEntry[];
}

interface AniListMediaListCollection {
  lists: AniListMediaList[];
}

// ---------------------------------------------------------------------------
// ImportListService
// ---------------------------------------------------------------------------

export class ImportListService {
  private anilistClient = new AniListClient();

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  async listImportLists(userId: string): Promise<ImportList[]> {
    const rows = await db
      .select()
      .from(importLists)
      .where(eq(importLists.userId, userId))
      .orderBy(importLists.createdAt);

    return rows.map(this._mapRow);
  }

  async createImportList(userId: string, input: CreateImportListInput): Promise<ImportList> {
    const [created] = await db
      .insert(importLists)
      .values({
        userId,
        name: input.name,
        source: input.source,
        sourceConfig: input.sourceConfig ?? null,
        autoMonitor: input.autoMonitor ?? true,
        syncInterval: input.syncInterval ?? 24,
        enabled: input.enabled ?? true,
      })
      .returning();

    await this._logActivity({
      userId,
      eventType: 'import_list_created',
      entityId: created.id,
      entityName: created.name,
      details: { source: created.source },
    });

    return this._mapRow(created);
  }

  async updateImportList(
    id: string,
    userId: string,
    input: UpdateImportListInput
  ): Promise<ImportList | null> {
    const [updated] = await db
      .update(importLists)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(importLists.id, id), eq(importLists.userId, userId)))
      .returning();

    return updated ? this._mapRow(updated) : null;
  }

  async deleteImportList(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(importLists)
      .where(and(eq(importLists.id, id), eq(importLists.userId, userId)))
      .returning({ id: importLists.id });

    return result.length > 0;
  }

  // -------------------------------------------------------------------------
  // Sync logic
  // -------------------------------------------------------------------------

  /**
   * Sync a single import list: fetch series from the external source and
   * create/monitor them in BookTarr.
   *
   * Errors are caught per-series so one bad entry never aborts the whole sync.
   */
  async syncImportList(importListId: string, userId: string): Promise<SyncResult> {
    const [row] = await db
      .select()
      .from(importLists)
      .where(and(eq(importLists.id, importListId), eq(importLists.userId, userId)))
      .limit(1);

    if (!row) {
      throw new Error(`Import list not found: ${importListId}`);
    }

    const list = this._mapRow(row);
    const result: SyncResult = {
      importListId: list.id,
      importListName: list.name,
      imported: 0,
      skipped: 0,
      errors: 0,
      seriesNames: [],
    };

    if (list.source === 'manual') {
      // Manual lists have no external source to sync from.
      await this._stampLastSynced(list.id);
      return result;
    }

    // -----------------------------------------------------------------------
    // Fetch from AniList
    // -----------------------------------------------------------------------
    const anilistUsername =
      (list.sourceConfig?.anilistUsername as string | undefined) ?? '';

    if (!anilistUsername) {
      throw new Error(`Import list "${list.name}" has no AniList username configured`);
    }

    const anilistStatus =
      list.source === 'anilist_reading' ? 'CURRENT' : 'PLANNING';

    let entries: AniListMediaEntry[] = [];
    try {
      entries = await this._fetchAniListMediaList(anilistUsername, anilistStatus);
    } catch (err) {
      logger.error(
        '[ImportList] Failed to fetch AniList media list',
        err instanceof Error ? err : new Error(String(err)),
        { importListId: list.id, anilistUsername }
      );
      throw err;
    }

    logger.info('[ImportList] Fetched AniList entries', {
      importListId: list.id,
      count: entries.length,
      status: anilistStatus,
    });

    for (const entry of entries) {
      const media = entry.media;
      const title = media.title.english || media.title.romaji || `AniList #${media.id}`;

      try {
        // Check if we already have a series with this AniList ID.
        const [existing] = await db
          .select({ id: series.id, monitored: series.monitored })
          .from(series)
          .where(eq(series.anilistId, media.id))
          .limit(1);

        if (existing) {
          // Series exists — optionally enable monitoring if it was off.
          if (list.autoMonitor && !existing.monitored) {
            await db
              .update(series)
              .set({ monitored: true, updatedAt: new Date() })
              .where(eq(series.id, existing.id));

            await this._logActivity({
              userId,
              eventType: 'series_monitored',
              entityId: existing.id,
              entityName: title,
              details: { source: list.source, importListId: list.id, monitored: true },
            });
          }
          result.skipped++;
          continue;
        }

        // Series does not exist — create it.
        const statusMap: Record<string, string> = {
          FINISHED: 'completed',
          RELEASING: 'ongoing',
          NOT_YET_RELEASED: 'ongoing',
          CANCELLED: 'cancelled',
          HIATUS: 'hiatus',
        };

        const [created] = await db
          .insert(series)
          .values({
            name: title,
            anilistId: media.id,
            totalVolumes: media.volumes ?? null,
            status: (statusMap[media.status ?? ''] ?? 'ongoing') as
              | 'ongoing'
              | 'completed'
              | 'hiatus'
              | 'cancelled',
            monitored: list.autoMonitor ?? true,
            metadataSource: 'anilist',
          })
          .returning();

        await this._logActivity({
          userId,
          eventType: 'import_list_series_added',
          entityId: created.id,
          entityName: title,
          details: {
            source: list.source,
            importListId: list.id,
            anilistId: media.id,
            autoMonitor: list.autoMonitor,
          },
        });

        result.imported++;
        result.seriesNames.push(title);

        logger.info('[ImportList] Created series from import list', {
          seriesId: created.id,
          title,
          anilistId: media.id,
          importListId: list.id,
        });
      } catch (entryErr) {
        result.errors++;
        logger.error(
          '[ImportList] Error processing entry',
          entryErr instanceof Error ? entryErr : new Error(String(entryErr)),
          { title, anilistId: media.id, importListId: list.id }
        );
      }
    }

    // Stamp the sync time even if some entries errored.
    await this._stampLastSynced(list.id);

    logger.info('[ImportList] Sync complete', { ...result });

    return result;
  }

  /**
   * Called from the monitor cron: find all enabled lists whose sync interval
   * has elapsed and sync each one.  Errors per-list are isolated so one
   * failing list never blocks the others.
   */
  async syncAllDueImportLists(): Promise<{ synced: number; errors: number }> {
    const now = new Date();

    // A list is "due" when: lastSynced IS NULL  OR
    //   lastSynced + syncInterval hours < now
    const due = await db
      .select()
      .from(importLists)
      .where(
        and(
          eq(importLists.enabled, true),
          sql`(
            ${importLists.lastSynced} IS NULL OR
            ${importLists.lastSynced} + (${importLists.syncInterval} * INTERVAL '1 hour') < ${now.toISOString()}
          )`
        )
      );

    let synced = 0;
    let errors = 0;

    for (const row of due) {
      try {
        await this.syncImportList(row.id, row.userId);
        synced++;
      } catch (err) {
        errors++;
        logger.error(
          '[ImportList] Cron sync failed for list',
          err instanceof Error ? err : new Error(String(err)),
          { importListId: row.id, name: row.name }
        );
      }
    }

    return { synced, errors };
  }

  // -------------------------------------------------------------------------
  // AniList helper
  // -------------------------------------------------------------------------

  /**
   * Fetch a user's AniList manga list for a given status (CURRENT / PLANNING).
   */
  private async _fetchAniListMediaList(
    userName: string,
    status: 'CURRENT' | 'PLANNING'
  ): Promise<AniListMediaEntry[]> {
    const query = `
      query ($userName: String, $status: MediaListStatus) {
        MediaListCollection(userName: $userName, type: MANGA, status: $status) {
          lists {
            entries {
              media {
                id
                title {
                  english
                  romaji
                }
                volumes
                status
              }
            }
          }
        }
      }
    `;

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables: { userName, status } }),
    });

    if (!response.ok) {
      throw new Error(`AniList API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      data?: { MediaListCollection?: AniListMediaListCollection };
    };

    const lists = data?.data?.MediaListCollection?.lists ?? [];
    // Flatten all sublists into a single entries array.
    return lists.flatMap((list) => list.entries);
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private async _stampLastSynced(id: string): Promise<void> {
    await db
      .update(importLists)
      .set({ lastSynced: new Date(), updatedAt: new Date() })
      .where(eq(importLists.id, id));
  }

  private async _logActivity(event: {
    userId: string;
    eventType: string;
    entityId: string;
    entityName: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    await db.insert(activityLog).values({
      userId: event.userId,
      eventType: event.eventType,
      entityType: 'import_list',
      entityId: event.entityId,
      entityName: event.entityName,
      details: event.details ?? null,
      read: false,
    });
  }

  private _mapRow(row: typeof importLists.$inferSelect): ImportList {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      source: row.source as ImportList['source'],
      sourceConfig: (row.sourceConfig as Record<string, unknown>) ?? null,
      autoMonitor: row.autoMonitor ?? true,
      lastSynced: row.lastSynced ?? null,
      syncInterval: row.syncInterval ?? 24,
      enabled: row.enabled ?? true,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
