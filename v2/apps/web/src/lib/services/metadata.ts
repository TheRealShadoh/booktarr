import { db } from '../db';
import { metadataCache } from '@booktarr/database';
import { eq, and, gt } from 'drizzle-orm';
import { GoogleBooksClient, BookMetadata } from './google-books';
import { OpenLibraryClient } from './openlibrary';

export class MetadataService {
  private googleBooks: GoogleBooksClient;
  private openLibrary: OpenLibraryClient;
  private cacheTTL = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

  constructor() {
    this.googleBooks = new GoogleBooksClient();
    this.openLibrary = new OpenLibraryClient();
  }

  async enrichByISBN(isbn: string): Promise<BookMetadata | null> {
    const cleanISBN = isbn.replace(/[-\s]/g, '');

    // Check cache first
    const cached = await this.getFromCache('isbn', cleanISBN);
    if (cached) {
      return cached as BookMetadata;
    }

    // Try Google Books first (generally better data)
    let metadata = await this.googleBooks.searchByISBN(cleanISBN);

    // Fallback to OpenLibrary if Google Books fails
    if (!metadata) {
      metadata = await this.openLibrary.searchByISBN(cleanISBN);
    }

    if (metadata) {
      // Cache the result
      await this.saveToCache('isbn', cleanISBN, metadata, 'google_books');
    }

    return metadata;
  }

  async searchByTitle(title: string, author?: string): Promise<BookMetadata[]> {
    const cacheKey = `title:${title}${author ? `:${author}` : ''}`;

    // Check cache first
    const cached = await this.getFromCache('title_search', cacheKey);
    if (cached) {
      return cached as BookMetadata[];
    }

    // Search both sources
    const [googleResults, openLibraryResults] = await Promise.all([
      this.googleBooks.searchByTitle(title, author),
      this.openLibrary.searchByTitle(title, author),
    ]);

    // Combine and deduplicate results
    const combinedResults = this.deduplicateResults([
      ...googleResults,
      ...openLibraryResults,
    ]);

    // Cache the results (shorter TTL for searches - 7 days)
    await this.saveToCache(
      'title_search',
      cacheKey,
      combinedResults,
      'combined',
      7 * 24 * 60 * 60 * 1000
    );

    return combinedResults;
  }

  private deduplicateResults(results: BookMetadata[]): BookMetadata[] {
    const seen = new Set<string>();
    const unique: BookMetadata[] = [];

    for (const result of results) {
      // Use ISBN13 or ISBN10 or title+author as unique key
      const key =
        result.isbn13 ||
        result.isbn10 ||
        `${result.title}-${result.authors.join(',')}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(result);
      }
    }

    return unique;
  }

  private async getFromCache(
    identifierType: string,
    identifier: string
  ): Promise<BookMetadata | BookMetadata[] | null> {
    try {
      const cached = await db.query.metadataCache.findFirst({
        where: and(
          eq(metadataCache.identifierType, identifierType),
          eq(metadataCache.identifier, identifier),
          gt(metadataCache.expiresAt, new Date())
        ),
      });

      if (!cached) {
        return null;
      }

      return cached.data as BookMetadata | BookMetadata[];
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  private async saveToCache(
    identifierType: string,
    identifier: string,
    data: BookMetadata | BookMetadata[],
    source: string,
    ttl: number = this.cacheTTL
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttl);

      await db
        .insert(metadataCache)
        .values({
          source,
          identifier,
          identifierType,
          data: data as unknown as Record<string, unknown>,
          ttl: Math.floor(ttl / 1000),
          expiresAt,
        })
        .onConflictDoUpdate({
          target: [metadataCache.source, metadataCache.identifier],
          set: {
            data: data as unknown as Record<string, unknown>,
            lastFetched: new Date(),
            expiresAt,
          },
        });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }
}
