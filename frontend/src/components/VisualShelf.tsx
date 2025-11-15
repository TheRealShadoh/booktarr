/**
 * Visual Shelf Component
 * Displays books in a gallery/shelf view emphasizing cover art, similar to Goodreads shelf view
 */
import React, { useMemo, useState } from 'react';
import { Book } from '../types';
import LazyImage from './LazyImage';

interface VisualShelfProps {
  books: Book[];
  onBookClick?: (book: Book) => void;
  onBookSelect?: (book: Book, selected: boolean) => void;
  selectedBooks?: Set<number>;
  title?: string;
  subtitle?: string;
  sortBy?: 'title' | 'author' | 'published_date' | 'rating' | 'added_date';
  filterBy?: string;
}

type SortOption = 'title' | 'author' | 'published_date' | 'rating' | 'added_date';

const VisualShelf: React.FC<VisualShelfProps> = ({
  books,
  onBookClick,
  onBookSelect,
  selectedBooks = new Set(),
  title = 'Book Collection',
  subtitle = 'Visual gallery view of your collection',
  sortBy = 'title',
  filterBy = ''
}) => {
  const [currentSortBy, setCurrentSortBy] = useState<SortOption>(sortBy);
  const [viewDensity, setViewDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable');

  const sortedAndFilteredBooks = useMemo(() => {
    let filtered = books;

    // Apply filter
    if (filterBy) {
      const searchLower = filterBy.toLowerCase();
      filtered = books.filter(book =>
        book.title.toLowerCase().includes(searchLower) ||
        book.authors.some(a => a.toLowerCase().includes(searchLower))
      );
    }

    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      switch (currentSortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'author':
          return (a.authors[0] || '').localeCompare(b.authors[0] || '');
        case 'published_date':
          const dateA = new Date(a.published_date || 0).getTime();
          const dateB = new Date(b.published_date || 0).getTime();
          return dateB - dateA; // Newest first
        case 'rating':
          return (b.rating || 0) - (a.rating || 0); // Highest rated first
        case 'added_date':
          return (new Date(b.created_at || 0).getTime()) - (new Date(a.created_at || 0).getTime()); // Newest first
        default:
          return 0;
      }
    });

    return sorted;
  }, [books, filterBy, currentSortBy]);

  const gridColsClass = {
    compact: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
    comfortable: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    spacious: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
  };

  const gapClass = {
    compact: 'gap-3',
    comfortable: 'gap-4',
    spacious: 'gap-6'
  };

  const handleBookClick = (book: Book) => {
    if (onBookClick) {
      onBookClick(book);
    }
  };

  const handleBookSelect = (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    if (onBookSelect) {
      const isSelected = selectedBooks.has(book.id);
      onBookSelect(book, !isSelected);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-booktarr-text">{title}</h1>
          {subtitle && (
            <p className="text-booktarr-textSecondary text-sm mt-1">{subtitle}</p>
          )}
          <p className="text-booktarr-textMuted text-xs mt-2">
            {sortedAndFilteredBooks.length} book{sortedAndFilteredBooks.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-booktarr-surface p-3 rounded-lg border border-booktarr-border">
          {/* Sort Controls */}
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-sm text-booktarr-textSecondary">Sort by:</span>
            <div className="flex gap-1 flex-wrap">
              {(['title', 'author', 'published_date', 'rating'] as SortOption[]).map(option => (
                <button
                  key={option}
                  onClick={() => setCurrentSortBy(option)}
                  className={`text-xs px-3 py-1 rounded transition-colors ${
                    currentSortBy === option
                      ? 'bg-booktarr-accent text-white'
                      : 'bg-booktarr-surface2 text-booktarr-text hover:bg-booktarr-surface3'
                  }`}
                >
                  {option === 'published_date' ? 'Release Date' : option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Density Controls */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-booktarr-textSecondary">Density:</span>
            <div className="flex gap-1">
              {(['compact', 'comfortable', 'spacious'] as const).map(density => (
                <button
                  key={density}
                  onClick={() => setViewDensity(density)}
                  className={`text-xs px-3 py-1 rounded transition-colors ${
                    viewDensity === density
                      ? 'bg-booktarr-accent text-white'
                      : 'bg-booktarr-surface2 text-booktarr-text hover:bg-booktarr-surface3'
                  }`}
                  title={`${density.charAt(0).toUpperCase() + density.slice(1)} view`}
                >
                  {density === 'compact' ? '◾◾◾◾◾◾' : density === 'comfortable' ? '◾◾◾◾◾' : '◾◾◾◾'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Books Grid */}
      {sortedAndFilteredBooks.length > 0 ? (
        <div className={`grid ${gridColsClass[viewDensity]} ${gapClass[viewDensity]} w-full`}>
          {sortedAndFilteredBooks.map((book) => {
            const isSelected = selectedBooks.has(book.id);
            return (
              <div
                key={book.id}
                onClick={() => handleBookClick(book)}
                className="group relative cursor-pointer"
              >
                {/* Book Cover Container */}
                <div className="relative bg-booktarr-surface border border-booktarr-border rounded-lg overflow-hidden hover:border-booktarr-accent transition-all duration-200 hover:shadow-lg">
                  {/* Cover Image */}
                  <div className={`relative w-full ${viewDensity === 'spacious' ? 'pt-[150%]' : 'pt-[150%]'} bg-booktarr-surface2 overflow-hidden`}>
                    {(book.cover_url || book.thumbnail_url) ? (
                      <LazyImage
                        src={book.cover_url || book.thumbnail_url || ''}
                        alt={book.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        width={200}
                        height={300}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-booktarr-surface to-booktarr-surface2">
                        <svg className="w-12 h-12 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}

                    {/* Rating Badge */}
                    {book.rating && book.rating > 0 && (
                      <div className="absolute top-2 right-2 bg-booktarr-accent text-white px-2 py-1 rounded text-xs font-semibold">
                        ★ {book.rating.toFixed(1)}
                      </div>
                    )}

                    {/* Selection Checkbox */}
                    {onBookSelect && (
                      <button
                        onClick={(e) => handleBookSelect(e, book)}
                        className="absolute top-2 left-2 w-5 h-5 bg-booktarr-surface2 border-2 border-booktarr-accent rounded transition-all hover:bg-booktarr-accent hover:scale-110"
                      >
                        {isSelected && (
                          <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="text-white text-center px-2">
                        <p className="text-xs font-semibold truncate">{book.title}</p>
                        <p className="text-xs opacity-80">{book.authors[0] || 'Unknown Author'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Info Section - Only for spacious view */}
                  {viewDensity === 'spacious' && (
                    <div className="p-2 min-h-16">
                      <h3 className="text-xs font-semibold text-booktarr-text line-clamp-2 mb-1">{book.title}</h3>
                      <p className="text-xs text-booktarr-textMuted line-clamp-1">{book.authors[0] || 'Unknown'}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-lg font-semibold text-booktarr-text mb-2">No books found</h3>
          <p className="text-sm text-booktarr-textSecondary">
            {filterBy ? 'Try adjusting your search filters' : 'Start adding books to see them here'}
          </p>
        </div>
      )}
    </div>
  );
};

export default VisualShelf;
