/**
 * TorznabClient — searches Torznab-compatible indexers (Jackett, Prowlarr).
 *
 * Torznab is an XML API standard that extends Newznab for torrent indexers.
 * The wire format is identical to Newznab except that extra attributes use
 * the `torznab:` namespace prefix instead of `newznab:`.
 *
 * API endpoint: GET {baseUrl}/api?apikey={key}&t=search&q={query}&cat={cats}
 */

import { logger } from '@/lib/logger';
import type { SearchResult, SearchOptions } from './types';

/** Default Torznab categories for ebook releases */
const DEFAULT_EBOOK_CATEGORIES = ['7020', '8010'];

/**
 * Describes a single indexer capability entry returned by the `t=caps` call.
 */
export interface TorznabCategory {
  id: string;
  name: string;
}

/**
 * Extracts the text content of the first occurrence of an XML tag.
 * Returns an empty string when the tag is absent.
 */
function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

/**
 * Extracts the value of an attribute from an XML tag.
 * e.g. extractAttr('<enclosure url="http://…" />', 'url') → "http://…"
 */
function extractAttr(xml: string, tag: string, attr: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'i'));
  return match ? match[1] : '';
}

/**
 * Extracts a `torznab:attr` or `newznab:attr` value by name.
 * e.g. <torznab:attr name="seeders" value="12" />
 */
function extractNsAttr(xml: string, name: string): string {
  const match = xml.match(
    new RegExp(`<(?:torznab|newznab):attr[^>]*\\sname="${name}"[^>]*\\svalue="([^"]*)"`, 'i')
  );
  if (match) return match[1];
  // also try value before name attribute order
  const match2 = xml.match(
    new RegExp(`<(?:torznab|newznab):attr[^>]*\\svalue="([^"]*)"[^>]*\\sname="${name}"`, 'i')
  );
  return match2 ? match2[1] : '';
}

/**
 * Splits an XML string into an array of `<item>…</item>` blocks.
 */
function splitItems(xml: string): string[] {
  const items: string[] = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemPattern.exec(xml)) !== null) {
    items.push(match[1]);
  }
  return items;
}

/**
 * Parses a single `<item>` block from a Torznab XML response into a SearchResult.
 * Returns null when mandatory fields are missing.
 */
function parseItem(itemXml: string, indexerName: string): SearchResult | null {
  const title = extractTag(itemXml, 'title');
  if (!title) return null;

  // Prefer the <enclosure url="…"> for the download link; fall back to <link>
  const enclosureUrl = extractAttr(itemXml, 'enclosure', 'url');
  const linkUrl = extractTag(itemXml, 'link');
  // Also check for a magneturl torznab attr
  const magnetUrl = extractNsAttr(itemXml, 'magneturl');
  const downloadUrl = magnetUrl || enclosureUrl || linkUrl;
  if (!downloadUrl) return null;

  // Size: prefer enclosure length attribute, fall back to <size> tag or torznab attr
  const enclosureLength = extractAttr(itemXml, 'enclosure', 'length');
  const sizeTag = extractTag(itemXml, 'size');
  const sizeAttr = extractNsAttr(itemXml, 'size');
  const rawSize = enclosureLength || sizeTag || sizeAttr;
  const size = rawSize ? parseInt(rawSize, 10) : 0;

  const rawDate = extractTag(itemXml, 'pubDate');
  const publishDate = rawDate ? new Date(rawDate) : null;

  const category = extractNsAttr(itemXml, 'category') || extractTag(itemXml, 'category') || '';

  const rawSeeders = extractNsAttr(itemXml, 'seeders');
  const rawLeechers = extractNsAttr(itemXml, 'peers') || extractNsAttr(itemXml, 'leechers');

  const seeders = rawSeeders ? parseInt(rawSeeders, 10) : undefined;
  const leechers = rawLeechers ? parseInt(rawLeechers, 10) : undefined;

  return {
    title,
    size,
    downloadUrl,
    indexer: indexerName,
    publishDate,
    category,
    seeders,
    leechers,
  };
}

export class TorznabClient {
  private baseUrl: string;
  private apiKey: string;
  private indexerName: string;

  constructor(baseUrl: string, apiKey: string, indexerName = 'Torznab') {
    // Strip trailing slash so we can always append /api safely
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.indexerName = indexerName;
  }

  /**
   * Builds the API URL for a given set of query parameters.
   */
  private buildUrl(params: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}/api`);
    url.searchParams.set('apikey', this.apiKey);
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
    return url.toString();
  }

  /**
   * Searches the indexer for releases matching `query`.
   *
   * @param query   Free-text search string
   * @param options Optional overrides (categories, limit)
   * @returns       Array of parsed search results; empty on error
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const categories = options.categories ?? DEFAULT_EBOOK_CATEGORIES;

    const url = this.buildUrl({
      t: 'search',
      q: query,
      cat: categories.join(','),
      ...(options.limit ? { limit: String(options.limit) } : {}),
    });

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/rss+xml, text/xml, application/xml' },
        // 30-second timeout is generous for indexer API calls
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        logger.error(
          `[Torznab:${this.indexerName}] HTTP ${response.status} for query "${query}"`
        );
        return [];
      }

      const xml = await response.text();
      return this.parseResponse(xml);
    } catch (error) {
      logger.error(
        `[Torznab:${this.indexerName}] Search failed for query "${query}":`,
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  /**
   * Fetches the capabilities advertised by this indexer.
   * Useful for discovering supported category IDs before searching.
   *
   * @returns Array of supported categories; empty on error
   */
  async getCapabilities(): Promise<TorznabCategory[]> {
    const url = this.buildUrl({ t: 'caps' });

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/rss+xml, text/xml, application/xml' },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        logger.error(
          `[Torznab:${this.indexerName}] Caps HTTP ${response.status}`
        );
        return [];
      }

      const xml = await response.text();
      return this.parseCapabilities(xml);
    } catch (error) {
      logger.error(
        `[Torznab:${this.indexerName}] getCapabilities failed:`,
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  /**
   * Parses the XML body of a search response into SearchResult objects.
   */
  private parseResponse(xml: string): SearchResult[] {
    const results: SearchResult[] = [];
    for (const itemXml of splitItems(xml)) {
      const result = parseItem(itemXml, this.indexerName);
      if (result) results.push(result);
    }
    return results;
  }

  /**
   * Parses the XML capabilities response.
   * Extracts `<category id="…" name="…" />` elements.
   */
  private parseCapabilities(xml: string): TorznabCategory[] {
    const categories: TorznabCategory[] = [];
    const pattern = /<category\s[^>]*id="([^"]*)"[^>]*name="([^"]*)"/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(xml)) !== null) {
      categories.push({ id: match[1], name: match[2] });
    }
    return categories;
  }
}
