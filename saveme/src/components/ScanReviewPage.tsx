/**
 * Scan Review Page
 * Shows scanned ISBNs with book matches and allows manual override
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Book } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { useStateManager } from '../hooks/useStateManager';

interface ScanMatch {
  isbn: string;
  loading: boolean;
  searchResults: Array<{
    book: Book;
    score: number;
    source: string;
  }>;
  selectedBook?: Book;
  selectedSource?: string;
  error?: string;
  overridden: boolean;
}

interface ScanReviewPageProps {
  scannedISBNs: string[];
  onComplete: () => void;
  onBack: () => void;
}

const ScanReviewPage: React.FC<ScanReviewPageProps> = ({
  scannedISBNs,
  onComplete,
  onBack
}) => {
  const {
    searchWithCaching,
    addBookWithOptimizations,
    showToast
  } = useStateManager();

  const [scanMatches, setScanMatches] = useState<Record<string, ScanMatch>>({});
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize scan matches
  useEffect(() => {
    const initMatches = async () => {
      const matches: Record<string, ScanMatch> = {};
      
      // Initialize each ISBN
      for (const isbn of scannedISBNs) {
        matches[isbn] = {
          isbn,
          loading: true,
          searchResults: [],
          overridden: false,
        };
      }
      
      setScanMatches(matches);

      // Search for each ISBN
      for (const isbn of scannedISBNs) {
        try {
          const results = await searchWithCaching(isbn);
          
          setScanMatches(prev => ({
            ...prev,
            [isbn]: {
              ...prev[isbn],
              loading: false,
              searchResults: results,
              selectedBook: results[0]?.book,
              selectedSource: results[0]?.source,
            }
          }));
        } catch (error) {
          setScanMatches(prev => ({
            ...prev,
            [isbn]: {
              ...prev[isbn],
              loading: false,
              error: error instanceof Error ? error.message : 'Search failed',
            }
          }));
        }
      }
    };

    initMatches();
  }, [scannedISBNs, searchWithCaching]);

  // Manual override search
  const handleManualSearch = useCallback(async (isbn: string, query: string) => {
    setScanMatches(prev => ({
      ...prev,
      [isbn]: {
        ...prev[isbn],
        loading: true,
        error: undefined,
      }
    }));

    try {
      const results = await searchWithCaching(query);
      
      setScanMatches(prev => ({
        ...prev,
        [isbn]: {
          ...prev[isbn],
          loading: false,
          searchResults: results,
          selectedBook: results[0]?.book,
          selectedSource: results[0]?.source,
          overridden: true,
        }
      }));
      
      showToast(`Found ${results.length} results for "${query}"`, 'success');
    } catch (error) {
      setScanMatches(prev => ({
        ...prev,
        [isbn]: {
          ...prev[isbn],
          loading: false,
          error: error instanceof Error ? error.message : 'Search failed',
        }
      }));
      showToast('Search failed', 'error');
    }
  }, [searchWithCaching, showToast]);

  // Select a different book from results
  const handleSelectBook = useCallback((isbn: string, book: Book, source: string) => {
    setScanMatches(prev => ({
      ...prev,
      [isbn]: {
        ...prev[isbn],
        selectedBook: book,
        selectedSource: source,
      }
    }));
  }, []);

  // Add all selected books to library
  const handleAddAllBooks = useCallback(async () => {
    setProcessing(true);
    
    const booksToAdd = Object.values(scanMatches).filter(match => 
      match.selectedBook && !match.loading && !match.error
    );

    let successCount = 0;
    let failCount = 0;

    for (const match of booksToAdd) {
      try {
        if (match.selectedBook && match.selectedSource) {
          await addBookWithOptimizations(match.selectedBook, match.selectedSource);
          successCount++;
        }
      } catch (error) {
        failCount++;
        console.error(`Failed to add book ${match.isbn}:`, error);
      }
    }

    setProcessing(false);
    
    if (successCount > 0) {
      showToast(`Added ${successCount} books successfully${failCount > 0 ? `, ${failCount} failed` : ''}`, 'success');
      onComplete();
    } else {
      showToast('No books were added', 'warning');
    }
  }, [scanMatches, addBookWithOptimizations, showToast, onComplete]);

  const validMatches = Object.values(scanMatches).filter(match => 
    match.selectedBook && !match.loading && !match.error
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-booktarr-text text-xl font-semibold">Review Scanned Books</h2>
              <p className="text-booktarr-textSecondary text-sm mt-1">
                {scannedISBNs.length} ISBNs scanned, {validMatches.length} books found
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onBack}
                className="booktarr-btn booktarr-btn-ghost"
              >
                Back to Scanner
              </button>
              {validMatches.length > 0 && (
                <button
                  onClick={handleAddAllBooks}
                  disabled={processing}
                  className="booktarr-btn booktarr-btn-primary"
                >
                  {processing ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="small" />
                      <span>Adding...</span>
                    </div>
                  ) : (
                    <span>Add All Books ({validMatches.length})</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scan Results */}
      <div className="space-y-4">
        {scannedISBNs.map((isbn) => {
          const match = scanMatches[isbn];
          if (!match) return null;

          return (
            <div key={isbn} className="booktarr-card">
              <div className="booktarr-card-body">
                <div className="flex items-start space-x-4">
                  {/* ISBN Info */}
                  <div className="flex-shrink-0">
                    <div className="text-sm font-mono text-booktarr-text bg-booktarr-surface2 px-2 py-1 rounded">
                      {isbn}
                    </div>
                    {match.overridden && (
                      <div className="text-xs text-booktarr-accent mt-1">
                        Manual Override
                      </div>
                    )}
                  </div>

                  {/* Book Match */}
                  <div className="flex-1">
                    {match.loading ? (
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner size="small" />
                        <span className="text-booktarr-textSecondary">Searching...</span>
                      </div>
                    ) : match.error ? (
                      <div className="space-y-2">
                        <div className="text-booktarr-error">
                          Error: {match.error}
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="Search manually (title, author, etc.)"
                            className="booktarr-form-input flex-1"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleManualSearch(isbn, searchQuery);
                                setSearchQuery('');
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              handleManualSearch(isbn, searchQuery);
                              setSearchQuery('');
                            }}
                            className="booktarr-btn booktarr-btn-primary"
                          >
                            Search
                          </button>
                        </div>
                      </div>
                    ) : match.selectedBook ? (
                      <div className="space-y-3">
                        {/* Selected Book Display */}
                        <div className="flex space-x-3 p-3 bg-booktarr-surface2 rounded-lg">
                          <div className="flex-shrink-0 w-16 h-22">
                            {match.selectedBook.thumbnail_url ? (
                              <img
                                src={match.selectedBook.thumbnail_url}
                                alt={match.selectedBook.title}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <div className="w-full h-full bg-booktarr-border rounded flex items-center justify-center">
                                <svg className="w-6 h-6 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-booktarr-text mb-1">
                              {match.selectedBook.title}
                            </h4>
                            <p className="text-booktarr-textSecondary text-sm mb-1">
                              by {match.selectedBook.authors.join(', ')}
                            </p>
                            {match.selectedBook.series && (
                              <p className="text-booktarr-accent text-sm">
                                {match.selectedBook.series}
                                {match.selectedBook.series_position && ` #${match.selectedBook.series_position}`}
                              </p>
                            )}
                            <div className="text-xs text-booktarr-textMuted mt-1">
                              Source: {match.selectedSource?.replace('_', ' ')}
                            </div>
                          </div>
                        </div>

                        {/* Alternative Results */}
                        {match.searchResults.length > 1 && (
                          <div>
                            <h5 className="text-sm font-medium text-booktarr-text mb-2">
                              Other matches ({match.searchResults.length - 1}):
                            </h5>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {match.searchResults.slice(1).map((result, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-2 bg-booktarr-surface border border-booktarr-border rounded cursor-pointer hover:bg-booktarr-hover"
                                  onClick={() => handleSelectBook(isbn, result.book, result.source)}
                                >
                                  <div className="flex-1">
                                    <div className="text-sm text-booktarr-text">
                                      {result.book.title}
                                    </div>
                                    <div className="text-xs text-booktarr-textSecondary">
                                      by {result.book.authors.join(', ')}
                                    </div>
                                  </div>
                                  <div className="text-xs text-booktarr-textMuted">
                                    {Math.round(result.score * 100)}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Manual Override Search */}
                        <div>
                          <details className="group">
                            <summary className="text-sm text-booktarr-accent cursor-pointer hover:text-booktarr-accentHover">
                              Wrong book? Search manually
                            </summary>
                            <div className="mt-2 flex items-center space-x-2">
                              <input
                                type="text"
                                placeholder="Search by title, author, etc."
                                className="booktarr-form-input flex-1"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    const input = e.target as HTMLInputElement;
                                    handleManualSearch(isbn, input.value);
                                    input.value = '';
                                  }
                                }}
                              />
                              <button
                                onClick={(e) => {
                                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                  handleManualSearch(isbn, input.value);
                                  input.value = '';
                                }}
                                className="booktarr-btn booktarr-btn-ghost"
                              >
                                Search
                              </button>
                            </div>
                          </details>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-booktarr-textSecondary">
                          No book found for this ISBN
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="Search manually (title, author, etc.)"
                            className="booktarr-form-input flex-1"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                const input = e.target as HTMLInputElement;
                                handleManualSearch(isbn, input.value);
                                input.value = '';
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                              handleManualSearch(isbn, input.value);
                              input.value = '';
                            }}
                            className="booktarr-btn booktarr-btn-primary"
                          >
                            Search
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScanReviewPage;