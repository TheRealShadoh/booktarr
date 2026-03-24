/**
 * NewznabClient — searches Newznab-compatible usenet indexers.
 *
 * Newznab is an XML API standard used by most modern usenet indexers.
 * The wire format uses `<item>` elements with `<newznab:attr>` extensions
 * for extra metadata fields such as file size, usenet group, and age.
 *
 * API endpoint: GET {baseUrl}/api?apikey={key}&t=search&q={query}&cat={cats}
 *
 * Note: The XML structure is identical to Torznab; the key difference is
 * that the download URL points to an NZB file rather than a torrent/magnet.
 */

import { logger } from '@/lib/logger';
import type { SearchResult, SearchOptions } from './types';

/** Default Newznab categories for ebook releases */
const DEFAULT_EBOOK_CATEGORIES = ['7020', '7000'];

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
 * Extracts a `newznab:attr` value by name.
 * e.g. <newznab:attr name="size" value="1234567" />
 */
function extractNsAttr(xml: string, name: string): string {
  const match = xml.match(
    new RegExp(`<(?:newznab|torznab):attr[^>]*\\sname="${name}"[^>]*\\svalue="([^"]*)"`, 'i')
  );
  if (match) return match[1];
  // also handle value before name ordering
  const match2 = xml.match(
    new RegExp(`<(?:newznab|torznab):attr[^>]*\\svalue="([^"]*)"[^>]*\\sname="${name}"`, 'i')
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
 * Parses a single `<item>` block from a Newznab XML response into a SearchResult.
 * Returns null when mandatory fields are missing.
 */
function parseItem(itemXml: string, indexerName: string): SearchResult | null {
  const title = extractTag(itemXml, 'title');
  if (!title) return null;

  // For usenet the download link is the NZB URL carried in <link> or <enclosure url="…">
  const linkUrl = extractTag(itemXml, 'link');
  const enclosureUrl = extractAttr(itemXml, 'enclosure', 'url');
  const downloadUrl = linkUrl || enclosureUrl;
  if (!downloadUrl) return null;

  // Size: prefer enclosure length attribute, fall back to <size> or newznab:attr
  const enclosureLength = extractAttr(itemXml, 'enclosure', 'length');
  const sizeTag = extractTag(itemXml, 'size');
  const sizeAttr = extractNsAttr(itemXml, 'size');
  const rawSize = enclosureLength || sizeTag || sizeAttr;
  const size = rawSize ? parseInt(rawSize, 10) : 0;

  const rawDate = extractTag(itemXml, 'pubDate');
  const publishDate = rawDate ? new Date(rawDate) : null;

  const category = extractNsAttr(itemXml, 'category') || extractTag(itemXml, 'category') || '';

  return {
    title,
    size,
    downloadUrl,
    indexer: indexerName,
    publishDate,
    category,
    // Usenet releases have no seeder/leecher concept
  };
}

export class NewznabClient {
  private baseUrl: string;
  private apiKey: string;
  private indexerName: string;

  constructor(baseUrl: string, apiKey: string, indexerName = 'Newznab') {
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
   * Searches the indexer for usenet releases matching `query`.
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
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        logger.error(
          `[Newznab:${this.indexerName}] HTTP ${response.status} for query "${query}"`
        );
        return [];
      }

      const xml = await response.text();
      return this.parseResponse(xml);
    } catch (error) {
      logger.error(
        `[Newznab:${this.indexerName}] Search failed for query "${query}":`,
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
}
