/**
 * MissingBookCard component for displaying placeholder cards for missing books in a series
 */
import React from 'react';

interface MissingBookCardProps {
  seriesName: string;
  position: number;
  bookTitle?: string; // Real book title if known
  viewMode?: 'grid' | 'list';
  onClick?: () => void;
}

const MissingBookCard: React.FC<MissingBookCardProps> = ({ 
  seriesName, 
  position,
  bookTitle,
  viewMode = 'grid',
  onClick 
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  if (viewMode === 'list') {
    return (
      <div 
        className="booktarr-book-card booktarr-book-card-list opacity-50 grayscale cursor-pointer hover:opacity-75 transition-opacity duration-200"
        onClick={handleClick}
      >
        <div className="flex items-center space-x-4">
          {/* Book Cover Placeholder */}
          <div className="w-16 h-24 bg-booktarr-surface2 border-2 border-dashed border-booktarr-border rounded flex items-center justify-center">
            <svg className="w-8 h-8 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          
          {/* Book Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-booktarr-text font-medium truncate">
                {bookTitle || `${seriesName} #${position}`}
              </h3>
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                Missing
              </span>
            </div>
            <p className="text-booktarr-textSecondary text-sm mb-1">Book not in library</p>
            <p className="text-booktarr-textMuted text-xs">Click to search for this book</p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleClick}
              className="booktarr-btn booktarr-btn-primary booktarr-btn-sm"
            >
              Find Book
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div 
      className="booktarr-book-card opacity-50 grayscale cursor-pointer hover:opacity-75 transition-opacity duration-200"
      onClick={handleClick}
    >
      <div className="booktarr-book-image-container">
        {/* Missing book placeholder */}
        <div className="w-full h-full bg-booktarr-surface2 border-2 border-dashed border-booktarr-border rounded-lg flex flex-col items-center justify-center">
          <svg className="w-12 h-12 text-booktarr-textMuted mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="text-xs text-booktarr-textMuted text-center px-2">Missing Book</span>
        </div>
        
        {/* Missing badge */}
        <div className="absolute top-2 right-2">
          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
            Missing
          </span>
        </div>
      </div>
      
      <div className="booktarr-book-info">
        <h3 className="booktarr-book-title text-sm">
          {bookTitle || `${seriesName} #${position}`}
        </h3>
        <p className="booktarr-book-author text-xs text-booktarr-textMuted">
          Book not in library
        </p>
        
        {/* Series info */}
        <div className="mt-2">
          <span className="booktarr-book-series text-xs">
            Position {position}
          </span>
        </div>
        
        {/* Action button */}
        <div className="mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            className="w-full booktarr-btn booktarr-btn-primary booktarr-btn-sm text-xs"
          >
            Find Book
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissingBookCard;