/**
 * IndexerManager — orchestrates searches across all of a user's configured
 * Torznab and Newznab indexers.
 *
 * Responsibilities:
 *  - Load enabled indexer configs from the database for a given user
 *  - Fan out search queries to all matching clients in parallel
 *  - Deduplicate results by normalised title
 *  - Sort: torrent results by seeders (desc), usenet results by age (newest first)
 *  - Construct smart book-search queries ("Title Vol 05", "Title Author epub")
 *  - Provide a connection test helper
 */

import { logger } from '@/lib/logger';
import { db } from '../../db';
import { indexers } from '@booktarr/database';
import { eq, and } from 'drizzle-orm';
import { TorznabClient } from './torznab';
import { NewznabClient } from './newznab';
import type { SearchResult, IndexerConfig, SearchOptions } from './types';

// Re-export types so callers only need to import from this barrel
export type { SearchResult, IndexerConfig, SearchOptions } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Pads a number to two digits with a leading zero — used when formatting
 * volume numbers so "5" becomes "05" for consistent release naming conventions.
 */
function padVolume(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Normalises a release title for deduplication purposes.
 * Strips excess whitespace, converts to lowercase, and removes common
 * punctuation variations that indexers use inconsistently.
 */
function normaliseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[.\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determines whether a result came from a torrent indexer based on the
 * presence of seeder/leecher counts on the result object.
 */
function isTorrentResult(result: SearchResult): boolean {
  return result.seeders !== undefined;
}

/**
 * Comparator for sorting mixed torrent + usenet results.
 *
 * Sort order:
 *  1. Torrent results rank by seeders descending (more seeders = better)
 *  2. Usenet results rank by publishDate descending (newer = better)
 *  3. Torrent results are placed before usenet results of equivalent quality
 */
function compareResults(a: SearchResult, b: SearchResult): number {
  const aIsTorrent = isTorrentResult(a);
  const bIsTorrent = isTorrentResult(b);

  if (aIsTorrent && bIsTorrent) {
    return (b.seeders ?? 0) - (a.seeders ?? 0);
  }

  if (!aIsTorrent && !bIsTorrent) {
    const aDate = a.publishDate?.getTime() ?? 0;
    const bDate = b.publishDate?.getTime() ?? 0;
    return bDate - aDate;
  }

  // Torrents before usenet when quality is otherwise equal
  return aIsTorrent ? -1 : 1;
}

// ─── IndexerManager ─────────────────────────────────────────────────────────

export class IndexerManager {
  /**
   * Loads all enabled indexer configurations for the given user from the DB.
   */
  private async loadIndexers(userId: string): Promise<IndexerConfig[]> {
    const rows = await db
      .select()
      .from(indexers)
      .where(and(eq(indexers.userId, userId), eq(indexers.enabled, true)));

    return rows as IndexerConfig[];
  }

  /**
   * Instantiates the correct client class for the given config.
   * Returns null for unsupported indexer types (e.g. plain RSS).
   */
  private createClient(
    config: IndexerConfig
  ): TorznabClient | NewznabClient | null {
    const apiKey = config.apiKey ?? '';
    switch (config.type) {
      case 'torznab':
        return new TorznabClient(config.url, apiKey, config.name);
      case 'newznab':
        return new NewznabClient(config.url, apiKey, config.name);
      default:
        // Plain RSS or unknown types are not yet supported
        logger.warn(`[IndexerManager] Unsupported indexer type "${config.type}" for "${config.name}" — skipping`);
        return null;
    }
  }

  /**
   * Searches all enabled indexers for the given user with the provided query,
   * deduplicates results by normalised title, and sorts by quality.
   *
   * @param userId  UUID of the user whose indexers should be searched
   * @param query   Raw search string
   * @param options Optional overrides forwarded to each client
   * @returns       Deduplicated, sorted array of SearchResult objects
   */
  async searchAll(
    userId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    let configs: IndexerConfig[];
    try {
      configs = await this.loadIndexers(userId);
    } catch (error) {
      logger.error(
        '[IndexerManager] Failed to load indexers from DB:',
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }

    if (configs.length === 0) {
      logger.warn(`[IndexerManager] No enabled indexers found for user ${userId}`);
      return [];
    }

    // Fan out searches in parallel — a failure on one indexer must not block others
    const searchPromises = configs.map(async (config): Promise<SearchResult[]> => {
      const client = this.createClient(config);
      if (!client) return [];

      const clientOptions: SearchOptions = {
        ...options,
        categories: options.categories ?? config.categories ?? undefined,
      };

      try {
        return await client.search(query, clientOptions);
      } catch (error) {
        logger.error(
          `[IndexerManager] Search failed on indexer "${config.name}":`,
          error instanceof Error ? error : new Error(String(error))
        );
        return [];
      }
    });

    const resultArrays = await Promise.all(searchPromises);
    const allResults = resultArrays.flat();

    return this.deduplicateAndSort(allResults);
  }

  /**
   * Constructs one or more smart query strings for a book and searches all
   * enabled indexers for the given user.
   *
   * Query construction strategy:
   *  - Volume-based:  "Title Vol 05", "Title Volume 5"
   *  - Author-based:  "Title Author epub"
   *  - Bare title:    "Title" (fallback, broadest)
   *
   * Results from all queries are combined, deduplicated, and sorted.
   *
   * @param userId       UUID of the user whose indexers should be searched
   * @param title        Book or series title
   * @param author       Optional author name to narrow results
   * @param volumeNumber Optional volume number (manga/LN series)
   * @returns            Deduplicated, sorted array of SearchResult objects
   */
  async searchForBook(
    userId: string,
    title: string,
    author?: string,
    volumeNumber?: number
  ): Promise<SearchResult[]> {
    const queries = this.buildBookQueries(title, author, volumeNumber);

    logger.info(`[IndexerManager] Searching for book "${title}" with ${queries.length} query variant(s)`);

    // Run all query variants in parallel and merge
    const resultArrays = await Promise.all(
      queries.map((q) => this.searchAll(userId, q))
    );

    const allResults = resultArrays.flat();
    return this.deduplicateAndSort(allResults);
  }

  /**
   * Tests connectivity to a single indexer by performing a capabilities
   * lookup (Torznab) or a minimal search (Newznab).
   *
   * @param config IndexerConfig to test (does not need to be in the DB)
   * @returns      true if the indexer responded successfully, false otherwise
   */
  async testIndexer(config: IndexerConfig): Promise<boolean> {
    const client = this.createClient(config);
    if (!client) return false;

    try {
      if (config.type === 'torznab' && client instanceof TorznabClient) {
        const caps = await client.getCapabilities();
        // A non-empty category list means the indexer is reachable and responding
        return caps.length > 0;
      }

      // For Newznab, issue a minimal search to verify connectivity
      const results = await client.search('test', { limit: 1 });
      // A successful (even empty) response means the indexer is reachable
      // We treat an empty result as success — the indexer may just have no matches
      return Array.isArray(results);
    } catch (error) {
      logger.error(
        `[IndexerManager] testIndexer failed for "${config.name}":`,
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  /**
   * Deduplicates an array of SearchResult objects by normalised title and
   * sorts the remainder by quality (seeders for torrents, age for usenet).
   */
  private deduplicateAndSort(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    const unique: SearchResult[] = [];

    for (const result of results) {
      const key = normaliseTitle(result.title);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(result);
      }
    }

    return unique.sort(compareResults);
  }

  /**
   * Builds an ordered list of search query strings for a book.
   * More specific queries come first; the bare title fallback is last.
   */
  private buildBookQueries(
    title: string,
    author?: string,
    volumeNumber?: number
  ): string[] {
    const queries: string[] = [];

    if (volumeNumber !== undefined) {
      // Zero-padded volume number matches common release naming conventions
      const padded = padVolume(volumeNumber);
      queries.push(`${title} Vol ${padded}`);
      queries.push(`${title} Volume ${volumeNumber}`);
    }

    if (author) {
      queries.push(`${title} ${author} epub`);
      queries.push(`${title} ${author}`);
    }

    // Bare title is always the final fallback
    queries.push(title);

    // Deduplicate in case any variants ended up identical
    return [...new Set(queries)];
  }
}
