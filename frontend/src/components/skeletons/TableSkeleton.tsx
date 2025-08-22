/**
 * Skeleton loading component for table views
 */
import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
  showHeader?: boolean;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ 
  rows = 5, 
  columns = 4, 
  className = '',
  showHeader = true
}) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="overflow-hidden rounded-lg border border-booktarr-border">
        {/* Header */}
        {showHeader && (
          <div className="bg-booktarr-surface2 px-6 py-3 border-b border-booktarr-border">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, index) => (
                <div 
                  key={index} 
                  className="h-4 bg-booktarr-surface rounded"
                  style={{ width: `${60 + Math.random() * 40}%` }}
                ></div>
              ))}
            </div>
          </div>
        )}
        
        {/* Rows */}
        <div className="bg-booktarr-surface">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div 
              key={rowIndex} 
              className="px-6 py-4 border-b border-booktarr-border last:border-b-0"
            >
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <div 
                    key={colIndex} 
                    className="h-4 bg-booktarr-surface2 rounded"
                    style={{ width: `${40 + Math.random() * 60}%` }}
                  ></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TableSkeleton;