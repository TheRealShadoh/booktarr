/**
 * Skeleton loading component for collections/series view
 * Provides visual feedback during loading states
 */
import React from 'react';

interface CollectionsSkeletonProps {
  count?: number;
}

const CollectionsSkeleton: React.FC<CollectionsSkeletonProps> = ({ count = 8 }) => {
  return (
    <div className="space-y-6" data-testid="collections-skeleton">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-300 rounded-lg w-48 animate-pulse"></div>
        <div className="flex space-x-2">
          <div className="h-10 bg-gray-300 rounded-lg w-24 animate-pulse"></div>
          <div className="h-10 bg-gray-300 rounded-lg w-32 animate-pulse"></div>
        </div>
      </div>

      {/* Collections grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: count }, (_, index) => (
          <div 
            key={`collection-skeleton-${index}`} 
            className="bg-booktarr-surface border border-booktarr-border rounded-lg p-4 space-y-4"
          >
            {/* Collection cover */}
            <div className="aspect-[3/4] bg-gray-300 rounded-lg animate-pulse"></div>
            
            {/* Collection info */}
            <div className="space-y-2">
              <div className="h-5 bg-gray-300 rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2 animate-pulse"></div>
              
              {/* Progress bar */}
              <div className="mt-3 space-y-1">
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-300 rounded w-16 animate-pulse"></div>
                  <div className="h-3 bg-gray-300 rounded w-12 animate-pulse"></div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gray-300 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollectionsSkeleton;