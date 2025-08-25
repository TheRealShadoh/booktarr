/**
 * Skeleton loading component for book lists
 * Provides visual feedback during loading states for various list layouts
 */
import React from 'react';

interface BookListSkeletonProps {
  count?: number;
  layout?: 'grid' | 'list';
}

const BookListSkeleton: React.FC<BookListSkeletonProps> = ({ 
  count = 12, 
  layout = 'grid' 
}) => {
  if (layout === 'list') {
    return (
      <div className="space-y-4" data-testid="book-list-skeleton">
        {Array.from({ length: count }, (_, index) => (
          <div 
            key={`list-skeleton-${index}`}
            className="flex items-center space-x-4 p-4 bg-booktarr-surface border border-booktarr-border rounded-lg"
          >
            {/* Book cover */}
            <div className="flex-shrink-0 w-16 h-24 bg-gray-300 rounded animate-pulse"></div>
            
            {/* Book info */}
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-300 rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2 animate-pulse"></div>
              <div className="h-3 bg-gray-300 rounded w-1/4 animate-pulse"></div>
            </div>

            {/* Action buttons */}
            <div className="flex space-x-2">
              <div className="w-8 h-8 bg-gray-300 rounded animate-pulse"></div>
              <div className="w-8 h-8 bg-gray-300 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="book-grid-skeleton">
      {/* Header controls skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-300 rounded-lg w-32 animate-pulse"></div>
        <div className="flex space-x-2">
          <div className="h-10 bg-gray-300 rounded-lg w-20 animate-pulse"></div>
          <div className="h-10 bg-gray-300 rounded-lg w-24 animate-pulse"></div>
        </div>
      </div>

      {/* Books grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: count }, (_, index) => (
          <div 
            key={`grid-skeleton-${index}`}
            className="book-card-skeleton bg-booktarr-surface border border-booktarr-border rounded-lg overflow-hidden"
          >
            {/* Book cover */}
            <div className="aspect-[2/3] bg-gray-300 animate-pulse"></div>
            
            {/* Book info */}
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-full animate-pulse"></div>
              <div className="h-3 bg-gray-300 rounded w-3/4 animate-pulse"></div>
              <div className="flex justify-between items-center mt-2">
                <div className="h-3 bg-gray-300 rounded w-1/3 animate-pulse"></div>
                <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookListSkeleton;