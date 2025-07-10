/**
 * Enhanced SeriesGroup component with Sonarr-inspired styling
 */
import React, { useState } from 'react';
import BookCard from './BookCard';
import { Book } from '../types';

interface SeriesGroupProps {
  seriesName: string;
  books: Book[];
  expanded?: boolean;
  onToggle?: (seriesName: string) => void;
  viewMode?: 'grid' | 'list';
  onBookClick?: (book: Book) => void;
}

const SeriesGroup: React.FC<SeriesGroupProps> = ({ 
  seriesName, 
  books, 
  expanded = true,
  onToggle,
  viewMode = 'grid',
  onBookClick
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  
  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggle?.(seriesName);
  };

  const sortedBooks = [...books].sort((a, b) => {
    // Sort by series position first, then by title
    if (a.series_position && b.series_position) {
      return a.series_position - b.series_position;
    }
    if (a.series_position && !b.series_position) return -1;
    if (!a.series_position && b.series_position) return 1;
    return a.title.localeCompare(b.title);
  });

  const getSeriesStats = () => {
    const totalBooks = books.length;
    const withPositions = books.filter(book => book.series_position).length;
    const averagePages = books.reduce((sum, book) => sum + (book.page_count || 0), 0) / totalBooks;
    const authors = new Set(books.flatMap(book => book.authors));
    
    return {
      totalBooks,
      withPositions,
      averagePages: Math.round(averagePages),
      uniqueAuthors: authors.size
    };
  };

  const stats = getSeriesStats();

  return (
    <div className="booktarr-series-section">
      <div 
        onClick={toggleExpanded}
        className="booktarr-series-header group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg 
              className={`w-5 h-5 booktarr-series-toggle transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div>
              <h2 className="booktarr-series-title">
                {seriesName}
              </h2>
              {!isExpanded && (
                <div className="text-xs text-booktarr-textMuted mt-1">
                  {stats.uniqueAuthors} author{stats.uniqueAuthors !== 1 ? 's' : ''} • {stats.averagePages} avg pages
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="booktarr-series-count">
              {books.length} book{books.length !== 1 ? 's' : ''}
            </span>
            {stats.withPositions > 0 && (
              <span className="px-2 py-1 bg-booktarr-accent text-white text-xs rounded-full">
                #{stats.withPositions}
              </span>
            )}
          </div>
        </div>
        
        {/* Progress bar for series completion */}
        {!isExpanded && stats.withPositions > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-booktarr-textMuted mb-1">
              <span>Series Progress</span>
              <span>{stats.withPositions}/{stats.totalBooks} books</span>
            </div>
            <div className="w-full bg-booktarr-surface rounded-full h-2">
              <div 
                className="bg-booktarr-accent h-2 rounded-full transition-all duration-500"
                style={{ width: `${(stats.withPositions / stats.totalBooks) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Quick preview of first few books when collapsed */}
        {!isExpanded && books.length > 0 && (
          <div className="mt-3 flex items-center space-x-2 text-sm text-booktarr-textMuted">
            <span>Latest:</span>
            <span className="truncate">
              {sortedBooks.slice(0, 2).map(book => book.title).join(', ')}
              {books.length > 2 && ` +${books.length - 2} more`}
            </span>
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className="animate-slide-up">
          {viewMode === 'grid' ? (
            <div className="booktarr-book-grid">
              {sortedBooks.map(book => (
                <BookCard 
                  key={book.isbn} 
                  book={book} 
                  onClick={onBookClick}
                  viewMode={viewMode}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedBooks.map(book => (
                <BookCard 
                  key={book.isbn} 
                  book={book} 
                  onClick={onBookClick}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
          
          {/* Series summary */}
          {isExpanded && (
            <div className="mt-6 p-4 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
              <h4 className="text-sm font-semibold text-booktarr-text mb-2">Series Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-booktarr-textMuted">Total Books</span>
                  <p className="text-booktarr-text font-medium">{stats.totalBooks}</p>
                </div>
                <div>
                  <span className="text-booktarr-textMuted">Numbered</span>
                  <p className="text-booktarr-text font-medium">{stats.withPositions}</p>
                </div>
                <div>
                  <span className="text-booktarr-textMuted">Authors</span>
                  <p className="text-booktarr-text font-medium">{stats.uniqueAuthors}</p>
                </div>
                <div>
                  <span className="text-booktarr-textMuted">Avg Pages</span>
                  <p className="text-booktarr-text font-medium">{stats.averagePages}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SeriesGroup;