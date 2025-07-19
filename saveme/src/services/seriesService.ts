/**
 * Service for fetching real series information from book APIs
 */

export interface SeriesInfo {
  seriesName: string;
  totalBooks: number;
  knownBooks: Array<{
    position: number;
    title: string;
    isbn?: string;
    author: string;
    publishedDate?: string;
  }>;
  source: 'google_books' | 'open_library' | 'goodreads' | 'cached';
}

export class SeriesService {
  private cache = new Map<string, SeriesInfo>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get series information by searching for the series name and first book
   */
  async getSeriesInfo(seriesName: string, firstBookTitle?: string, author?: string): Promise<SeriesInfo | null> {
    const cacheKey = `${seriesName}:${author}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`SeriesService: Using cached data for ${seriesName}`);
      return cached;
    }

    try {
      // Try Google Books API first
      const googleResult = await this.searchGoogleBooks(seriesName, firstBookTitle, author);
      if (googleResult) {
        this.cache.set(cacheKey, googleResult);
        return googleResult;
      }

      // Fallback to Open Library
      const openLibraryResult = await this.searchOpenLibrary(seriesName, firstBookTitle, author);
      if (openLibraryResult) {
        this.cache.set(cacheKey, openLibraryResult);
        return openLibraryResult;
      }

      console.warn(`SeriesService: No series information found for ${seriesName}`);
      return null;
    } catch (error) {
      console.error(`SeriesService: Error fetching series info for ${seriesName}:`, error);
      return null;
    }
  }

  /**
   * Search Google Books API for series information
   */
  private async searchGoogleBooks(seriesName: string, firstBookTitle?: string, author?: string): Promise<SeriesInfo | null> {
    try {
      // Search for books in the series
      let query = `inpublisher:"${seriesName}" OR intitle:"${seriesName}"`;
      if (author) {
        query += ` inauthor:"${author}"`;
      }

      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=40&orderBy=relevance`
      );

      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return null;
      }

      // Parse the results to find series books
      const seriesBooks = this.parseGoogleBooksResults(data.items, seriesName);
      
      if (seriesBooks.length === 0) {
        return null;
      }

      return {
        seriesName,
        totalBooks: seriesBooks.length,
        knownBooks: seriesBooks,
        source: 'google_books'
      };
    } catch (error) {
      console.error('Google Books API error:', error);
      return null;
    }
  }

  /**
   * Search Open Library API for series information
   */
  private async searchOpenLibrary(seriesName: string, firstBookTitle?: string, author?: string): Promise<SeriesInfo | null> {
    try {
      // Search for the series
      let query = `title:"${seriesName}"`;
      if (author) {
        query += ` author:"${author}"`;
      }

      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=40`
      );

      if (!response.ok) {
        throw new Error(`Open Library API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.docs || data.docs.length === 0) {
        return null;
      }

      // Parse the results to find series books
      const seriesBooks = this.parseOpenLibraryResults(data.docs, seriesName);
      
      if (seriesBooks.length === 0) {
        return null;
      }

      return {
        seriesName,
        totalBooks: seriesBooks.length,
        knownBooks: seriesBooks,
        source: 'open_library'
      };
    } catch (error) {
      console.error('Open Library API error:', error);
      return null;
    }
  }

  /**
   * Parse Google Books API results to extract series information
   */
  private parseGoogleBooksResults(items: any[], seriesName: string): Array<{
    position: number;
    title: string;
    isbn?: string;
    author: string;
    publishedDate?: string;
  }> {
    const books: Array<{
      position: number;
      title: string;
      isbn?: string;
      author: string;
      publishedDate?: string;
    }> = [];

    for (const item of items) {
      const volumeInfo = item.volumeInfo;
      
      if (!volumeInfo.title) continue;

      // Try to extract series position from title
      const position = this.extractSeriesPosition(volumeInfo.title, seriesName);
      if (position === null) continue;

      // Get ISBN
      let isbn: string | undefined;
      if (volumeInfo.industryIdentifiers) {
        const isbn13 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_13');
        const isbn10 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_10');
        isbn = isbn13?.identifier || isbn10?.identifier;
      }

      books.push({
        position,
        title: volumeInfo.title,
        isbn,
        author: volumeInfo.authors?.[0] || 'Unknown Author',
        publishedDate: volumeInfo.publishedDate
      });
    }

    // Sort by position and remove duplicates
    return books
      .sort((a, b) => a.position - b.position)
      .filter((book, index, arr) => 
        index === 0 || book.position !== arr[index - 1].position
      );
  }

  /**
   * Parse Open Library results to extract series information
   */
  private parseOpenLibraryResults(docs: any[], seriesName: string): Array<{
    position: number;
    title: string;
    isbn?: string;
    author: string;
    publishedDate?: string;
  }> {
    const books: Array<{
      position: number;
      title: string;
      isbn?: string;
      author: string;
      publishedDate?: string;
    }> = [];

    for (const doc of docs) {
      if (!doc.title) continue;

      // Try to extract series position from title
      const position = this.extractSeriesPosition(doc.title, seriesName);
      if (position === null) continue;

      books.push({
        position,
        title: doc.title,
        isbn: doc.isbn?.[0],
        author: doc.author_name?.[0] || 'Unknown Author',
        publishedDate: doc.first_publish_year?.toString()
      });
    }

    // Sort by position and remove duplicates
    return books
      .sort((a, b) => a.position - b.position)
      .filter((book, index, arr) => 
        index === 0 || book.position !== arr[index - 1].position
      );
  }

  /**
   * Extract series position from book title
   */
  private extractSeriesPosition(title: string, seriesName: string): number | null {
    // Common patterns for series positions
    const patterns = [
      new RegExp(`${seriesName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*#?(\\d+)`, 'i'),
      new RegExp(`${seriesName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?:book|volume|part)\\s*(\\d+)`, 'i'),
      /\b(?:book|volume|part)\s*(\d+)\b/i,
      /#(\d+)\b/,
      /\b(\d+)(?:st|nd|rd|th)?\s*(?:book|volume|part)?\b/i
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match && match[1]) {
        const position = parseInt(match[1], 10);
        if (position > 0 && position <= 50) { // Reasonable range
          return position;
        }
      }
    }

    return null;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const seriesService = new SeriesService();