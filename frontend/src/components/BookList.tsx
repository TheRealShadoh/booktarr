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
        <div className="text-gray-400 text-xl">No books found</div>
        <div className="text-gray-500 text-sm max-w-md text-center">
          Your library appears to be empty. Make sure your Skoolib URL is configured correctly in settings.
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors"
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
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white text-lg font-semibold">
            Your Library
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExpandAll}
              className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
            >
              Expand All
            </button>
            <span className="text-gray-500">|</span>
            <button
              onClick={handleCollapseAll}
              className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-400">
          <span>
            {totalBooks} books across {seriesGroups.length} series
          </span>
          <span>•</span>
          <span>
            {seriesGroups.filter(group => group.seriesName !== 'Standalone').length} series
          </span>
          {seriesGroups.find(group => group.seriesName === 'Standalone') && (
            <>
              <span>•</span>
              <span>
                {seriesGroups.find(group => group.seriesName === 'Standalone')?.bookCount || 0} standalone books
              </span>
            </>
          )}
        </div>
      </div>

      {/* Series groups */}
      <div className="space-y-4">
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