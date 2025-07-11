/**
 * Series management page component
 */
import React, { useState, useMemo } from 'react';
import SeriesGroup from './SeriesGroup';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { BooksBySeriesMap, Book } from '../types';

interface SeriesPageProps {
  books: BooksBySeriesMap;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

const SeriesPage: React.FC<SeriesPageProps> = ({ books, loading, error, onRefresh }) => {
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);

  // Convert books object to sorted array for display
  const seriesGroups = useMemo(() => {
    if (!books) return [];
    
    return Object.entries(books)
      .filter(([seriesName, bookList]) => {
        // Only show actual series (not Standalone) and must have at least one book
        return seriesName !== 'Standalone' && bookList.length > 0;
      })
      .map(([seriesName, bookList]) => ({
        seriesName,
        books: bookList,
        bookCount: bookList.length
      }))
      .sort((a, b) => a.seriesName.localeCompare(b.seriesName));
  }, [books]);

  const totalSeries = seriesGroups.length;
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

  const handleSeriesClick = (seriesName: string) => {
    setSelectedSeries(selectedSeries === seriesName ? null : seriesName);
    handleToggleSeries(seriesName);
  };

  const handleBookClick = (book: Book) => {
    // TODO: Implement book detail view
    console.log('Book clicked:', book);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message="Loading series..." />
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-booktarr-text text-xl font-semibold mb-2">No series found</h3>
          <p className="text-booktarr-textSecondary text-sm max-w-md">
            Your library doesn't contain any book series yet. Add some series to your collection to see them here.
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
    <div className="space-y-8">
      {/* Series summary with enhanced visual hierarchy */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-booktarr-text text-2xl font-bold mb-2">Series Collection</h1>
              <p className="text-booktarr-textSecondary text-sm">
                Browse your book series and track reading progress
              </p>
            </div>
            <div className="flex items-center space-x-3 bg-booktarr-surface2 rounded-lg p-2">
              <button
                onClick={() => setExpandedSeries(new Set(seriesGroups.map(group => group.seriesName)))}
                className="text-booktarr-accent hover:text-booktarr-accentHover text-sm font-medium transition-colors px-3 py-1 rounded hover:bg-booktarr-hover"
              >
                Expand All
              </button>
              <div className="w-px h-4 bg-booktarr-border"></div>
              <button
                onClick={() => setExpandedSeries(new Set())}
                className="text-booktarr-accent hover:text-booktarr-accentHover text-sm font-medium transition-colors px-3 py-1 rounded hover:bg-booktarr-hover"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>
        
        <div className="booktarr-card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
              <div className="text-3xl font-bold text-booktarr-accent mb-2">{totalSeries}</div>
              <div className="text-booktarr-textMuted text-sm uppercase tracking-wider">Series</div>
            </div>
            <div className="text-center p-4 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
              <div className="text-3xl font-bold text-booktarr-accent mb-2">{totalBooks}</div>
              <div className="text-booktarr-textMuted text-sm uppercase tracking-wider">Books in Series</div>
            </div>
            <div className="text-center p-4 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
              <div className="text-3xl font-bold text-booktarr-accent mb-2">
                {totalBooks > 0 ? Math.round(totalBooks / totalSeries) : 0}
              </div>
              <div className="text-booktarr-textMuted text-sm uppercase tracking-wider">Avg per Series</div>
            </div>
          </div>
        </div>
      </div>

      {/* Series groups with enhanced layout */}
      <div className="space-y-5">
        {seriesGroups.map((group) => (
          <SeriesGroup
            key={group.seriesName}
            seriesName={group.seriesName}
            books={group.books}
            expanded={expandedSeries.has(group.seriesName)}
            onToggle={handleSeriesClick}
            onBookClick={handleBookClick}
            gridSize="compact"
          />
        ))}
      </div>
    </div>
  );
};

export default SeriesPage;