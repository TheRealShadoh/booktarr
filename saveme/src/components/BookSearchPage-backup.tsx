/**
 * Book search and add page component
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Book } from '../types';
import { booktarrAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';

interface SearchResult {
  book: Book;
  score: number;
  source: string;
}

interface SearchResponse {
  results: SearchResult[];
  total_found: number;
  query: string;
  search_time: number;
}

interface BookSearchPageProps {
  onBookAdded?: () => void;
}

const BookSearchPage: React.FC<BookSearchPageProps> = ({ onBookAdded }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalFound, setTotalFound] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const [addingBooks, setAddingBooks] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

  // Auto-search with debouncing
  useEffect(() => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    if (query.trim().length >= 3) {
      const timeout = setTimeout(() => {
        handleSearch(query);
      }, 500); // 500ms debounce
      setSearchDebounce(timeout);
    } else if (query.trim().length === 0) {
      setSearchResults([]);
      setTotalFound(0);
      setError(null);
    }

    return () => {
      if (searchDebounce) {
        clearTimeout(searchDebounce);
      }
    };
  }, [query]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setTotalFound(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search/books?query=${encodeURIComponent(searchQuery)}&max_results=20`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data: SearchResponse = await response.json();
      setSearchResults(data.results);
      setTotalFound(data.total_found);
      setSearchTime(data.search_time);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults([]);
      setTotalFound(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddBook = async (book: Book, source: string) => {
    setAddingBooks(prev => new Set(prev).add(book.isbn));
    setError(null);

    try {
      const response = await fetch('/api/library/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isbn: book.isbn,
          source: source,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add book');
      }

      const result = await response.json();
      
      // Mark as recently added for visual feedback
      setRecentlyAdded(prev => new Set(prev).add(book.isbn));
      
      // Show appropriate success message
      if (result.already_exists) {
        setToast({ 
          message: `"${book.title}" is already in your library`, 
          type: 'info' 
        });
      } else {
        setToast({ 
          message: `"${book.title}" added to library successfully!`, 
          type: 'success' 
        });
        
        // Remove from search results after a delay to show feedback
        setTimeout(() => {
          setSearchResults(prev => prev.filter(result => result.book.isbn !== book.isbn));
        }, 1500);
      }
      
      // Refresh the library data
      if (onBookAdded) {
        onBookAdded();
      }
      
    } catch (err) {
      console.error('Add book error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add book';
      setToast({ 
        message: `Failed to add "${book.title}": ${errorMessage}`, 
        type: 'error' 
      });
    } finally {
      setAddingBooks(prev => {
        const newSet = new Set(prev);
        newSet.delete(book.isbn);
        return newSet;
      });
    }
  };

  const formatAuthors = (authors: string[]) => {
    if (authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors[0]} et al.`;
  };

  const formatPublishedDate = (date: string | Date | null | undefined) => {
    if (!date) return 'Unknown';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.getFullYear().toString();
    } catch {
      return 'Unknown';
    }
  };

  const getSeriesInfo = (book: Book) => {
    if (!book.series) return null;
    if (book.series_position) {
      return `${book.series} #${book.series_position}`;
    }
    return book.series;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-booktarr-text text-xl font-semibold">Add Books to Library</h2>
          <p className="text-booktarr-textSecondary text-sm mt-1">
            Search for books by title, author, series, or ISBN to add them to your library
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div className="booktarr-card">
        <div className="booktarr-card-body">
          <div className="space-y-4">
            <div>
              <label htmlFor="search" className="booktarr-form-label">
                Search for books
              </label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter book title, author, series, or ISBN... (min 3 chars)"
                  className="booktarr-form-input pr-12"
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {loading ? (
                    <LoadingSpinner size="small" />
                  ) : (
                    <svg className="w-5 h-5 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-xs text-booktarr-textMuted mt-1">
                Search automatically starts after typing 3+ characters
              </p>
            </div>
            
            {searchResults.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-booktarr-textSecondary">
                  Found {totalFound} results in {searchTime.toFixed(2)}s
                </div>
                <button
                  onClick={() => {
                    setQuery('');
                    setSearchResults([]);
                    setError(null);
                  }}
                  className="text-sm text-booktarr-textMuted hover:text-booktarr-text"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="booktarr-status-error px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-booktarr-text">Search Results</h3>
            <span className="text-sm text-booktarr-textSecondary">
              {searchResults.length} of {totalFound} results
            </span>
          </div>

          <div className="grid gap-4">
            {searchResults.map((result) => (
              <div key={result.book.isbn} className="booktarr-card">
                <div className="booktarr-card-body">
                  <div className="flex gap-4">
                    {/* Book Cover */}
                    <div className="flex-shrink-0 w-20 h-28">
                      {result.book.thumbnail_url ? (
                        <img
                          src={result.book.thumbnail_url}
                          alt={result.book.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full bg-booktarr-surface2 border border-booktarr-border rounded flex items-center justify-center">
                          <svg className="w-8 h-8 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Book Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-booktarr-text font-semibold text-lg mb-1 line-clamp-2">
                            {result.book.title}
                          </h4>
                          
                          <p className="text-booktarr-textSecondary mb-2">
                            by {formatAuthors(result.book.authors)}
                          </p>

                          {getSeriesInfo(result.book) && (
                            <p className="text-booktarr-accent text-sm mb-2 font-medium">
                              {getSeriesInfo(result.book)}
                            </p>
                          )}

                          <div className="flex items-center space-x-4 text-sm text-booktarr-textMuted mb-3">
                            <span>{formatPublishedDate(result.book.published_date)}</span>
                            {result.book.page_count && (
                              <>
                                <span>•</span>
                                <span>{result.book.page_count} pages</span>
                              </>
                            )}
                            {result.book.publisher && (
                              <>
                                <span>•</span>
                                <span>{result.book.publisher}</span>
                              </>
                            )}
                          </div>

                          {result.book.description && (
                            <p className="text-booktarr-textSecondary text-sm line-clamp-3 mb-3">
                              {result.book.description}
                            </p>
                          )}

                          {result.book.categories && result.book.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {result.book.categories.slice(0, 3).map((category, index) => (
                                <span 
                                  key={index} 
                                  className="px-2 py-1 bg-booktarr-surface2 text-booktarr-textSecondary text-xs rounded-full border border-booktarr-border"
                                >
                                  {category}
                                </span>
                              ))}
                              {result.book.categories.length > 3 && (
                                <span className="px-2 py-1 bg-booktarr-surface2 text-booktarr-textSecondary text-xs rounded-full border border-booktarr-border">
                                  +{result.book.categories.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-xs text-booktarr-textMuted">
                              <span>Score: {Math.round(result.score * 100)}%</span>
                              <span>•</span>
                              <span className="capitalize">{result.source.replace('_', ' ')}</span>
                              <span>•</span>
                              <span>ISBN: {result.book.isbn}</span>
                            </div>
                          </div>
                        </div>

                        {/* Add Button */}
                        <div className="ml-4 flex-shrink-0">
                          {recentlyAdded.has(result.book.isbn) ? (
                            <button
                              disabled
                              className="booktarr-btn bg-green-600 text-white cursor-not-allowed"
                            >
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Added!</span>
                              </div>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAddBook(result.book, result.source)}
                              disabled={addingBooks.has(result.book.isbn)}
                              className="booktarr-btn booktarr-btn-primary"
                            >
                              {addingBooks.has(result.book.isbn) ? (
                                <div className="flex items-center space-x-2">
                                  <LoadingSpinner size="small" />
                                  <span>Adding...</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  <span>Add to Library</span>
                                </div>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && searchResults.length === 0 && query && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-booktarr-text text-lg font-semibold mb-2">No books found</h3>
          <p className="text-booktarr-textSecondary">
            Try searching with a different title, author, or ISBN
          </p>
        </div>
      )}

      {/* Initial State */}
      {!loading && searchResults.length === 0 && !query && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-booktarr-text text-lg font-semibold mb-2">Search for books</h3>
          <p className="text-booktarr-textSecondary">
            Enter a book title, author name, series, or ISBN to get started
          </p>
        </div>
      )}
    </div>
  );
};

export default BookSearchPage;