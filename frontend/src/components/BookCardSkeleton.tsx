/**
 * Skeleton loading component for book cards
 * Provides visual feedback during loading states
 */
import React from 'react';

interface BookCardSkeletonProps {
  count?: number;
}

const BookCardSkeleton: React.FC<BookCardSkeletonProps> = ({ count = 12 }) => {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={`skeleton-${index}`} className="book-card-skeleton">
          <div className="cover-skeleton" />
          <div className="p-3 space-y-2">
            <div className="title-skeleton" />
            <div className="author-skeleton" />
          </div>
        </div>
      ))}
    </>
  );
};

export default BookCardSkeleton;