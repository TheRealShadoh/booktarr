/**
 * Enhanced BookList component with Sonarr-style individual book display
 */
import React, { useState, useMemo, useCallback } from 'react';
import SeriesGroup from './SeriesGroup';
import SeriesCard from './SeriesCard';
import SeriesDetailsPage from './SeriesDetailsPage';
import BookCard from './BookCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import BulkEditPage from './BulkEditPage';
import { BooksBySeriesMap, Book } from '../types';

type ViewMode = 'grid' | 'list';
type DisplayMode = 'series' | 'individual' | 'authors';
type GridSize = 'compact' | 'large';

interface BookListProps {
  books: BooksBySeriesMap;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
  onBookClick?: (book: Book) => void;
}

const BookList: React.FC<BookListProps> = React.memo(({ books, loading, error, onRefresh, onBookClick }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [expandedAuthors, setExpandedAuthors] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('individual'); // Default to Sonarr-style
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState<GridSize>('compact'); // Default to compact (50% smaller)
  const [showBulkEdit, setShowBulkEdit] = useState(false);

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

  // Flatten all books for individual display
  const allBooks = useMemo(() => {
    if (!books) return [];
    
    const flatBooks: Book[] = [];
    Object.entries(books).forEach(([seriesName, bookList]) => {
      flatBooks.push(...bookList);
    });
    
    // Sort books by title
    return flatBooks.sort((a, b) => a.title.localeCompare(b.title));
  }, [books]);

  // Group books by author
  const authorGroups = useMemo(() => {
    if (!books) return [];
    
    const authorMap = new Map<string, Book[]>();
    
    Object.values(books).flat().forEach(book => {
      book.authors.forEach(author => {
        if (!authorMap.has(author)) {
          authorMap.set(author, []);
        }
        authorMap.get(author)!.push(book);
      });
    });
    
    return Array.from(authorMap.entries())
      .map(([author, bookList]) => ({
        author,
        books: bookList.sort((a, b) => {
          // Sort by series first, then by position/title
          if (a.series && b.series && a.series === b.series) {
            return (a.series_position || 0) - (b.series_position || 0);
          }
          return a.title.localeCompare(b.title);
        }),
        bookCount: bookList.length
      }))
      .sort((a, b) => a.author.localeCompare(b.author));
  }, [books]);

  const handleToggleAuthor = useCallback((author: string) => {
    setExpandedAuthors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(author)) {
        newSet.delete(author);
      } else {
        newSet.add(author);
      }
      return newSet;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    if (displayMode === 'series') {
      setExpandedSeries(new Set(seriesGroups.map(group => group.seriesName)));
    } else if (displayMode === 'authors') {
      setExpandedAuthors(new Set(authorGroups.map(group => group.author)));
    }
  }, [displayMode, seriesGroups, authorGroups]);

  const handleCollapseAll = useCallback(() => {
    if (displayMode === 'series') {
      setExpandedSeries(new Set());
    } else if (displayMode === 'authors') {
      setExpandedAuthors(new Set());
    }
  }, [displayMode]);

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
            data-testid="refresh-button"
            className="booktarr-btn booktarr-btn-primary"
          >
            Refresh
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary and controls */}
      <div className="booktarr-card">
        <header className="booktarr-card-header">
          <div className="flex items-center justify-between">
            <h1 className="text-booktarr-text text-lg font-semibold">
              Your Library
            </h1>
            <div className="flex items-center space-x-4">
              {/* Display Mode Toggle */}
              <div className="flex items-center space-x-2 bg-booktarr-surface2 rounded-lg p-1">
                <button
                  onClick={() => setDisplayMode('individual')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    displayMode === 'individual' 
                      ? 'bg-booktarr-accent text-white' 
                      : 'text-booktarr-textSecondary hover:text-booktarr-text'
                  }`}
                  aria-label="Display books individually"
                  aria-pressed={displayMode === 'individual'}
                >
                  Individual
                </button>
                <button
                  onClick={() => setDisplayMode('series')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    displayMode === 'series' 
                      ? 'bg-booktarr-accent text-white' 
                      : 'text-booktarr-textSecondary hover:text-booktarr-text'
                  }`}
                  aria-label="Display books by series"
                  aria-pressed={displayMode === 'series'}
                >
                  Series
                </button>
                <button
                  onClick={() => setDisplayMode('authors')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    displayMode === 'authors' 
                      ? 'bg-booktarr-accent text-white' 
                      : 'text-booktarr-textSecondary hover:text-booktarr-text'
                  }`}
                  aria-label="Display books by authors"
                  aria-pressed={displayMode === 'authors'}
                >
                  Authors
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-1 bg-booktarr-surface2 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-booktarr-accent text-white' 
                      : 'text-booktarr-textSecondary hover:text-booktarr-text'
                  }`}
                  title="Grid View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-booktarr-accent text-white' 
                      : 'text-booktarr-textSecondary hover:text-booktarr-text'
                  }`}
                  title="List View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* Grid Size Toggle (only show in grid mode) */}
              {viewMode === 'grid' && (
                <div className="flex items-center space-x-1 bg-booktarr-surface2 rounded-lg p-1">
                  <button
                    onClick={() => setGridSize('compact')}
                    className={`p-2 rounded transition-colors ${
                      gridSize === 'compact' 
                        ? 'bg-booktarr-accent text-white' 
                        : 'text-booktarr-textSecondary hover:text-booktarr-text'
                    }`}
                    title="Compact Size"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setGridSize('large')}
                    className={`p-2 rounded transition-colors ${
                      gridSize === 'large' 
                        ? 'bg-booktarr-accent text-white' 
                        : 'text-booktarr-textSecondary hover:text-booktarr-text'
                    }`}
                    title="Large Size"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Expand/Collapse Controls (show in series and authors mode) */}
              {(displayMode === 'series' || displayMode === 'authors') && !showBulkEdit && (
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
              )}
              
              {/* Bulk Edit Button */}
              {!showBulkEdit && (
                <button
                  onClick={() => setShowBulkEdit(true)}
                  className="booktarr-btn booktarr-btn-secondary flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Bulk Edit</span>
                </button>
              )}
              
              {/* Exit Bulk Edit Button */}
              {showBulkEdit && (
                <button
                  onClick={() => setShowBulkEdit(false)}
                  className="booktarr-btn booktarr-btn-primary flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Exit Bulk Edit</span>
                </button>
              )}
            </div>
          </div>
        </header>
        
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

      {/* Content based on display mode */}
      {showBulkEdit ? (
        <BulkEditPage
          books={books}
          loading={loading}
          error={error}
          onRefresh={onRefresh}
        />
      ) : selectedSeries ? (
        <SeriesDetailsPage
          seriesName={selectedSeries}
          ownedBooks={books[selectedSeries] || []}
          onBack={() => setSelectedSeries(null)}
          onBookClick={onBookClick}
        />
      ) : (
        <>
      {displayMode === 'individual' && (
        /* Individual book cards - Sonarr style */
        <div className={viewMode === 'grid' ? 
          (gridSize === 'compact' ? 'booktarr-book-grid' : 'booktarr-book-grid-large') : 
          'space-y-4'
        }>
          {allBooks.map((book, index) => (
            <BookCard 
              key={book.isbn || `book-${book.title}-${book.authors[0] || 'unknown'}-${index}`} 
              book={book} 
              viewMode={viewMode}
              onClick={onBookClick}
            />
          ))}
        </div>
      )}
      
      {displayMode === 'series' && (
        /* Series cards - grid view with random art like individual books */
        <div className={viewMode === 'grid' ? 
          (gridSize === 'compact' ? 'booktarr-book-grid' : 'booktarr-book-grid-large') : 
          'space-y-4'
        }>
          {seriesGroups.filter(group => group.seriesName !== 'Standalone').map((group) => (
            <SeriesCard
              key={group.seriesName}
              seriesName={group.seriesName}
              books={group.books}
              onClick={setSelectedSeries}
              viewMode={viewMode}
            />
          ))}
          {/* Add Standalone books as individual cards if they exist */}
          {seriesGroups.find(group => group.seriesName === 'Standalone')?.books.map((book, index) => (
            <BookCard 
              key={book.isbn || `standalone-${book.title}-${book.authors[0] || 'unknown'}-${index}`} 
              book={book} 
              viewMode={viewMode}
              onClick={onBookClick}
            />
          ))}
        </div>
      )}
      
      {displayMode === 'authors' && (
        /* Author groups */
        <div className="space-y-6">
          {authorGroups.map((group) => (
            <SeriesGroup
              key={group.author}
              seriesName={group.author}
              books={group.books}
              expanded={expandedAuthors.has(group.author)}
              onToggle={handleToggleAuthor}
              onBookClick={onBookClick}
              viewMode={viewMode}
              gridSize={gridSize}
              isAuthorGroup={true}
            />
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
});

export default BookList;