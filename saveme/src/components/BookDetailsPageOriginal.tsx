/**
 * BookDetailsPage - Comprehensive book management interface with all the bells and whistles
 */
import React, { useState, useEffect, useRef } from 'react';
import { Book } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface BookEdition {
  isbn: string;
  isbn10?: string;
  isbn13?: string;
  publisher?: string;
  published_date?: string;
  page_count?: number;
  language: string;
  edition_type: 'hardcover' | 'paperback' | 'ebook' | 'audiobook' | 'mass_market' | 'trade_paperback' | 'board_book' | 'unknown';
  thumbnail_url?: string;
  description?: string;
  pricing: Array<{
    source: string;
    price: number;
    currency: string;
    url?: string;
    last_updated: string;
  }>;
  added_date: string;
  last_updated: string;
}

interface BookDetails {
  id: string;
  title: string;
  authors: string[];
  series?: string;
  series_position?: number;
  categories: string[];
  editions: BookEdition[];
  ownership?: {
    owned_editions: string[];
    selected_edition?: string;
    reading_status: string;
    reading_progress_pages?: number;
    reading_progress_percentage?: number;
    date_started?: string;
    date_finished?: string;
    personal_rating?: number;
    personal_notes?: string;
    times_read: number;
  };
}

interface BookDetailsPageProps {
  bookId?: string;
  isbn?: string; // For backward compatibility
  onBack: () => void;
}

const BookDetailsPage: React.FC<BookDetailsPageProps> = ({ bookId, isbn, onBack }) => {
  const [bookDetails, setBookDetails] = useState<BookDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEdition, setSelectedEdition] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // For now, use legacy API with ISBN, later switch to new book details API
        let url = '';
        if (bookId) {
          url = `/api/books/${bookId}`;
        } else if (isbn) {
          url = `/api/books/isbn/${isbn}`;
        } else {
          throw new Error('No book identifier provided');
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch book details');
        }
        
        const data = await response.json();
        setBookDetails(data);
        
        // Set initial selected edition
        if (data.ownership?.selected_edition) {
          setSelectedEdition(data.ownership.selected_edition);
        } else if (data.editions?.length > 0) {
          setSelectedEdition(data.editions[0].isbn);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load book details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [bookId, isbn]);

  const handleEditionSelect = async (editionIsbn: string, markAsOwned: boolean = false) => {
    if (!bookDetails) return;

    try {
      const response = await fetch('/api/books/select-edition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          book_id: bookDetails.id,
          isbn: editionIsbn,
          mark_as_owned: markAsOwned,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to select edition');
      }

      setSelectedEdition(editionIsbn);
      
      // Refresh book details to get updated ownership info
      // (In a real app, you'd update the local state optimistically)
    } catch (err) {
      console.error('Error selecting edition:', err);
    }
  };

  const formatAuthors = (authors: string[]) => {
    if (authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors[0]} et al.`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).getFullYear().toString();
    } catch {
      return dateString;
    }
  };

  const getEditionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      hardcover: 'Hardcover',
      paperback: 'Paperback',
      ebook: 'E-book',
      audiobook: 'Audiobook',
      mass_market: 'Mass Market Paperback',
      trade_paperback: 'Trade Paperback',
      board_book: 'Board Book',
      unknown: 'Unknown Format'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !bookDetails) {
    return (
      <div className="booktarr-card">
        <div className="booktarr-card-body text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold mb-2">Failed to Load Book</h3>
            <p className="text-sm">{error || 'Book not found'}</p>
          </div>
          <button onClick={onBack} className="booktarr-btn booktarr-btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const selectedEditionDetails = bookDetails.editions.find(e => e.isbn === selectedEdition);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <div className="flex items-center justify-between">
            <button 
              onClick={onBack}
              className="flex items-center text-booktarr-textSecondary hover:text-booktarr-text"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Library
            </button>
            
            {bookDetails.ownership && (
              <div className="flex items-center text-green-600">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                In Your Library
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Book Information */}
      <div className="booktarr-card">
        <div className="booktarr-card-body">
          <div className="flex gap-6">
            {/* Book Cover */}
            <div className="flex-shrink-0">
              <div className="w-48 h-72">
                {selectedEditionDetails?.thumbnail_url ? (
                  <img
                    src={selectedEditionDetails.thumbnail_url}
                    alt={bookDetails.title}
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-booktarr-surface2 border border-booktarr-border rounded-lg flex items-center justify-center">
                    <svg className="w-16 h-16 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Book Details */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-booktarr-text mb-2">{bookDetails.title}</h1>
              <p className="text-xl text-booktarr-textSecondary mb-4">by {formatAuthors(bookDetails.authors)}</p>
              
              {bookDetails.series && (
                <p className="text-lg text-booktarr-accent mb-4 font-medium">
                  {bookDetails.series}
                  {bookDetails.series_position && ` #${bookDetails.series_position}`}
                </p>
              )}

              {selectedEditionDetails?.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-booktarr-text mb-2">Description</h3>
                  <p className="text-booktarr-textSecondary leading-relaxed">
                    {selectedEditionDetails.description}
                  </p>
                </div>
              )}

              {/* Edition Information */}
              {selectedEditionDetails && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <span className="text-sm text-booktarr-textMuted">Publisher:</span>
                    <p className="text-booktarr-text">{selectedEditionDetails.publisher || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-booktarr-textMuted">Published:</span>
                    <p className="text-booktarr-text">{formatDate(selectedEditionDetails.published_date)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-booktarr-textMuted">Pages:</span>
                    <p className="text-booktarr-text">{selectedEditionDetails.page_count || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-booktarr-textMuted">Format:</span>
                    <p className="text-booktarr-text">{getEditionTypeLabel(selectedEditionDetails.edition_type)}</p>
                  </div>
                </div>
              )}

              {/* Categories */}
              {bookDetails.categories.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm text-booktarr-textMuted mb-2">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {bookDetails.categories.map((category, index) => (
                      <span 
                        key={index} 
                        className="px-3 py-1 bg-booktarr-surface2 text-booktarr-textSecondary text-sm rounded-full border border-booktarr-border"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Available Editions */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-xl font-semibold text-booktarr-text">Available Editions</h2>
          <p className="text-sm text-booktarr-textSecondary mt-1">
            {bookDetails.editions.length} edition{bookDetails.editions.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="booktarr-card-body">
          <div className="space-y-4">
            {bookDetails.editions.map((edition) => {
              const isSelected = edition.isbn === selectedEdition;
              const isOwned = bookDetails.ownership?.owned_editions?.includes(edition.isbn);
              
              return (
                <div 
                  key={edition.isbn}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-booktarr-accent bg-booktarr-accent/5' 
                      : 'border-booktarr-border hover:border-booktarr-accent/50'
                  }`}
                  onClick={() => setSelectedEdition(edition.isbn)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-booktarr-text">
                          {getEditionTypeLabel(edition.edition_type)}
                        </h3>
                        {isOwned && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Owned
                          </span>
                        )}
                        {isSelected && (
                          <span className="px-2 py-1 bg-booktarr-accent text-white text-xs rounded-full">
                            Selected
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-booktarr-textMuted">ISBN:</span>
                          <p className="text-booktarr-text font-mono">{edition.isbn}</p>
                        </div>
                        <div>
                          <span className="text-booktarr-textMuted">Publisher:</span>
                          <p className="text-booktarr-text">{edition.publisher || 'Unknown'}</p>
                        </div>
                        <div>
                          <span className="text-booktarr-textMuted">Published:</span>
                          <p className="text-booktarr-text">{formatDate(edition.published_date)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      {!isOwned && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditionSelect(edition.isbn, true);
                          }}
                          className="booktarr-btn booktarr-btn-primary booktarr-btn-sm"
                        >
                          Mark as Owned
                        </button>
                      )}
                      {!isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditionSelect(edition.isbn, false);
                          }}
                          className="booktarr-btn booktarr-btn-secondary booktarr-btn-sm"
                        >
                          Select Edition
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reading Progress */}
      {bookDetails.ownership && (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-xl font-semibold text-booktarr-text">Reading Progress</h2>
          </div>
          <div className="booktarr-card-body">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-booktarr-textMuted mb-1">Status</label>
                <p className="text-booktarr-text capitalize">{bookDetails.ownership.reading_status}</p>
              </div>
              <div>
                <label className="block text-sm text-booktarr-textMuted mb-1">Times Read</label>
                <p className="text-booktarr-text">{bookDetails.ownership.times_read}</p>
              </div>
              {bookDetails.ownership.personal_rating && (
                <div>
                  <label className="block text-sm text-booktarr-textMuted mb-1">Your Rating</label>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${
                          star <= bookDetails.ownership!.personal_rating! 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-gray-300'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    ))}
                    <span className="ml-2 text-booktarr-text">{bookDetails.ownership.personal_rating}/5</span>
                  </div>
                </div>
              )}
            </div>
            
            {bookDetails.ownership.personal_notes && (
              <div className="mt-6">
                <label className="block text-sm text-booktarr-textMuted mb-1">Your Notes</label>
                <p className="text-booktarr-text bg-booktarr-surface2 p-3 rounded border border-booktarr-border">
                  {bookDetails.ownership.personal_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookDetailsPage;