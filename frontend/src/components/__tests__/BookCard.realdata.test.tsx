/**
 * Enhanced BookCard component tests using real data patterns from HandyLib.csv
 * These tests verify component behavior with actual book data structures
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookCard from '../BookCard';
import { Book, ReadingStatus, MetadataSource } from '../../types';

// Real data patterns extracted from HandyLib.csv
const realBookData: Book[] = [
  {
    isbn: '9781975363178',
    title: '[Oshi No Ko], Vol. 1 (Volume 1) ([Oshi No Ko], 1)',
    authors: ['Akasaka, Aka', 'Yokoyari, Mengo', 'Yokoyari, Mengo', 'Blackman, Abigail'],
    series: '推しの子 [Oshi no Ko]',
    series_position: 1,
    publisher: 'Yen Press',
    published_date: '2023-01-17',
    page_count: 228,
    language: 'English',
    thumbnail_url: 'https://m.media-amazon.com/images/I/51jhRrffW5L._SL500_.jpg',
    cover_url: 'https://m.media-amazon.com/images/I/51jhRrffW5L._SL500_.jpg',
    description: 'In show business, lies are a weapon. Gorou is an ob-gyn with a life far removed from the glitz and glamour of the entertainment industry―the world of his favorite idol, rising star Ai Hoshino. But when the two are unexpectedly brought together, their fates become intertwined in ways that defy all reason. For the good doctor, it\'s time to stan(d) and deliver!',
    categories: ['Fantasy'],
    pricing: [
      {
        source: 'Amazon',
        price: 8.59,
        currency: 'USD',
        last_updated: '2025-07-18T00:00:00Z'
      }
    ],
    metadata_source: MetadataSource.AMAZON,
    added_date: '2025-07-18T00:00:00Z',
    last_updated: '2025-07-18T00:00:00Z',
    reading_status: ReadingStatus.UNREAD,
    personal_rating: 4.24,
    times_read: 0
  },
  {
    isbn: '9781975363192',
    title: '[Oshi No Ko], Vol. 2 (Volume 2) ([Oshi No Ko], 2)',
    authors: ['Akasaka, Aka', 'Yokoyari, Mengo', 'Neufeld, Sarah'],
    series: '推しの子 [Oshi no Ko]',
    series_position: 2,
    publisher: 'Yen Press',
    published_date: '2023-05-23',
    page_count: 194,
    language: 'English',
    thumbnail_url: 'https://m.media-amazon.com/images/I/51QoSmYxGwL._SL500_.jpg',
    cover_url: 'https://m.media-amazon.com/images/I/51QoSmYxGwL._SL500_.jpg',
    description: 'Ten years after the murder of pop idol Ai Hoshino, her young (and unusually mature) twins are now poised to enter high school.',
    categories: ['Fantasy'],
    pricing: [
      {
        source: 'Amazon',
        price: 10.40,
        currency: 'USD',
        last_updated: '2025-07-18T00:00:00Z'
      }
    ],
    metadata_source: MetadataSource.AMAZON,
    added_date: '2025-07-18T00:00:00Z',
    last_updated: '2025-07-18T00:00:00Z',
    reading_status: ReadingStatus.READING,
    reading_progress_percentage: 65,
    reading_progress_pages: 126,
    personal_rating: 4.23,
    times_read: 0
  },
  {
    isbn: '9781975363215',
    title: '[Oshi No Ko], Vol. 3 (Volume 3) ([Oshi No Ko], 3)',
    authors: ['Akasaka, Aka', 'Yokoyari, Mengo', 'Blackman, Abigail', 'Engel, Taylor'],
    series: '推しの子 [Oshi no Ko]',
    series_position: 3,
    publisher: 'Yen Press',
    published_date: '2023-08-22',
    page_count: 194,
    language: 'English',
    thumbnail_url: 'https://m.media-amazon.com/images/I/51K82bGqk3L._SL500_.jpg',
    cover_url: 'https://m.media-amazon.com/images/I/51K82bGqk3L._SL500_.jpg',
    description: 'Hoping to glean more information about his father, Aqua agrees to join the dating reality show We\'re About to Fall in Love for Real!',
    categories: ['Romance'],
    pricing: [
      {
        source: 'Amazon',
        price: 11.11,
        currency: 'USD',
        last_updated: '2025-07-18T00:00:00Z'
      }
    ],
    metadata_source: MetadataSource.AMAZON,
    added_date: '2025-07-18T00:00:00Z',
    last_updated: '2025-07-18T00:00:00Z',
    reading_status: ReadingStatus.READ,
    personal_rating: 4.34,
    times_read: 1
  }
];

describe('BookCard with Real Data Patterns', () => {
  describe('Manga series with Japanese titles', () => {
    it('renders Oshi no Ko Vol. 1 correctly with multiple authors', () => {
      const book = realBookData[0];
      render(<BookCard book={book} viewMode="grid" />);
      
      // Check title rendering
      expect(screen.getByText('[Oshi No Ko], Vol. 1 (Volume 1) ([Oshi No Ko], 1)')).toBeInTheDocument();
      
      // Check author formatting (should show "Akasaka, Aka et al." for multiple authors)
      expect(screen.getByText('Akasaka, Aka et al.')).toBeInTheDocument();
      
      // Check series information with Japanese characters
      expect(screen.getByText('推しの子 [Oshi no Ko] #1')).toBeInTheDocument();
      
      // Check publication year
      expect(screen.getByText('2023')).toBeInTheDocument();
      
      // Check page count
      expect(screen.getByText('228p')).toBeInTheDocument();
      
      // Check price formatting
      expect(screen.getByText('$8.59')).toBeInTheDocument();
      
      // Check category display
      expect(screen.getByText('Fantasy')).toBeInTheDocument();
    });

    it('displays reading progress for currently reading book', () => {
      const book = realBookData[1]; // Vol. 2 - currently reading
      render(<BookCard book={book} viewMode="grid" />);
      
      // Check reading status badge
      expect(screen.getByText('Reading')).toBeInTheDocument();
      
      // Check that progress bar is rendered (looking for progress-related elements)
      const progressElements = screen.getAllByRole('progressbar', { hidden: true });
      expect(progressElements.length).toBeGreaterThan(0);
    });

    it('shows star rating for completed book', () => {
      const book = realBookData[2]; // Vol. 3 - completed
      render(<BookCard book={book} viewMode="grid" />);
      
      // Check reading status
      expect(screen.getByText('Read')).toBeInTheDocument();
      
      // Check that star rating is displayed
      const starElements = document.querySelectorAll('[data-testid^="star-"]');
      expect(starElements.length).toBeGreaterThan(0);
      
      // Check times read counter
      expect(screen.getByText('Read once')).toBeInTheDocument();
    });
  });

  describe('List view mode with real data', () => {
    it('renders compact list view with all essential information', () => {
      const book = realBookData[0];
      render(<BookCard book={book} viewMode="list" />);
      
      // Check that compact image is rendered
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
      expect(images[0]).toHaveClass('w-16', 'h-24');
      
      // Check that all information is still accessible
      expect(screen.getByText('[Oshi No Ko], Vol. 1 (Volume 1) ([Oshi No Ko], 1)')).toBeInTheDocument();
      expect(screen.getByText('Akasaka, Aka et al.')).toBeInTheDocument();
      expect(screen.getByText('推しの子 [Oshi no Ko] #1')).toBeInTheDocument();
      expect(screen.getByText('228 pages')).toBeInTheDocument();
    });

    it('handles category display in list view', () => {
      const book = realBookData[0];
      render(<BookCard book={book} viewMode="list" />);
      
      // Categories should be displayed as badges in list view
      expect(screen.getByText('Fantasy')).toBeInTheDocument();
    });
  });

  describe('Image handling with real URLs', () => {
    it('loads actual Amazon cover image URLs', () => {
      const book = realBookData[0];
      render(<BookCard book={book} />);
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', 'https://m.media-amazon.com/images/I/51jhRrffW5L._SL500_.jpg');
      expect(image).toHaveAttribute('alt', '[Oshi No Ko], Vol. 1 (Volume 1) ([Oshi No Ko], 1)');
    });

    it('handles image loading states properly', async () => {
      const book = realBookData[0];
      render(<BookCard book={book} />);
      
      const image = screen.getByRole('img');
      
      // Initially image should be loading (opacity-0)
      expect(image).toHaveClass('opacity-0');
      
      // Simulate image load
      fireEvent.load(image);
      
      await waitFor(() => {
        expect(image).toHaveClass('opacity-100');
      });
    });

    it('shows fallback for broken image URLs', async () => {
      const book = { ...realBookData[0], cover_url: 'invalid-url' };
      render(<BookCard book={book} />);
      
      const image = screen.getByRole('img');
      
      // Simulate image error
      fireEvent.error(image);
      
      await waitFor(() => {
        // Should show SVG fallback
        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe('Interactive behaviors', () => {
    it('calls onClick handler with correct book data', () => {
      const mockOnClick = jest.fn();
      const book = realBookData[0];
      
      render(<BookCard book={book} onClick={mockOnClick} />);
      
      // Click on the card
      fireEvent.click(screen.getByText(book.title));
      
      expect(mockOnClick).toHaveBeenCalledWith(book);
    });

    it('shows hover effects on card interaction', () => {
      const book = realBookData[0];
      render(<BookCard book={book} />);
      
      const card = document.querySelector('.booktarr-book-card');
      expect(card).toBeInTheDocument();
      
      // Check that hover classes are present
      expect(card).toHaveClass('group', 'cursor-pointer');
    });
  });

  describe('Data edge cases from real CSV', () => {
    it('handles books with no series information', () => {
      const bookWithoutSeries = {
        ...realBookData[0],
        series: undefined,
        series_position: undefined
      };
      
      render(<BookCard book={bookWithoutSeries} />);
      
      // Should not show series information
      expect(screen.queryByText(/推しの子/)).not.toBeInTheDocument();
      expect(screen.queryByText(/#\d+/)).not.toBeInTheDocument();
    });

    it('handles books with missing page count', () => {
      const bookWithoutPages = {
        ...realBookData[0],
        page_count: undefined
      };
      
      render(<BookCard book={bookWithoutPages} />);
      
      // Should not show page count
      expect(screen.queryByText(/\d+p/)).not.toBeInTheDocument();
    });

    it('handles books with no pricing information', () => {
      const bookWithoutPricing = {
        ...realBookData[0],
        pricing: []
      };
      
      render(<BookCard book={bookWithoutPricing} />);
      
      // Should not show pricing
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });

    it('handles books with empty categories array', () => {
      const bookWithoutCategories = {
        ...realBookData[0],
        categories: []
      };
      
      render(<BookCard book={bookWithoutCategories} />);
      
      // Should not show category badges
      expect(screen.queryByText('Fantasy')).not.toBeInTheDocument();
    });

    it('formats complex author lists correctly', () => {
      // Test with the 4-author book from real data
      const book = realBookData[0]; // Has 4 authors
      render(<BookCard book={book} />);
      
      // Should show "First Author et al." for more than 3 authors
      expect(screen.getByText('Akasaka, Aka et al.')).toBeInTheDocument();
    });

    it('handles unusual publication date formats', () => {
      const bookWithDateObject = {
        ...realBookData[0],
        published_date: new Date('2023-01-17').toISOString().split('T')[0]
      };
      
      render(<BookCard book={bookWithDateObject} />);
      
      expect(screen.getByText('2023')).toBeInTheDocument();
    });
  });

  describe('Reading status and progress features', () => {
    it('displays different reading statuses correctly', () => {
      // Test each reading status
      const statuses = [
        { book: { ...realBookData[0], reading_status: ReadingStatus.UNREAD }, expected: 'Unread' },
        { book: { ...realBookData[1], reading_status: ReadingStatus.READING }, expected: 'Reading' },
        { book: { ...realBookData[2], reading_status: ReadingStatus.READ }, expected: 'Read' },
        { book: { ...realBookData[0], reading_status: ReadingStatus.WANT_TO_READ }, expected: 'Want to Read' }
      ];

      statuses.forEach(({ book, expected }) => {
        const { unmount } = render(<BookCard book={book} />);
        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });

    it('shows reading progress only for books being read', () => {
      const readingBook = realBookData[1]; // Currently reading with progress
      render(<BookCard book={readingBook} />);
      
      // Should show progress bar
      const progressBars = screen.getAllByRole('progressbar', { hidden: true });
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('shows rating only for completed books', () => {
      const completedBook = realBookData[2]; // Completed with rating
      render(<BookCard book={completedBook} />);
      
      // Should show star rating
      const starElements = document.querySelectorAll('[data-testid^="star-"]');
      expect(starElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility features', () => {
    it('provides proper alt text for images', () => {
      const book = realBookData[0];
      render(<BookCard book={book} />);
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', book.title);
    });

    it('provides title attributes for truncated text', () => {
      const book = realBookData[0];
      render(<BookCard book={book} />);
      
      // Title should have title attribute for truncation
      const titleElement = screen.getByTitle(book.title);
      expect(titleElement).toBeInTheDocument();
      
      // Authors should have title attribute
      const authorElement = screen.getByTitle('Akasaka, Aka et al.');
      expect(authorElement).toBeInTheDocument();
    });

    it('maintains keyboard navigation support', () => {
      const book = realBookData[0];
      render(<BookCard book={book} />);
      
      const card = document.querySelector('.booktarr-book-card');
      expect(card).toHaveClass('cursor-pointer');
      
      // Should be focusable for keyboard navigation
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });
});