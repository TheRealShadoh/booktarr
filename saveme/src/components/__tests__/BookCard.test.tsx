/**
 * Tests for BookCard component
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BookCard from '../BookCard';
import { Book, MetadataSource } from '../../types';

const mockBook: Book = {
  isbn: '9780439139595',
  title: 'Harry Potter and the Goblet of Fire',
  authors: ['J.K. Rowling'],
  series: 'Harry Potter',
  series_position: 4,
  publisher: 'Scholastic',
  published_date: '2000-07-08',
  page_count: 734,
  language: 'en',
  thumbnail_url: 'https://example.com/cover.jpg',
  description: 'The fourth book in the Harry Potter series.',
  categories: ['Fantasy', 'Young Adult'],
  pricing: [
    {
      source: 'Google Books',
      price: 12.99,
      currency: 'USD',
      last_updated: '2023-01-01T00:00:00Z'
    }
  ],
  metadata_source: MetadataSource.GOOGLE_BOOKS,
  added_date: '2023-01-01T00:00:00Z',
  last_updated: '2023-01-01T00:00:00Z'
};

describe('BookCard', () => {
  it('renders book information correctly', () => {
    render(<BookCard book={mockBook} />);
    
    expect(screen.getByText('Harry Potter and the Goblet of Fire')).toBeInTheDocument();
    expect(screen.getByText('J.K. Rowling')).toBeInTheDocument();
    expect(screen.getByText('Harry Potter #4')).toBeInTheDocument();
    expect(screen.getByText('734 pages')).toBeInTheDocument();
    expect(screen.getByText('2000')).toBeInTheDocument();
    expect(screen.getByText('$12.99')).toBeInTheDocument();
  });

  it('handles multiple authors correctly', () => {
    const bookWithMultipleAuthors = {
      ...mockBook,
      authors: ['Author One', 'Author Two', 'Author Three']
    };
    
    render(<BookCard book={bookWithMultipleAuthors} />);
    
    expect(screen.getByText('Author One & 2 others')).toBeInTheDocument();
  });

  it('handles missing optional fields', () => {
    const minimalBook = {
      ...mockBook,
      series: undefined,
      series_position: undefined,
      page_count: undefined,
      published_date: undefined,
      pricing: [],
      categories: []
    };
    
    render(<BookCard book={minimalBook} />);
    
    expect(screen.getByText('Harry Potter and the Goblet of Fire')).toBeInTheDocument();
    expect(screen.getByText('J.K. Rowling')).toBeInTheDocument();
    expect(screen.queryByText('Harry Potter #4')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const mockOnClick = jest.fn();
    
    render(<BookCard book={mockBook} onClick={mockOnClick} />);
    
    fireEvent.click(screen.getByText('Harry Potter and the Goblet of Fire'));
    expect(mockOnClick).toHaveBeenCalledWith(mockBook);
  });

  it('handles image loading error', () => {
    render(<BookCard book={mockBook} />);
    
    const image = screen.getByRole('img');
    fireEvent.error(image);
    
    expect(image).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));
  });
});