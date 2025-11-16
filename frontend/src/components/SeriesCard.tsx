/**
 * SeriesCard component - Grid view for series similar to BookCard
 * Optimized with React.memo to prevent unnecessary re-renders
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Book } from '../types';

interface SeriesCardProps {
  seriesName: string;
  books: Book[];
  totalBooksInSeries?: number;
  onClick?: (seriesName: string) => void;
  className?: string;
  viewMode?: 'grid' | 'list';
}

const SeriesCard: React.FC<SeriesCardProps> = React.memo(({ seriesName, books, totalBooksInSeries, onClick, className = '', viewMode = 'grid' }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [seriesMetadata, setSeriesMetadata] = useState<{ total_books?: number } | null>(null);

  // Fetch series metadata if not provided and not standalone
  useEffect(() => {
    if (!totalBooksInSeries && seriesName !== 'Standalone' && seriesName !== 'Standalone Books') {
      // Fetch series metadata from the API
      fetch(`/api/series/${encodeURIComponent(seriesName)}`)
        .then(res => res.json())
        .then(data => {
          if (data.series && data.series.total_books) {
            setSeriesMetadata({ total_books: data.series.total_books });
          }
        })
        .catch(err => {
          console.error('Failed to fetch series metadata:', err);
        });
    }
  }, [seriesName, totalBooksInSeries]);

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(seriesName);
    }
  }, [onClick, seriesName]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // Select a random book cover from the series as the series art
  const randomCover = useMemo(() => {
    const booksWithCovers = books.filter(book => book.cover_url || book.thumbnail_url);
    if (booksWithCovers.length === 0) return null;
    
    // Use the series name as a seed for consistent "randomness"
    const seed = seriesName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = seed % booksWithCovers.length;
    return booksWithCovers[index].cover_url || booksWithCovers[index].thumbnail_url;
  }, [books, seriesName]);

  // Calculate series statistics
  const stats = useMemo(() => {
    const ownedBooks = books.length; // All books passed to this component are owned
    const totalBooks = totalBooksInSeries || seriesMetadata?.total_books || ownedBooks; // Use provided total, fetched metadata, or fallback to owned count
    const readBooks = books.filter(book => book.reading_status === 'read').length;
    const completionPercentage = totalBooks > 0 ? Math.round((ownedBooks / totalBooks) * 100) : 0;
    
    return {
      totalBooks,
      ownedBooks,
      readBooks,
      completionPercentage
    };
  }, [books, totalBooksInSeries, seriesMetadata]);

  // Get first author
  const primaryAuthor = books[0]?.authors[0] || 'Unknown Author';

  if (viewMode === 'list') {
    return (
      <div className={`booktarr-book-card flex p-4 space-x-4 hover:bg-booktarr-hover transition-colors cursor-pointer ${className}`} onClick={handleClick}>
        <div className="flex-shrink-0 w-16 h-24 relative">
          {randomCover && !imageError ? (
            <div className="relative">
              <img 
                src={randomCover} 
                alt={seriesName}
                className={`w-full h-full object-cover rounded transition-all duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 bg-booktarr-surface2 animate-pulse flex items-center justify-center rounded">
                  <div className="w-4 h-4 border-2 border-booktarr-accent border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full bg-booktarr-surface2 border border-booktarr-border rounded flex items-center justify-center">
              <svg className="w-8 h-8 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          )}
          
          {/* Progress bar for list view */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-50 rounded-b">
            <div 
              className="h-full bg-booktarr-accent transition-all duration-300 rounded-b"
              style={{ width: `${stats.completionPercentage}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-booktarr-text mb-1 truncate" title={seriesName}>
            {seriesName}
          </h3>
          
          <p className="text-sm text-booktarr-textSecondary mb-2 truncate" title={primaryAuthor}>
            {primaryAuthor}
          </p>
          
          <div className="flex items-center space-x-4 text-sm text-booktarr-textMuted mb-2">
            <span>{stats.totalBooks} books</span>
            <span>{stats.readBooks} read</span>
            <span>{stats.completionPercentage}% complete</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {stats.completionPercentage === 100 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 border border-green-200">
                ✓ Complete
              </span>
            )}
            {stats.completionPercentage > 0 && stats.completionPercentage < 100 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200">
                📖 In Progress
              </span>
            )}
            {stats.completionPercentage === 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 border border-gray-200">
                ⭐ Wanted
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`booktarr-book-card group cursor-pointer ${className}`}
      onClick={handleClick}
    >
      <div className="relative overflow-hidden rounded-t-lg">
        {randomCover && !imageError ? (
          <div className="relative">
            <img 
              src={randomCover} 
              alt={seriesName}
              className={`booktarr-book-cover transition-all duration-300 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 bg-booktarr-surface2 animate-pulse flex items-center justify-center">
                <svg className="w-12 h-12 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            )}
            
            {/* Series indicator overlay */}
            <div className="absolute top-2 left-2 bg-booktarr-accent text-white px-2 py-1 rounded-full text-xs font-medium">
              📚 Series
            </div>
            
            {/* Completion percentage overlay */}
            <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded-full text-xs font-medium">
              {stats.completionPercentage}%
            </div>
            
            {/* Book count overlay */}
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded-full text-xs font-medium">
              {stats.ownedBooks}/{stats.totalBooks}
            </div>
          </div>
        ) : (
          <div className="booktarr-book-cover bg-gradient-to-br from-booktarr-surface2 to-booktarr-surface1 flex items-center justify-center">
            <div className="text-center text-booktarr-textMuted">
              <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <div className="text-xs font-medium">Series</div>
            </div>
            
            {/* Overlays for no-image case */}
            <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded-full text-xs font-medium">
              {stats.completionPercentage}%
            </div>
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded-full text-xs font-medium">
              {stats.ownedBooks}/{stats.totalBooks}
            </div>
          </div>
        )}

        {/* Reading progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-50">
          <div 
            className="h-full bg-booktarr-accent transition-all duration-300"
            style={{ width: `${stats.completionPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Series info */}
      <div className="booktarr-book-info p-3">
        <h3 className="booktarr-book-title text-sm font-semibold text-booktarr-text mb-1 line-clamp-2" title={seriesName}>
          {seriesName}
        </h3>
        
        <p className="booktarr-book-author text-xs text-booktarr-textSecondary mb-2 truncate" title={primaryAuthor}>
          {primaryAuthor}
        </p>
        
        <div className="flex items-center justify-between text-xs text-booktarr-textMuted">
          <span>{stats.totalBooks} books</span>
          <span>{stats.readBooks} read</span>
        </div>
        
        {/* Status indicators */}
        <div className="flex items-center space-x-2 mt-2">
          {stats.completionPercentage === 100 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 border border-green-200">
              ✓ Complete
            </span>
          )}
          {stats.completionPercentage > 0 && stats.completionPercentage < 100 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200">
              📖 In Progress
            </span>
          )}
          {stats.completionPercentage === 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 border border-gray-200">
              ⭐ Wanted
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeriesCard;