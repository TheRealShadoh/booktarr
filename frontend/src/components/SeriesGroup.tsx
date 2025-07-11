/**
 * Enhanced SeriesGroup component with Sonarr-inspired styling
 */
import React, { useState, useEffect } from 'react';
import BookCard from './BookCard';
import MissingBookCard from './MissingBookCard';
import { Book } from '../types';

interface SeriesGroupProps {
  seriesName: string;
  books: Book[];
  expanded?: boolean;
  onToggle?: (seriesName: string) => void;
  viewMode?: 'grid' | 'list';
  gridSize?: 'compact' | 'large';
  onBookClick?: (book: Book) => void;
}

const SeriesGroup: React.FC<SeriesGroupProps> = ({ 
  seriesName, 
  books, 
  expanded = true,
  onToggle,
  viewMode = 'grid',
  gridSize = 'compact',
  onBookClick
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  
  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggle?.(seriesName);
  };

  const sortedBooks = [...books].sort((a, b) => {
    // Sort by series position first, then by title
    if (a.series_position && b.series_position) {
      return a.series_position - b.series_position;
    }
    if (a.series_position && !b.series_position) return -1;
    if (!a.series_position && b.series_position) return 1;
    return a.title.localeCompare(b.title);
  });

  // Define the type for book items
  type BookItem = { type: 'book'; book: Book } | { type: 'missing'; position: number; title?: string };

  // State for series information from API
  const [seriesInfo, setSeriesInfo] = useState<{
    totalBooks: number;
    knownBooks: Array<{ position: number; title: string; author: string }>;
  } | null>(null);
  const [loadingSeriesInfo, setLoadingSeriesInfo] = useState(false);

  // Fetch series information from API (dynamic only)
  useEffect(() => {
    const fetchSeriesInfo = async () => {
      if (!books.length || loadingSeriesInfo) return;
      
      setLoadingSeriesInfo(true);
      try {
        const firstAuthor = books[0]?.authors[0];
        const response = await fetch(
          `http://localhost:8000/api/series/info/${encodeURIComponent(seriesName)}?author=${encodeURIComponent(firstAuthor || '')}`
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log(`SeriesGroup ${seriesName}: Fetched series info from API:`, data);
          setSeriesInfo({
            totalBooks: data.total_books,
            knownBooks: data.known_books
          });
        } else {
          console.log(`SeriesGroup ${seriesName}: No series info found in API - showing only owned books`);
          // No fallback - if API doesn't have it, we only show what we own
          setSeriesInfo(null);
        }
      } catch (error) {
        console.error(`SeriesGroup ${seriesName}: Error fetching series info:`, error);
        setSeriesInfo(null);
      } finally {
        setLoadingSeriesInfo(false);
      }
    };

    fetchSeriesInfo();
  }, [seriesName, books]);

  // Create a combined array of books and missing placeholders (fully dynamic)
  const getBooksWithMissing = (): BookItem[] => {
    console.log(`SeriesGroup ${seriesName}: Processing books for missing detection:`, books);
    
    const booksWithPositions = books.filter(book => book.series_position);
    console.log(`SeriesGroup ${seriesName}: Books with positions:`, booksWithPositions.map(b => ({ title: b.title, position: b.series_position })));
    
    if (booksWithPositions.length === 0) {
      console.log(`SeriesGroup ${seriesName}: No books with positions, returning all books`);
      return sortedBooks.map(book => ({ type: 'book' as const, book }));
    }

    const positions = booksWithPositions.map(book => book.series_position!).sort((a, b) => a - b);
    const minPos = Math.min(...positions);
    const maxPos = Math.max(...positions);
    
    // Use series info if available, otherwise just show gaps within owned books
    let expectedMaxPos = maxPos;
    if (seriesInfo && seriesInfo.totalBooks > maxPos) {
      expectedMaxPos = seriesInfo.totalBooks;
      console.log(`SeriesGroup ${seriesName}: Using series data - series has ${seriesInfo.totalBooks} total books`);
    }
    
    console.log(`SeriesGroup ${seriesName}: Position range: ${minPos} to ${expectedMaxPos} (owned: ${minPos}-${maxPos})`);
    
    const result: BookItem[] = [];
    
    for (let pos = minPos; pos <= expectedMaxPos; pos++) {
      const bookAtPosition = booksWithPositions.find(book => book.series_position === pos);
      if (bookAtPosition) {
        console.log(`SeriesGroup ${seriesName}: Found book at position ${pos}: ${bookAtPosition.title}`);
        result.push({ type: 'book', book: bookAtPosition });
      } else {
        // Find the book title from series info if available
        const knownBook = seriesInfo?.knownBooks.find(book => book.position === pos);
        const bookTitle = knownBook?.title;
        console.log(`SeriesGroup ${seriesName}: Missing book at position ${pos}${bookTitle ? `: ${bookTitle}` : ''}`);
        result.push({ type: 'missing', position: pos, title: bookTitle });
      }
    }
    
    // Add books without positions at the end
    const booksWithoutPositions = books.filter(book => !book.series_position);
    booksWithoutPositions.forEach(book => {
      console.log(`SeriesGroup ${seriesName}: Adding book without position: ${book.title}`);
      result.push({ type: 'book', book });
    });
    
    console.log(`SeriesGroup ${seriesName}: Final result with ${result.filter(r => r.type === 'missing').length} missing books:`, result);
    return result;
  };

  const booksWithMissing = getBooksWithMissing();

  const getSeriesStats = () => {
    const totalBooks = books.length;
    const withPositions = books.filter(book => book.series_position).length;
    const averagePages = books.reduce((sum, book) => sum + (book.page_count || 0), 0) / totalBooks;
    const authors = new Set(books.flatMap(book => book.authors));
    const missingCount = booksWithMissing.filter((item: BookItem) => item.type === 'missing').length;
    
    return {
      totalBooks,
      withPositions,
      averagePages: Math.round(averagePages),
      uniqueAuthors: authors.size,
      missingCount
    };
  };

  const stats = getSeriesStats();

  return (
    <div className="booktarr-series-section">
      <div 
        onClick={toggleExpanded}
        className="booktarr-series-header group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg 
              className={`w-5 h-5 booktarr-series-toggle transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div>
              <h2 className="booktarr-series-title">
                {seriesName}
              </h2>
              {!isExpanded && (
                <div className="text-xs text-booktarr-textMuted mt-1">
                  {stats.uniqueAuthors} author{stats.uniqueAuthors !== 1 ? 's' : ''} • {stats.averagePages} avg pages
                  {stats.missingCount > 0 && (
                    <span className="text-red-500"> • {stats.missingCount} missing</span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="booktarr-series-count">
              {books.length} book{books.length !== 1 ? 's' : ''}
            </span>
            {stats.withPositions > 0 && (
              <span className="px-2 py-1 bg-booktarr-accent text-white text-xs rounded-full">
                #{stats.withPositions}
              </span>
            )}
          </div>
        </div>
        
        {/* Progress bar for series completion */}
        {!isExpanded && stats.withPositions > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-booktarr-textMuted mb-1">
              <span>Series Progress</span>
              <span>{stats.withPositions}/{stats.totalBooks} books</span>
            </div>
            <div className="w-full bg-booktarr-surface rounded-full h-2">
              <div 
                className="bg-booktarr-accent h-2 rounded-full transition-all duration-500"
                style={{ width: `${(stats.withPositions / stats.totalBooks) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Quick preview of first few books when collapsed */}
        {!isExpanded && books.length > 0 && (
          <div className="mt-3 flex items-center space-x-2 text-sm text-booktarr-textMuted">
            <span>Latest:</span>
            <span className="truncate">
              {sortedBooks.slice(0, 2).map(book => book.title).join(', ')}
              {books.length > 2 && ` +${books.length - 2} more`}
            </span>
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className="animate-slide-up">
          {viewMode === 'grid' ? (
            <div className={gridSize === 'compact' ? 'booktarr-book-grid' : 'booktarr-book-grid-large'}>
              {booksWithMissing.map((item, index) => 
                item.type === 'book' ? (
                  <BookCard 
                    key={item.book.isbn} 
                    book={item.book} 
                    onClick={onBookClick}
                    viewMode={viewMode}
                  />
                ) : (
                  <MissingBookCard
                    key={`missing-${item.position}`}
                    seriesName={seriesName}
                    position={item.position}
                    bookTitle={item.title}
                    viewMode={viewMode}
                    onClick={() => console.log(`Search for ${item.title || `${seriesName} #${item.position}`}`)}
                  />
                )
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {booksWithMissing.map((item, index) => 
                item.type === 'book' ? (
                  <BookCard 
                    key={item.book.isbn} 
                    book={item.book} 
                    onClick={onBookClick}
                    viewMode={viewMode}
                  />
                ) : (
                  <MissingBookCard
                    key={`missing-${item.position}`}
                    seriesName={seriesName}
                    position={item.position}
                    bookTitle={item.title}
                    viewMode={viewMode}
                    onClick={() => console.log(`Search for ${item.title || `${seriesName} #${item.position}`}`)}
                  />
                )
              )}
            </div>
          )}
          
          {/* Series summary */}
          {isExpanded && (
            <div className="mt-6 p-4 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
              <h4 className="text-sm font-semibold text-booktarr-text mb-2">Series Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-booktarr-textMuted">Total Books</span>
                  <p className="text-booktarr-text font-medium">{stats.totalBooks}</p>
                </div>
                <div>
                  <span className="text-booktarr-textMuted">Numbered</span>
                  <p className="text-booktarr-text font-medium">{stats.withPositions}</p>
                </div>
                <div>
                  <span className="text-booktarr-textMuted">Missing</span>
                  <p className="text-red-600 font-medium">{stats.missingCount}</p>
                </div>
                <div>
                  <span className="text-booktarr-textMuted">Authors</span>
                  <p className="text-booktarr-text font-medium">{stats.uniqueAuthors}</p>
                </div>
                <div>
                  <span className="text-booktarr-textMuted">Avg Pages</span>
                  <p className="text-booktarr-text font-medium">{stats.averagePages}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SeriesGroup;