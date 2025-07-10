/**
 * Enhanced BookList component with TypeScript and improved functionality
 */
import React, { useState, useMemo } from 'react';
import SeriesGroup from './SeriesGroup';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { BooksBySeriesMap } from '../types';

interface BookListProps {
  books: BooksBySeriesMap;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

const BookList: React.FC<BookListProps> = ({ books, loading, error, onRefresh }) => {
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

  // Convert books object to sorted array for display
  const seriesGroups = useMemo(() => {
    if (!books) return [];
    
    return Object.entries(books)
      .map(([seriesName, bookList]) => ({
        seriesName,
        books: bookList,
        bookCount: bookList.length
      }))
      .sort((a, b) => {
        // Sort Standalone series to the end
        if (a.seriesName === 'Standalone' && b.seriesName !== 'Standalone') return 1;
        if (a.seriesName !== 'Standalone' && b.seriesName === 'Standalone') return -1;
        
        // Sort by series name
        return a.seriesName.localeCompare(b.seriesName);
      });
  }, [books]);

  const totalBooks = useMemo(() => {
    return seriesGroups.reduce((sum, group) => sum + group.bookCount, 0);
  }, [seriesGroups]);

  const handleToggleSeries = (seriesName: string) => {
    setExpandedSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seriesName)) {
        newSet.delete(seriesName);
      } else {
        newSet.add(seriesName);
      }
      return newSet;
    });
  };

  const handleExpandAll = () => {
    setExpandedSeries(new Set(seriesGroups.map(group => group.seriesName)));
  };

  const handleCollapseAll = () => {
    setExpandedSeries(new Set());
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message="Loading your book collection..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <ErrorMessage error={error} onRetry={onRefresh} />
      </div>
    );
  }

  if (!seriesGroups || seriesGroups.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="text-center">
          <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-booktarr-text text-xl font-semibold mb-2">No books found</h3>
          <p className="text-booktarr-textSecondary text-sm max-w-md">
            Your library appears to be empty. Make sure your Skoolib URL is configured correctly in settings.
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="booktarr-btn booktarr-btn-primary"
          >
            Refresh Library
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary and controls */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-booktarr-text text-lg font-semibold">
              Your Library
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExpandAll}
                className="text-booktarr-accent hover:text-booktarr-accentHover text-sm transition-colors"
              >
                Expand All
              </button>
              <span className="text-booktarr-textMuted">|</span>
              <button
                onClick={handleCollapseAll}
                className="text-booktarr-accent hover:text-booktarr-accentHover text-sm transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>
        
        <div className="booktarr-card-body">
          <div className="flex items-center space-x-4 text-sm text-booktarr-textSecondary">
            <span>
              {totalBooks} books across {seriesGroups.length} series
            </span>
            <span className="text-booktarr-textMuted">•</span>
            <span>
              {seriesGroups.filter(group => group.seriesName !== 'Standalone').length} series
            </span>
            {seriesGroups.find(group => group.seriesName === 'Standalone') && (
              <>
                <span className="text-booktarr-textMuted">•</span>
                <span>
                  {seriesGroups.find(group => group.seriesName === 'Standalone')?.bookCount || 0} standalone books
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Series groups */}
      <div className="space-y-6">
        {seriesGroups.map((group) => (
          <SeriesGroup
            key={group.seriesName}
            seriesName={group.seriesName}
            books={group.books}
            expanded={expandedSeries.has(group.seriesName)}
            onToggle={handleToggleSeries}
          />
        ))}
      </div>
    </div>
  );
};

export default BookList;