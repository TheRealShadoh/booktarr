/**
 * Enhanced BookCard component with Sonarr-inspired styling and reading progress
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Book, ReadingStatus } from '../types';
import ReadingStatusBadge from './ReadingStatusBadge';
import ReadingProgressBar from './ReadingProgressBar';
import StarRating from './StarRating';

interface BookCardProps {
  book: Book;
  onClick?: (book: Book) => void;
  viewMode?: 'grid' | 'list';
  className?: string;
}

const BookCard: React.FC<BookCardProps> = React.memo(({ book, onClick, viewMode = 'grid', className = '' }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(book);
    }
  }, [onClick, book]);

  const formatAuthors = useMemo(() => {
    const authors = book.authors;
    if (authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors[0]} et al.`;
  }, [book.authors]);

  const formattedPublishedDate = useMemo(() => {
    const date = book.published_date;
    if (!date) return 'Unknown';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.getFullYear().toString();
    } catch {
      return 'Unknown';
    }
  }, [book.published_date]);

  const seriesInfo = useMemo((): string | undefined => {
    if (!book.series) return undefined;
    if (book.series_position) {
      return `${book.series} #${book.series_position}`;
    }
    return book.series;
  }, [book.series, book.series_position]);

  const formatPrice = (price: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  if (viewMode === 'list') {
    return (
      <article 
        className="booktarr-book-card flex p-4 space-x-4 hover:bg-booktarr-hover transition-colors cursor-pointer" 
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${book.title} by ${formatAuthors}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <div className="flex-shrink-0 w-16 h-24 relative">
          {(book.cover_url || book.thumbnail_url) && !imageError ? (
            <img 
              src={book.cover_url || book.thumbnail_url} 
              alt={book.title}
              className="w-full h-full object-cover rounded"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full bg-booktarr-surface2 border border-booktarr-border rounded flex items-center justify-center grayscale">
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
          
          <p className="booktarr-book-author text-sm text-booktarr-textSecondary mb-2 truncate" title={formatAuthors}>
            {formatAuthors}
          </p>
          
          <div className="flex items-center space-x-4 text-sm text-booktarr-textMuted mb-2">
            <ReadingStatusBadge status={book.reading_status || ReadingStatus.UNREAD} />
            <span>{formattedPublishedDate}</span>
            {seriesInfo && (
              <span className="text-booktarr-accent truncate" title={seriesInfo}>
                {seriesInfo}
              </span>
            )}
            {book.page_count && (
              <span>{book.page_count} pages</span>
            )}
          </div>

          {/* Reading progress for currently reading books */}
          {book.reading_status === ReadingStatus.READING && (book.reading_progress_percentage || book.reading_progress_pages) && (
            <div className="mb-2">
              <ReadingProgressBar
                percentage={book.reading_progress_percentage}
                currentPage={book.reading_progress_pages}
                totalPages={book.page_count}
                size="small"
              />
            </div>
          )}

          {/* Star rating for read books */}
          {book.reading_status === ReadingStatus.READ && book.personal_rating && book.personal_rating > 0 && (
            <div className="mb-2">
              <StarRating
                rating={book.personal_rating}
                readonly={true}
                size="small"
                showText={true}
              />
            </div>
          )}
          
          {book.categories && book.categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {book.categories.slice(0, 3).map((category, index) => (
                <span 
                  key={`${book.isbn}-category-${index}-${category}`} 
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
      </article>
    );
  }

  return (
    <article 
      className={`booktarr-book-card group cursor-pointer ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${book.title} by ${formatAuthors}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="relative overflow-hidden rounded-t-lg">
        {(book.cover_url || book.thumbnail_url) && !imageError ? (
          <div className="relative">
            <img 
              src={book.cover_url || book.thumbnail_url} 
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
          <div className="booktarr-book-cover bg-booktarr-surface2 border border-booktarr-border flex items-center justify-center grayscale">
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
          <ReadingStatusBadge 
            status={book.reading_status || ReadingStatus.UNREAD} 
            className="bg-opacity-90 backdrop-blur-sm"
          />
          {book.series && (
            <div className="bg-booktarr-accent text-white px-2 py-1 rounded-full text-xs font-medium bg-opacity-90 backdrop-blur-sm">
              Series
            </div>
          )}
          {book.categories && book.categories.length > 0 && (
            <div className="bg-booktarr-surface bg-opacity-90 text-booktarr-text px-2 py-1 rounded-full text-xs backdrop-blur-sm">
              {book.categories[0]}
            </div>
          )}
        </div>

        {/* Reading progress bar overlay for currently reading books */}
        {book.reading_status === ReadingStatus.READING && book.reading_progress_percentage && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent">
            <ReadingProgressBar
              percentage={book.reading_progress_percentage}
              currentPage={book.reading_progress_pages}
              totalPages={book.page_count}
              size="small"
              showText={false}
              className="opacity-90"
            />
          </div>
        )}
      </div>
      
      <div className="booktarr-book-info">
        <h3 className="booktarr-book-title" title={book.title}>
          {book.title}
        </h3>
        
        <p className="booktarr-book-author" title={formatAuthors}>
          {formatAuthors}
        </p>
        
        <div className="flex items-center justify-between text-xs text-booktarr-textMuted mt-2">
          <span>{formattedPublishedDate}</span>
          {book.page_count && (
            <span>{book.page_count}p</span>
          )}
        </div>
        
        {seriesInfo && (
          <div className="booktarr-book-series mt-2 font-medium" title={seriesInfo}>
            {seriesInfo}
          </div>
        )}

        {book.pricing && book.pricing.length > 0 && (
          <div className="mt-2 text-xs text-booktarr-success font-medium">
            {formatPrice(book.pricing[0].price, book.pricing[0].currency)}
          </div>
        )}

        {/* Reading progress for currently reading books */}
        {book.reading_status === ReadingStatus.READING && (book.reading_progress_percentage || book.reading_progress_pages) && (
          <div className="mt-2">
            <ReadingProgressBar
              percentage={book.reading_progress_percentage}
              currentPage={book.reading_progress_pages}
              totalPages={book.page_count}
              size="small"
              showText={false}
            />
          </div>
        )}

        {/* Star rating for read books */}
        {book.reading_status === ReadingStatus.READ && book.personal_rating && book.personal_rating > 0 && (
          <div className="mt-2">
            <StarRating
              rating={book.personal_rating}
              readonly={true}
              size="small"
            />
          </div>
        )}

        {/* Reading times counter */}
        {book.times_read > 0 && (
          <div className="mt-1 text-xs text-booktarr-textMuted">
            {book.times_read === 1 ? 'Read once' : `Read ${book.times_read} times`}
          </div>
        )}
      </div>
    </article>
  );
});

export default BookCard;