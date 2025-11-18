import { BookMetadata } from './google-books';

interface OpenLibraryBook {
  key: string;
  title: string;
  subtitle?: string;
  authors?: Array<{ key: string }>;
  author_name?: string[];
  publishers?: string[];
  publish_date?: string;
  number_of_pages?: number;
  isbn?: string[];
  isbn_10?: string[];
  isbn_13?: string[];
  cover_i?: number;
  subject?: string[];
  language?: string[];
}

export class OpenLibraryClient {
  private baseUrl = 'https://openlibrary.org';
  private coversUrl = 'https://covers.openlibrary.org/b';

  async searchByISBN(isbn: string): Promise<BookMetadata | null> {
    try {
      const cleanISBN = isbn.replace(/[-\s]/g, '');
      const url = `${this.baseUrl}/isbn/${cleanISBN}.json`;

      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return this.parseBook(data, cleanISBN);
    } catch (error) {
      console.error('OpenLibrary search error:', error);
      return null;
    }
  }

  async searchByTitle(title: string, author?: string): Promise<BookMetadata[]> {
    try {
      const url = new URL(`${this.baseUrl}/search.json`);
      url.searchParams.append('title', title);
      if (author) {
        url.searchParams.append('author', author);
      }
      url.searchParams.append('limit', '10');

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`OpenLibrary API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.docs || data.docs.length === 0) {
        return [];
      }

      return data.docs.map((doc: OpenLibraryBook) => this.parseSearchResult(doc));
    } catch (error) {
      console.error('OpenLibrary search error:', error);
      return [];
    }
  }

  private parseBook(data: OpenLibraryBook, isbn?: string): BookMetadata {
    const isbn10 = data.isbn_10?.[0];
    const isbn13 = data.isbn_13?.[0] || isbn;

    return {
      title: data.title,
      subtitle: data.subtitle,
      authors: data.author_name || [],
      publisher: data.publishers?.[0],
      publishedDate: data.publish_date,
      isbn10,
      isbn13,
      pageCount: data.number_of_pages,
      categories: data.subject?.slice(0, 5),
      coverUrl: data.cover_i
        ? `${this.coversUrl}/id/${data.cover_i}-L.jpg`
        : undefined,
      thumbnailUrl: data.cover_i
        ? `${this.coversUrl}/id/${data.cover_i}-S.jpg`
        : undefined,
      language: data.language?.[0],
      openLibraryId: data.key,
    };
  }

  private parseSearchResult(doc: OpenLibraryBook): BookMetadata {
    const isbn10 = doc.isbn_10?.[0];
    const isbn13 = doc.isbn_13?.[0];

    return {
      title: doc.title,
      subtitle: doc.subtitle,
      authors: doc.author_name || [],
      publisher: doc.publishers?.[0],
      publishedDate: doc.publish_date,
      isbn10,
      isbn13,
      pageCount: doc.number_of_pages,
      categories: doc.subject?.slice(0, 5),
      coverUrl: doc.cover_i
        ? `${this.coversUrl}/id/${doc.cover_i}-L.jpg`
        : undefined,
      thumbnailUrl: doc.cover_i
        ? `${this.coversUrl}/id/${doc.cover_i}-S.jpg`
        : undefined,
      openLibraryId: doc.key,
    };
  }
}
