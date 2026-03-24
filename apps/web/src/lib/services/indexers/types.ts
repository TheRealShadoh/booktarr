/**
 * Shared types for Torznab and Newznab indexer search services.
 */

/**
 * A single search result returned from any indexer type.
 * Torrent results include seeder/leecher counts; usenet results do not.
 */
export interface SearchResult {
  /** Release title as reported by the indexer */
  title: string;
  /** File size in bytes */
  size: number;
  /** Direct download URL — magnet link or .torrent URL for torrents, NZB URL for usenet */
  downloadUrl: string;
  /** Human-readable name of the indexer that returned this result */
  indexer: string;
  /** Publication/post date of the release */
  publishDate: Date | null;
  /** Newznab/Torznab category code, e.g. "7020" for eBooks */
  category: string;
  /** Number of active seeders — present only for torrent results */
  seeders?: number;
  /** Number of active leechers — present only for torrent results */
  leechers?: number;
}

/**
 * Configuration for a single indexer instance, matching the `indexers` DB table.
 */
export interface IndexerConfig {
  id: string;
  name: string;
  /** Protocol type — drives which client class handles this config */
  type: 'torznab' | 'newznab' | 'rss';
  /** Base URL of the indexer API (no trailing slash) */
  url: string;
  apiKey: string | null;
  /** Array of Newznab/Torznab category codes to restrict searches to */
  categories: string[] | null;
  supportsSearch: boolean | null;
  priority: number | null;
  enabled: boolean | null;
}

/**
 * Optional parameters for customising a search call.
 */
export interface SearchOptions {
  /** Override the categories set on the IndexerConfig for this call */
  categories?: string[];
  /** Maximum number of results to return per indexer (default 100) */
  limit?: number;
}
