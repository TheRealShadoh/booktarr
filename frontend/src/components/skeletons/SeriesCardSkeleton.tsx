/**
 * Skeleton loading component for SeriesCard
 */
import React from 'react';

interface SeriesCardSkeletonProps {
  viewMode?: 'grid' | 'list';
  className?: string;
}

const SeriesCardSkeleton: React.FC<SeriesCardSkeletonProps> = ({ 
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
          {/* Series name */}
          <div className="h-4 bg-booktarr-surface2 rounded w-2/3"></div>
          
          {/* Volume count */}
          <div className="h-3 bg-booktarr-surface2 rounded w-1/3"></div>
          
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-2 bg-booktarr-surface2 rounded w-full"></div>
            <div className="h-3 bg-booktarr-surface2 rounded w-1/4"></div>
          </div>
          
          {/* Reading status */}
          <div className="flex space-x-2">
            <div className="h-3 bg-booktarr-surface2 rounded w-12"></div>
            <div className="h-3 bg-booktarr-surface2 rounded w-16"></div>
            <div className="h-3 bg-booktarr-surface2 rounded w-14"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`booktarr-series-card animate-pulse ${className}`}>
      {/* Cover skeleton */}
      <div className="relative overflow-hidden rounded-t-lg">
        <div className="booktarr-series-cover bg-booktarr-surface2 aspect-[2/3]"></div>
        
        {/* Series badge */}
        <div className="absolute top-2 left-2">
          <div className="w-16 h-5 bg-booktarr-surface2 rounded-full"></div>
        </div>
      </div>
      
      {/* Info skeleton */}
      <div className="booktarr-series-info space-y-3">
        {/* Series name */}
        <div className="space-y-1">
          <div className="h-4 bg-booktarr-surface2 rounded w-full"></div>
          <div className="h-4 bg-booktarr-surface2 rounded w-3/4"></div>
        </div>
        
        {/* Volume count and completion */}
        <div className="space-y-2">
          <div className="h-3 bg-booktarr-surface2 rounded w-1/2"></div>
          
          {/* Progress bar */}
          <div className="w-full h-2 bg-booktarr-surface2 rounded"></div>
          <div className="h-3 bg-booktarr-surface2 rounded w-1/3"></div>
        </div>
        
        {/* Author and year */}
        <div className="space-y-1">
          <div className="h-3 bg-booktarr-surface2 rounded w-2/3"></div>
          <div className="h-3 bg-booktarr-surface2 rounded w-1/4"></div>
        </div>
        
        {/* Reading status breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 bg-booktarr-surface2 rounded w-12"></div>
            <div className="h-3 bg-booktarr-surface2 rounded w-8"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-3 bg-booktarr-surface2 rounded w-16"></div>
            <div className="h-3 bg-booktarr-surface2 rounded w-8"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-3 bg-booktarr-surface2 rounded w-14"></div>
            <div className="h-3 bg-booktarr-surface2 rounded w-8"></div>
          </div>
        </div>
        
        {/* Genre */}
        <div className="h-5 bg-booktarr-surface2 rounded-full w-16"></div>
      </div>
    </div>
  );
};

export default SeriesCardSkeleton;