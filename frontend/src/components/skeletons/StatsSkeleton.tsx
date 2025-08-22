/**
 * Skeleton loading component for statistics dashboard
 */
import React from 'react';

interface StatsSkeletonProps {
  className?: string;
}

const StatsSkeleton: React.FC<StatsSkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse space-y-6 ${className}`}>
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div 
            key={index}
            className="bg-booktarr-surface rounded-lg border border-booktarr-border p-6"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-booktarr-surface2 rounded w-20"></div>
                <div className="h-8 bg-booktarr-surface2 rounded w-16"></div>
              </div>
              <div className="w-12 h-12 bg-booktarr-surface2 rounded-full"></div>
            </div>
            <div className="mt-4 h-3 bg-booktarr-surface2 rounded w-2/3"></div>
          </div>
        ))}
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1 */}
        <div className="bg-booktarr-surface rounded-lg border border-booktarr-border p-6">
          <div className="h-5 bg-booktarr-surface2 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-booktarr-surface2 rounded"></div>
        </div>
        
        {/* Chart 2 */}
        <div className="bg-booktarr-surface rounded-lg border border-booktarr-border p-6">
          <div className="h-5 bg-booktarr-surface2 rounded w-1/2 mb-6"></div>
          <div className="h-64 bg-booktarr-surface2 rounded"></div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-booktarr-surface rounded-lg border border-booktarr-border p-6">
        <div className="h-5 bg-booktarr-surface2 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-booktarr-surface2 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-booktarr-surface2 rounded w-3/4"></div>
                <div className="h-3 bg-booktarr-surface2 rounded w-1/2"></div>
              </div>
              <div className="h-3 bg-booktarr-surface2 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div 
            key={index}
            className="bg-booktarr-surface rounded-lg border border-booktarr-border p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-booktarr-surface2 rounded w-1/3"></div>
              <div className="h-4 bg-booktarr-surface2 rounded w-12"></div>
            </div>
            <div className="w-full h-3 bg-booktarr-surface2 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsSkeleton;