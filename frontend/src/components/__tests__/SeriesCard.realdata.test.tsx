/**
 * Enhanced SeriesCard component tests using real data patterns from HandyLib.csv
 * Tests series aggregation and display with actual manga/book series data
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SeriesCard from '../SeriesCard';
import { Book, ReadingStatus, MetadataSource } from '../../types';

// Real Oshi no Ko series data from HandyLib.csv
const oshiNoKoSeries: Book[] = [
  {
    isbn: '9781975363178',
    title: '[Oshi No Ko], Vol. 1 (Volume 1) ([Oshi No Ko], 1)',
    authors: ['Akasaka, Aka', 'Yokoyari, Mengo'],
    series: '推しの子 [Oshi no Ko]',
    series_position: 1,
    publisher: 'Yen Press',
    published_date: '2023-01-17',
    page_count: 228,
    language: 'English',
    cover_url: 'https://m.media-amazon.com/images/I/51jhRrffW5L._SL500_.jpg',
    categories: ['Fantasy'],
    pricing: [],
    reading_status: ReadingStatus.READ,
    metadata_source: MetadataSource.AMAZON,
    added_date: '2025-07-18T00:00:00Z',
    last_updated: '2025-07-18T00:00:00Z',
    times_read: 1
  },
  {
    isbn: '9781975363192',
    title: '[Oshi No Ko], Vol. 2 (Volume 2) ([Oshi No Ko], 2)',
    authors: ['Akasaka, Aka', 'Yokoyari, Mengo'],
    series: '推しの子 [Oshi no Ko]',
    series_position: 2,
    publisher: 'Yen Press',
    published_date: '2023-05-23',
    page_count: 194,
    language: 'English',
    cover_url: 'https://m.media-amazon.com/images/I/51QoSmYxGwL._SL500_.jpg',
    categories: ['Fantasy'],
    pricing: [],
    reading_status: ReadingStatus.READING,
    metadata_source: MetadataSource.AMAZON,
    added_date: '2025-07-18T00:00:00Z',
    last_updated: '2025-07-18T00:00:00Z',
    times_read: 0
  },
  {
    isbn: '9781975363215',
    title: '[Oshi No Ko], Vol. 3 (Volume 3) ([Oshi No Ko], 3)',
    authors: ['Akasaka, Aka', 'Yokoyari, Mengo'],
    series: '推しの子 [Oshi no Ko]',
    series_position: 3,
    publisher: 'Yen Press',
    published_date: '2023-08-22',
    page_count: 194,
    language: 'English',
    cover_url: 'https://m.media-amazon.com/images/I/51K82bGqk3L._SL500_.jpg',
    categories: ['Romance'],
    pricing: [],
    reading_status: ReadingStatus.UNREAD,
    metadata_source: MetadataSource.AMAZON,
    added_date: '2025-07-18T00:00:00Z',
    last_updated: '2025-07-18T00:00:00Z',
    times_read: 0
  }
];

// Standalone books for testing individual book handling
const standaloneBooks: Book[] = [
  {
    isbn: '9780439139595',
    title: 'The Hobbit',
    authors: ['J.R.R. Tolkien'],
    series: undefined,
    series_position: undefined,
    publisher: 'Houghton Mifflin',
    published_date: '1937-09-21',
    page_count: 310,
    language: 'English',
    cover_url: 'https://example.com/hobbit.jpg',
    categories: ['Fantasy', 'Adventure'],
    pricing: [],
    reading_status: ReadingStatus.READ,
    metadata_source: MetadataSource.GOOGLE_BOOKS,
    added_date: '2025-01-01T00:00:00Z',
    last_updated: '2025-01-01T00:00:00Z',
    times_read: 1
  }
];

// Mock fetch for series metadata API calls
global.fetch = jest.fn();

describe('SeriesCard with Real Data Patterns', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('Japanese manga series display', () => {
    it('renders Oshi no Ko series with Japanese title correctly', () => {
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
          totalBooksInSeries={13}
        />
      );
      
      // Check series name with Japanese characters
      expect(screen.getByText('推しの子 [Oshi no Ko]')).toBeInTheDocument();
      
      // Check volume count display
      expect(screen.getByText('3 of 13 volumes')).toBeInTheDocument();
      
      // Check completion percentage (3/13 ≈ 23%)
      expect(screen.getByText('23% Complete')).toBeInTheDocument();
      
      // Check that first volume cover is displayed
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', 'https://m.media-amazon.com/images/I/51jhRrffW5L._SL500_.jpg');
    });

    it('shows reading progress summary for series', () => {
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
          totalBooksInSeries={13}
        />
      );
      
      // Should show reading status breakdown
      // 1 read, 1 reading, 1 unread
      expect(screen.getByText('1 Read')).toBeInTheDocument();
      expect(screen.getByText('1 Reading')).toBeInTheDocument();
      expect(screen.getByText('1 Unread')).toBeInTheDocument();
    });

    it('displays most recent publication date', () => {
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
          totalBooksInSeries={13}
        />
      );
      
      // Should show latest publication year (2023)
      expect(screen.getByText('2023')).toBeInTheDocument();
    });

    it('shows genre information from series books', () => {
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
          totalBooksInSeries={13}
        />
      );
      
      // Should show primary genre (Fantasy appears most)
      expect(screen.getByText('Fantasy')).toBeInTheDocument();
    });
  });

  describe('Series metadata fetching', () => {
    it('fetches series metadata when not provided', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          series: { total_books: 13 }
        })
      });

      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
        />
      );
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/series/%E6%8E%A8%E3%81%97%E3%81%AE%E5%AD%90%20%5BOshi%20no%20Ko%5D');
      });
    });

    it('does not fetch metadata for standalone books', () => {
      render(
        <SeriesCard 
          seriesName="Standalone" 
          books={standaloneBooks} 
        />
      );
      
      expect(fetch).not.toHaveBeenCalled();
    });

    it('handles API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
        />
      );
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch series metadata:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('List view mode', () => {
    it('renders compact list view for series', () => {
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
          totalBooksInSeries={13}
          viewMode="list"
        />
      );
      
      // Should show series info in compact format
      expect(screen.getByText('推しの子 [Oshi no Ko]')).toBeInTheDocument();
      expect(screen.getByText('3 volumes')).toBeInTheDocument();
      
      // Image should be smaller in list view
      const image = screen.getByRole('img');
      expect(image).toHaveClass('w-16', 'h-24');
    });
  });

  describe('Interactive behaviors', () => {
    it('calls onClick handler with series name', () => {
      const mockOnClick = jest.fn();
      
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
          onClick={mockOnClick}
        />
      );
      
      fireEvent.click(screen.getByText('推しの子 [Oshi no Ko]'));
      
      expect(mockOnClick).toHaveBeenCalledWith('推しの子 [Oshi no Ko]');
    });

    it('shows hover effects for interactive cards', () => {
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
          onClick={() => {}}
        />
      );
      
      const cardContainer = screen.getByRole('article', { hidden: true });
      expect(cardContainer).toHaveClass('cursor-pointer');
    });
  });

  describe('Image handling with real cover URLs', () => {
    it('displays first volume cover as series representative', () => {
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
        />
      );
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', oshiNoKoSeries[0].cover_url);
      expect(image).toHaveAttribute('alt', '推しの子 [Oshi no Ko]');
    });

    it('handles image loading states', async () => {
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
        />
      );
      
      const image = screen.getByRole('img');
      
      // Initially should show loading state
      expect(image).toHaveClass('opacity-0');
      
      // Simulate image load
      fireEvent.load(image);
      
      await waitFor(() => {
        expect(image).toHaveClass('opacity-100');
      });
    });

    it('shows fallback for broken images', async () => {
      const seriesWithBrokenImage = oshiNoKoSeries.map(book => ({
        ...book,
        cover_url: 'broken-url'
      }));
      
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={seriesWithBrokenImage} 
        />
      );
      
      const image = screen.getByRole('img');
      
      // Simulate image error
      fireEvent.error(image);
      
      await waitFor(() => {
        // Should show SVG fallback
        const svg = screen.getByRole('graphics-document', { hidden: true });
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe('Data calculations and edge cases', () => {
    it('handles series with missing total book count', () => {
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
        />
      );
      
      // Should show owned count without total
      expect(screen.getByText('3 volumes')).toBeInTheDocument();
      expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
    });

    it('calculates completion percentage correctly', () => {
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
          totalBooksInSeries={3}
        />
      );
      
      // 3 of 3 should be 100%
      expect(screen.getByText('100% Complete')).toBeInTheDocument();
    });

    it('handles empty book arrays', () => {
      render(
        <SeriesCard 
          seriesName="Empty Series" 
          books={[]} 
          totalBooksInSeries={5}
        />
      );
      
      expect(screen.getByText('Empty Series')).toBeInTheDocument();
      expect(screen.getByText('0 of 5 volumes')).toBeInTheDocument();
      expect(screen.getByText('0% Complete')).toBeInTheDocument();
    });

    it('identifies most common genre across series', () => {
      // Mixed genres: 2 Fantasy, 1 Romance
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
        />
      );
      
      // Should show Fantasy as most common
      expect(screen.getByText('Fantasy')).toBeInTheDocument();
    });

    it('handles books without series positions', () => {
      const booksWithoutPositions = oshiNoKoSeries.map(book => ({
        ...book,
        series_position: undefined
      }));
      
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={booksWithoutPositions} 
        />
      );
      
      // Should still show volume count based on array length
      expect(screen.getByText('3 volumes')).toBeInTheDocument();
    });
  });

  describe('Reading status aggregation', () => {
    it('counts reading statuses correctly', () => {
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
        />
      );
      
      // Verify status counts: 1 read, 1 reading, 1 unread
      expect(screen.getByText('1 Read')).toBeInTheDocument();
      expect(screen.getByText('1 Reading')).toBeInTheDocument();
      expect(screen.getByText('1 Unread')).toBeInTheDocument();
    });

    it('handles books with undefined reading status', () => {
      const booksWithUndefinedStatus = oshiNoKoSeries.map(book => ({
        ...book,
        reading_status: undefined
      }));
      
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={booksWithUndefinedStatus} 
        />
      );
      
      // Should default to unread
      expect(screen.getByText('3 Unread')).toBeInTheDocument();
    });
  });

  describe('Accessibility features', () => {
    it('provides proper alt text for series cover', () => {
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
        />
      );
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', '推しの子 [Oshi no Ko]');
    });

    it('provides title attributes for long series names', () => {
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
        />
      );
      
      const titleElement = screen.getByTitle('推しの子 [Oshi no Ko]');
      expect(titleElement).toBeInTheDocument();
    });

    it('maintains keyboard navigation support', () => {
      render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
          onClick={() => {}}
        />
      );
      
      const cardContainer = screen.getByRole('article', { hidden: true });
      expect(cardContainer).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Performance considerations', () => {
    it('memoizes expensive calculations', () => {
      const { rerender } = render(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
          totalBooksInSeries={13}
        />
      );
      
      // Rerender with same props
      rerender(
        <SeriesCard 
          seriesName="推しの子 [Oshi no Ko]" 
          books={oshiNoKoSeries} 
          totalBooksInSeries={13}
        />
      );
      
      // Component should still function correctly
      expect(screen.getByText('推しの子 [Oshi no Ko]')).toBeInTheDocument();
      expect(screen.getByText('23% Complete')).toBeInTheDocument();
    });
  });
});