/**
 * Skeleton loading component for BookCard
 */
import React from 'react';

interface BookCardSkeletonProps {
  viewMode?: 'grid' | 'list';
  className?: string;
}

const BookCardSkeleton: React.FC<BookCardSkeletonProps> = ({ 
  viewMode = 'grid', 
  className = '' 
}) => {
  if (viewMode === 'list') {
    return (
      <div className={`flex p-4 space-x-4 bg-booktarr-surface rounded-lg border border-booktarr-border animate-pulse ${className}`}>
        {/* Cover skeleton */}
        <div className="flex-shrink-0 w-16 h-24 bg-booktarr-surface2 rounded"></div>
        
        {/* Content skeleton */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <div className="h-4 bg-booktarr-surface2 rounded w-3/4"></div>
          
          {/* Author */}
          <div className="h-3 bg-booktarr-surface2 rounded w-1/2"></div>
          
          {/* Metadata row */}
          <div className="flex items-center space-x-4">
            <div className="h-3 bg-booktarr-surface2 rounded w-16"></div>
            <div className="h-3 bg-booktarr-surface2 rounded w-12"></div>
            <div className="h-3 bg-booktarr-surface2 rounded w-20"></div>
          </div>
          
          {/* Categories */}
          <div className="flex space-x-2">
            <div className="h-6 bg-booktarr-surface2 rounded-full w-16"></div>
            <div className="h-6 bg-booktarr-surface2 rounded-full w-12"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`booktarr-book-card animate-pulse ${className}`}>
      {/* Cover skeleton */}
      <div className="relative overflow-hidden rounded-t-lg">
        <div className="booktarr-book-cover bg-booktarr-surface2"></div>
        
        {/* Status badges */}
        <div className="absolute top-2 right-2 flex flex-col space-y-1">
          <div className="w-12 h-5 bg-booktarr-surface2 rounded-full"></div>
          <div className="w-10 h-5 bg-booktarr-surface2 rounded-full"></div>
        </div>
      </div>
      
      {/* Info skeleton */}
      <div className="booktarr-book-info space-y-2">
        {/* Title */}
        <div className="h-4 bg-booktarr-surface2 rounded w-full"></div>
        <div className="h-4 bg-booktarr-surface2 rounded w-3/4"></div>
        
        {/* Author */}
        <div className="h-3 bg-booktarr-surface2 rounded w-2/3"></div>
        
        {/* Metadata */}
        <div className="flex items-center justify-between">
          <div className="h-3 bg-booktarr-surface2 rounded w-12"></div>
          <div className="h-3 bg-booktarr-surface2 rounded w-8"></div>
        </div>
        
        {/* Series info */}
        <div className="h-3 bg-booktarr-surface2 rounded w-1/2"></div>
        
        {/* Price */}
        <div className="h-3 bg-booktarr-surface2 rounded w-16"></div>
        
        {/* Progress bar (sometimes) */}
        <div className="h-2 bg-booktarr-surface2 rounded w-full opacity-50"></div>
      </div>
    </div>
  );
};

export default BookCardSkeleton;