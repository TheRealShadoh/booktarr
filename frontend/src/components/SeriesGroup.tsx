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

  // Fetch complete series information from database/API
  useEffect(() => {
    const fetchSeriesInfo = async () => {
      if (!books.length || loadingSeriesInfo) return;
      
      setLoadingSeriesInfo(true);
      try {
        const firstAuthor = books[0]?.authors[0];
        const response = await fetch(
          `http://localhost:8000/api/series-metadata/series/${encodeURIComponent(seriesName)}${firstAuthor ? `?author=${encodeURIComponent(firstAuthor)}` : ''}`
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log(`[DEBUG] SeriesGroup ${seriesName}: Fetched complete series info:`, data);
          setSeriesInfo({
            totalBooks: data.total_books,
            knownBooks: data.books.map((book: any) => ({
              position: book.position,
              title: book.title,
              author: book.authors?.[0] || firstAuthor || 'Unknown Author'
            }))
          });
        } else {
          console.log(`[DEBUG] SeriesGroup ${seriesName}: No complete series info found - showing only gaps`);
          setSeriesInfo(null);
        }
      } catch (error) {
        console.error(`[DEBUG] SeriesGroup ${seriesName}: Error fetching complete series info:`, error);
        setSeriesInfo(null);
      } finally {
        setLoadingSeriesInfo(false);
      }
    };

    fetchSeriesInfo();
  }, [seriesName, books, loadingSeriesInfo]);

  // Create a combined array of books and missing placeholders using complete series info
  const getBooksWithMissing = (): BookItem[] => {
    console.log(`[DEBUG] SeriesGroup ${seriesName}: Starting missing book detection`);
    console.log(`[DEBUG] Books received:`, books);
    console.log(`[DEBUG] Series info:`, seriesInfo);
    
    const booksWithPositions = books.filter(book => book.series_position !== null && book.series_position !== undefined);
    console.log(`[DEBUG] Books with positions:`, booksWithPositions);
    
    if (booksWithPositions.length === 0) {
      console.log(`[DEBUG] ${seriesName}: No books with positions, returning all books`);
      return sortedBooks.map(book => ({ type: 'book' as const, book }));
    }

    const ownedPositions = new Set(booksWithPositions.map(book => book.series_position!));
    console.log(`[DEBUG] ${seriesName}: Owned positions:`, Array.from(ownedPositions));
    
    const result: BookItem[] = [];
    
    if (seriesInfo && seriesInfo.knownBooks.length > 0) {
      // Use complete series information
      console.log(`[DEBUG] ${seriesName}: Using complete series info - ${seriesInfo.totalBooks} total books`);
      
      // Sort known books by position
      const sortedKnownBooks = [...seriesInfo.knownBooks].sort((a, b) => a.position - b.position);
      
      for (const knownBook of sortedKnownBooks) {
        const ownedBook = booksWithPositions.find(book => book.series_position === knownBook.position);
        
        if (ownedBook) {
          console.log(`[DEBUG] ${seriesName}: Found owned book at position ${knownBook.position}: ${ownedBook.title}`);
          result.push({ type: 'book', book: ownedBook });
        } else {
          console.log(`[DEBUG] ${seriesName}: MISSING BOOK at position ${knownBook.position}: ${knownBook.title}`);
          result.push({ type: 'missing', position: knownBook.position, title: knownBook.title });
        }
      }
    } else {
      // Fallback to gap detection
      console.log(`[DEBUG] ${seriesName}: No complete series info, using gap detection`);
      
      const positions = Array.from(ownedPositions).sort((a, b) => a - b);
      const minPos = Math.min(...positions);
      const maxPos = Math.max(...positions);
      
      for (let pos = minPos; pos <= maxPos; pos++) {
        const bookAtPosition = booksWithPositions.find(book => book.series_position === pos);
        if (bookAtPosition) {
          console.log(`[DEBUG] ${seriesName}: Found book at position ${pos}: ${bookAtPosition.title}`);
          result.push({ type: 'book', book: bookAtPosition });
        } else {
          console.log(`[DEBUG] ${seriesName}: MISSING BOOK at position ${pos}`);
          result.push({ type: 'missing', position: pos });
        }
      }
    }
    
    // Add books without positions at the end
    const booksWithoutPositions = books.filter(book => !book.series_position);
    booksWithoutPositions.forEach(book => {
      console.log(`[DEBUG] ${seriesName}: Adding book without position: ${book.title}`);
      result.push({ type: 'book', book });
    });
    
    const missingCount = result.filter(r => r.type === 'missing').length;
    console.log(`[DEBUG] ${seriesName}: Final result - Total items: ${result.length}, Missing: ${missingCount}`);
    console.log(`[DEBUG] ${seriesName}: Full result array:`, result);
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
              {booksWithMissing.map((item, index) => {
                console.log(`[DEBUG] Rendering item ${index}:`, item);
                return item.type === 'book' ? (
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
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {booksWithMissing.map((item, index) => {
                console.log(`[DEBUG] Rendering item ${index}:`, item);
                return item.type === 'book' ? (
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
                );
              })}
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