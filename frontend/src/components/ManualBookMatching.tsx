/**
 * Manual Book Matching component for resolving CSV import conflicts
 */
import React, { useState } from 'react';
import { UnmatchedBook, BookMatch, Book } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface ManualBookMatchingProps {
  unmatchedBooks: UnmatchedBook[];
  onComplete: (matches: BookMatch[]) => void;
  onCancel: () => void;
}

const ManualBookMatching: React.FC<ManualBookMatchingProps> = ({
  unmatchedBooks,
  onComplete,
  onCancel
}) => {
  const [matches, setMatches] = useState<BookMatch[]>(
    unmatchedBooks.map(book => ({
      row_number: book.row_number,
      action: 'create_new' as const,
      user_notes: ''
    }))
  );
  const [searchResults, setSearchResults] = useState<{ [key: number]: Book[] }>({});
  const [searching, setSearching] = useState<{ [key: number]: boolean }>({});

  const handleActionChange = (rowNumber: number, action: 'import' | 'skip' | 'create_new') => {
    setMatches(prev => prev.map(match => 
      match.row_number === rowNumber ? { ...match, action } : match
    ));
  };

  const handleNotesChange = (rowNumber: number, notes: string) => {
    setMatches(prev => prev.map(match => 
      match.row_number === rowNumber ? { ...match, user_notes: notes } : match
    ));
  };

  const handleMatchBook = (rowNumber: number, book: Book) => {
    setMatches(prev => prev.map(match => 
      match.row_number === rowNumber ? { ...match, matched_book: book, action: 'import' } : match
    ));
  };

  const searchForSimilarBooks = async (book: UnmatchedBook) => {
    setSearching(prev => ({ ...prev, [book.row_number]: true }));

    try {
      // Build search query from available information
      let query = book.title;
      if (book.authors && book.authors.length > 0) {
        query += ` ${book.authors[0]}`; // Add first author to search
      }

      // Search for similar books using the books search API
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}&max_results=5`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      const results = data.results || [];

      setSearchResults(prev => ({
        ...prev,
        [book.row_number]: results
      }));
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults(prev => ({
        ...prev,
        [book.row_number]: []
      }));
    } finally {
      setSearching(prev => ({ ...prev, [book.row_number]: false }));
    }
  };

  const handleComplete = () => {
    onComplete(matches);
  };

  return (
    <div className="booktarr-main-content">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-xl font-bold text-booktarr-text">Manual Book Matching</h2>
            <p className="text-booktarr-textSecondary">
              {unmatchedBooks.length} books need manual review. Choose how to handle each one.
            </p>
          </div>

          <div className="booktarr-card-body space-y-4">
            {unmatchedBooks.map((book, index) => {
              const match = matches.find(m => m.row_number === book.row_number);
              const results = searchResults[book.row_number] || [];
              const isSearching = searching[book.row_number] || false;

              return (
                <div key={book.row_number} className="border border-booktarr-border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-booktarr-text">{book.title}</h3>
                      <p className="text-booktarr-textSecondary">
                        Authors: {book.authors.length > 0 ? book.authors.join(', ') : 'Unknown'}
                      </p>
                      {book.isbn && (
                        <p className="text-sm text-booktarr-textSecondary">ISBN: {book.isbn}</p>
                      )}
                      {book.series && (
                        <p className="text-sm text-booktarr-textSecondary">Series: {book.series}</p>
                      )}
                      <p className="text-xs text-booktarr-textSecondary mt-1">
                        Row {book.row_number}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => searchForSimilarBooks(book)}
                      disabled={isSearching}
                      className="booktarr-button-secondary text-sm"
                    >
                      {isSearching ? <LoadingSpinner size="small" /> : 'Search Similar'}
                    </button>
                  </div>

                  {/* Action Selection */}
                  <div className="space-y-3">
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name={`action-${book.row_number}`}
                          checked={match?.action === 'create_new'}
                          onChange={() => handleActionChange(book.row_number, 'create_new')}
                          className="text-booktarr-accent"
                        />
                        <span className="text-sm">Create as new book</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name={`action-${book.row_number}`}
                          checked={match?.action === 'skip'}
                          onChange={() => handleActionChange(book.row_number, 'skip')}
                          className="text-booktarr-accent"
                        />
                        <span className="text-sm">Skip this book</span>
                      </label>
                    </div>

                    {/* Notes field */}
                    <div>
                      <label className="block text-sm font-medium text-booktarr-text mb-1">
                        Notes (optional)
                      </label>
                      <input
                        type="text"
                        value={match?.user_notes || ''}
                        onChange={(e) => handleNotesChange(book.row_number, e.target.value)}
                        placeholder="Add any notes about this book..."
                        className="booktarr-form-input w-full text-sm"
                      />
                    </div>

                    {/* Search Results */}
                    {results.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-booktarr-text">Similar books found:</p>
                        {results.map((similarBook, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center p-2 bg-booktarr-surface rounded border"
                          >
                            <div>
                              <p className="font-medium text-sm">{similarBook.title}</p>
                              <p className="text-xs text-booktarr-textSecondary">
                                {similarBook.authors.join(', ')}
                              </p>
                            </div>
                            <button
                              onClick={() => handleMatchBook(book.row_number, similarBook)}
                              className="booktarr-button-secondary text-xs"
                            >
                              Use This Book
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="booktarr-card-footer flex justify-between">
            <button
              onClick={onCancel}
              className="booktarr-button-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              className="booktarr-button-primary"
            >
              Complete Import ({matches.filter(m => m.action !== 'skip').length} books)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualBookMatching;