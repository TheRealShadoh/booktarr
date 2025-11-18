interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    language?: string;
  };
}

export interface BookMetadata {
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  isbn10?: string;
  isbn13?: string;
  pageCount?: number;
  categories?: string[];
  coverUrl?: string;
  thumbnailUrl?: string;
  language?: string;
  googleBooksId?: string;
  openLibraryId?: string;
}

export class GoogleBooksClient {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/books/v1/volumes';
  private lastRequestTime = 0;
  private minRequestInterval = 1000; // 1 second between requests
  private maxRetries = 3;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_BOOKS_API_KEY || '';
  }

  /**
   * Ensures minimum delay between API requests to avoid rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Makes a fetch request with rate limiting and retry logic
   */
  private async fetchWithRetry(url: string, retries = 0): Promise<Response> {
    await this.enforceRateLimit();

    const response = await fetch(url);

    // Handle rate limiting with exponential backoff
    if (response.status === 429 && retries < this.maxRetries) {
      const backoffDelay = Math.pow(2, retries) * 2000; // 2s, 4s, 8s
      console.log(`[Google Books] Rate limited, retrying in ${backoffDelay}ms (attempt ${retries + 1}/${this.maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return this.fetchWithRetry(url, retries + 1);
    }

    return response;
  }

  async searchByISBN(isbn: string): Promise<BookMetadata | null> {
    try {
      const cleanISBN = isbn.replace(/[-\s]/g, '');
      const url = new URL(this.baseUrl);
      url.searchParams.append('q', `isbn:${cleanISBN}`);
      if (this.apiKey) {
        url.searchParams.append('key', this.apiKey);
      }

      const response = await this.fetchWithRetry(url.toString());

      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return null;
      }

      return this.parseVolume(data.items[0]);
    } catch (error) {
      console.error('Google Books search error:', error);
      return null;
    }
  }

  async searchByTitle(title: string, author?: string): Promise<BookMetadata[]> {
    try {
      const url = new URL(this.baseUrl);
      let query = `intitle:${title}`;
      if (author) {
        query += `+inauthor:${author}`;
      }
      url.searchParams.append('q', query);
      url.searchParams.append('maxResults', '10');
      if (this.apiKey) {
        url.searchParams.append('key', this.apiKey);
      }

      const response = await this.fetchWithRetry(url.toString());

      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return [];
      }

      return data.items.map((item: GoogleBooksVolume) => this.parseVolume(item));
    } catch (error) {
      console.error('Google Books search error:', error);
      return [];
    }
  }

  private parseVolume(volume: GoogleBooksVolume): BookMetadata {
    const { volumeInfo } = volume;

    const isbn10 = volumeInfo.industryIdentifiers?.find(
      (id) => id.type === 'ISBN_10'
    )?.identifier;

    const isbn13 = volumeInfo.industryIdentifiers?.find(
      (id) => id.type === 'ISBN_13'
    )?.identifier;

    return {
      title: volumeInfo.title,
      subtitle: volumeInfo.subtitle,
      authors: volumeInfo.authors || [],
      publisher: volumeInfo.publisher,
      publishedDate: volumeInfo.publishedDate,
      description: volumeInfo.description,
      isbn10,
      isbn13,
      pageCount: volumeInfo.pageCount,
      categories: volumeInfo.categories,
      coverUrl: volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://'),
      thumbnailUrl: volumeInfo.imageLinks?.smallThumbnail?.replace('http://', 'https://'),
      language: volumeInfo.language,
      googleBooksId: volume.id,
    };
  }
}
