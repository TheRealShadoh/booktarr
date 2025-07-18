import React from 'react';
import { Book, BookCardProps } from '../types';

const BookCard: React.FC<BookCardProps> = ({
  book,
  onClick,
  onStatusChange,
  onEdit,
  onDelete,
  showControls = true,
  showStatus = true,
  showSeries = true,
  showAuthor = true,
  size = 'medium'
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(book);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(book, newStatus);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'owned':
        return 'booktarr-status-success';
      case 'wanted':
        return 'booktarr-status-warning';
      case 'missing':
        return 'booktarr-status-error';
      case 'read':
        return 'booktarr-status-info';
      default:
        return 'booktarr-status-error';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'owned':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'wanted':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        );
      case 'missing':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      case 'read':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const sizeClasses = {
    small: 'w-24',
    medium: 'w-32',
    large: 'w-40'
  };

  return (
    <div className={`booktarr-book-card ${sizeClasses[size]} cursor-pointer group`} onClick={handleClick}>
      {/* Book Cover */}
      <div className="booktarr-book-cover relative">
        {book.coverUrl ? (
          <img 
            src={book.coverUrl} 
            alt={book.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}
        
        {/* Status Badge */}
        {showStatus && (
          <div className="absolute top-2 right-2">
            <span className={`booktarr-status-indicator ${getStatusColor(book.status)}`}>
              {getStatusIcon(book.status)}
              <span className="ml-1 text-xs capitalize">{book.status}</span>
            </span>
          </div>
        )}

        {/* Hover Controls */}
        {showControls && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex space-x-2">
              {onEdit && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(book);
                  }}
                  className="booktarr-btn booktarr-btn-ghost p-2"
                  title="Edit book"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              
              {onDelete && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(book);
                  }}
                  className="booktarr-btn booktarr-btn-danger p-2"
                  title="Delete book"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="booktarr-book-info">
        <h3 className="booktarr-book-title" title={book.title}>
          {book.title}
        </h3>
        
        {showAuthor && book.authors && book.authors.length > 0 && (
          <p className="booktarr-book-author" title={book.authors.join(', ')}>
            {book.authors.join(', ')}
          </p>
        )}
        
        {showSeries && book.series && (
          <p className="booktarr-book-series" title={book.series}>
            {book.series}
            {book.seriesPosition && ` #${book.seriesPosition}`}
          </p>
        )}

        {/* Rating */}
        {book.rating && (
          <div className="flex items-center mt-1">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-3 h-3 ${i < book.rating! ? 'text-booktarr-accent' : 'text-booktarr-textMuted'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-xs text-booktarr-textMuted ml-1">
              {book.rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Status Change Dropdown */}
        {showControls && onStatusChange && (
          <div className="mt-2">
            <select
              value={book.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="booktarr-select text-xs py-1 px-2"
            >
              <option value="owned">Owned</option>
              <option value="wanted">Wanted</option>
              <option value="missing">Missing</option>
              <option value="read">Read</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookCard;