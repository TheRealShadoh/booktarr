import type { ReadingStatus } from '@/components/reading/reading-status-badge';

/**
 * Shared API response types for BookTarr
 */

export interface BookAuthor {
  name: string;
}

export interface BookEdition {
  id: string;
  isbn10?: string | null;
  isbn13?: string | null;
  format?: string | null;
  pageCount?: number | null;
  publisher?: string | null;
  publishDate?: string | null;
  language?: string | null;
  coverUrl?: string | null;
  coverThumbnailUrl?: string | null;
}

export interface BookSeries {
  id: string;
  name: string;
  volumeNumber: number;
}

export interface UserBook {
  id: string;
  status: string;
}

export interface BookReadingProgress {
  id: string;
  status: ReadingStatus;
  currentPage?: number;
  totalPages?: number;
  progressPercentage?: number;
  rating?: number;
  review?: string;
}

export interface BookWithRelations {
  book: {
    id: string;
    title: string;
    subtitle?: string | null;
    description?: string | null;
    googleBooksId?: string | null;
    openLibraryId?: string | null;
    anilistId?: number | null;
  };
  edition: BookEdition;
  authors?: BookAuthor[];
  series?: BookSeries | null;
  userBook: UserBook;
  readingProgress?: BookReadingProgress | null;
}

export interface BooksApiResponse {
  books: BookWithRelations[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ReadingStats {
  currentlyReading: number;
  booksFinishedThisYear: number;
  booksFinishedThisMonth: number;
  totalBooksRead: number;
  averageRating: number;
}
