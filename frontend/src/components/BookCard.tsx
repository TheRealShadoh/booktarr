/**
 * Enhanced BookCard component with Sonarr-inspired styling
 */
import React, { useState } from 'react';
import { Book } from '../types';

interface BookCardProps {
  book: Book;
  onClick?: (book: Book) => void;
  viewMode?: 'grid' | 'list';
}

const BookCard: React.FC<BookCardProps> = ({ book, onClick, viewMode = 'grid' }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick(book);
    }
  };

  const formatAuthors = (authors: string[]) => {
    if (authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors[0]} et al.`;
  };

  const formatPublishedDate = (date: string | Date | null | undefined) => {
    if (!date) return 'Unknown';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.getFullYear().toString();
    } catch {
      return 'Unknown';
    }
  };

  const getSeriesInfo = (): string | undefined => {
    if (!book.series) return undefined;
    if (book.series_position) {
      return `${book.series} #${book.series_position}`;
    }
    return book.series;
  };

  const formatPrice = (price: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  if (viewMode === 'list') {
    return (
      <div className="booktarr-book-card flex p-4 space-x-4 hover:bg-booktarr-hover transition-colors cursor-pointer" onClick={handleClick}>
        <div className="flex-shrink-0 w-16 h-24 relative">
          {book.thumbnail_url && !imageError ? (
            <img 
              src={book.thumbnail_url} 
              alt={book.title}
              className="w-full h-full object-cover rounded"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full bg-booktarr-surface2 border border-booktarr-border rounded flex items-center justify-center">
              <svg className="w-8 h-8 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="booktarr-book-title text-base font-semibold text-booktarr-text mb-1 truncate" title={book.title}>
            {book.title}
          </h3>
          
          <p className="booktarr-book-author text-sm text-booktarr-textSecondary mb-2 truncate" title={formatAuthors(book.authors)}>
            {formatAuthors(book.authors)}
          </p>
          
          <div className="flex items-center space-x-4 text-sm text-booktarr-textMuted">
            <span>{formatPublishedDate(book.published_date)}</span>
            {getSeriesInfo() && (
              <span className="text-booktarr-accent truncate" title={getSeriesInfo()}>
                {getSeriesInfo()}
              </span>
            )}
            {book.page_count && (
              <span>{book.page_count} pages</span>
            )}
          </div>
          
          {book.categories && book.categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {book.categories.slice(0, 3).map((category, index) => (
                <span 
                  key={index} 
                  className="px-2 py-1 bg-booktarr-surface2 text-booktarr-textSecondary text-xs rounded-full border border-booktarr-border"
                >
                  {category}
                </span>
              ))}
              {book.categories.length > 3 && (
                <span className="px-2 py-1 bg-booktarr-surface2 text-booktarr-textSecondary text-xs rounded-full border border-booktarr-border">
                  +{book.categories.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="booktarr-book-card group cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative overflow-hidden rounded-t-lg">
        {book.thumbnail_url && !imageError ? (
          <div className="relative">
            <img 
              src={book.thumbnail_url} 
              alt={book.title}
              className={`booktarr-book-cover transition-all duration-300 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 bg-booktarr-surface2 animate-pulse flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-booktarr-accent border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        ) : (
          <div className="booktarr-book-cover bg-booktarr-surface2 border border-booktarr-border flex items-center justify-center">
            <div className="text-center p-4">
              <svg className="w-12 h-12 text-booktarr-textMuted mb-2 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-xs text-booktarr-textMuted line-clamp-2">{book.title}</p>
            </div>
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-8 h-8 text-white mb-2 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <p className="text-white text-sm">View Details</p>
          </div>
        </div>

        {/* Quality/Status indicators */}
        <div className="absolute top-2 right-2 flex flex-col space-y-1">
          {book.series && (
            <div className="bg-booktarr-accent text-white px-2 py-1 rounded-full text-xs font-medium">
              Series
            </div>
          )}
          {book.categories && book.categories.length > 0 && (
            <div className="bg-booktarr-surface bg-opacity-90 text-booktarr-text px-2 py-1 rounded-full text-xs">
              {book.categories[0]}
            </div>
          )}
        </div>
      </div>
      
      <div className="booktarr-book-info">
        <h3 className="booktarr-book-title" title={book.title}>
          {book.title}
        </h3>
        
        <p className="booktarr-book-author" title={formatAuthors(book.authors)}>
          {formatAuthors(book.authors)}
        </p>
        
        <div className="flex items-center justify-between text-xs text-booktarr-textMuted mt-2">
          <span>{formatPublishedDate(book.published_date)}</span>
          {book.page_count && (
            <span>{book.page_count}p</span>
          )}
        </div>
        
        {getSeriesInfo() && (
          <div className="booktarr-book-series mt-2 font-medium" title={getSeriesInfo()}>
            {getSeriesInfo()}
          </div>
        )}

        {book.pricing && book.pricing.length > 0 && (
          <div className="mt-2 text-xs text-booktarr-success font-medium">
            {formatPrice(book.pricing[0].price, book.pricing[0].currency)}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookCard;