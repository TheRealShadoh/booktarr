/**
 * Wanted page component with Missing From Series and Wantlist functionality
 */
import React, { useState, useMemo, useEffect } from 'react';
import BookCard from './BookCard';
import MissingBookCard from './MissingBookCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { BooksBySeriesMap, Book } from '../types';
import { booktarrAPI } from '../services/api';

interface WantedPageProps {
  books: BooksBySeriesMap;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
  onBookClick?: (book: Book) => void;
}

interface MissingBook {
  seriesName: string;
  position: number;
  title?: string;
  author?: string;
  authors?: string[];
  isbn?: string;
  published_date?: string;
  description?: string;
  thumbnail_url?: string;
  detection_method?: 'range' | 'metadata';
  id: string;
}

interface WantlistItem {
  id: string;
  title: string;
  author?: string;
  isbn?: string;
  seriesName?: string;
  seriesPosition?: number;
  dateAdded: Date;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
}

const WantedPage: React.FC<WantedPageProps> = ({ 
  books, 
  loading, 
  error, 
  onRefresh, 
  onBookClick 
}) => {
  const [activeTab, setActiveTab] = useState<'missing' | 'wantlist'>('missing');
  const [wantlist, setWantlist] = useState<WantlistItem[]>([]);
  const [wantlistLoading, setWantlistLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWantlistItem, setNewWantlistItem] = useState<Partial<WantlistItem>>({
    priority: 'medium'
  });
  const [missingBooks, setMissingBooks] = useState<MissingBook[]>([]);
  const [missingBooksLoading, setMissingBooksLoading] = useState(false);

  // Fetch wantlist from API
  useEffect(() => {
    fetchWantlist();
    fetchMissingBooks();
  }, []);

  const fetchWantlist = async () => {
    setWantlistLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/wantlist');
      if (response.ok) {
        const data = await response.json();
        setWantlist(data.map((item: any) => ({
          id: item.id.toString(),
          title: item.title,
          author: item.authors?.[0],
          isbn: item.isbn,
          seriesName: item.series,
          seriesPosition: item.series_position,
          dateAdded: new Date(item.date_added),
          notes: item.notes,
          priority: item.priority as 'low' | 'medium' | 'high'
        })));
      }
    } catch (error) {
      console.error('Error fetching wantlist:', error);
    } finally {
      setWantlistLoading(false);
    }
  };

  const fetchMissingBooks = async () => {
    setMissingBooksLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/wantlist/missing-books');
      if (response.ok) {
        const data = await response.json();
        setMissingBooks(data.map((item: any) => ({
          id: `${item.series}-${item.position || 'unknown'}`,
          seriesName: item.series,
          position: item.position,
          title: item.title,
          author: item.authors?.[0],
          authors: item.authors,
          isbn: item.isbn,
          published_date: item.published_date,
          description: item.description,
          thumbnail_url: item.thumbnail_url,
          detection_method: item.detection_method
        })));
      }
    } catch (error) {
      console.error('Error fetching missing books:', error);
      // Fallback to client-side calculation if API fails
      const missing: MissingBook[] = [];
      
      Object.entries(books).forEach(([seriesName, bookList]) => {
        if (seriesName === 'Standalone') return;
        
        const booksWithPositions = bookList.filter(book => book.series_position);
        if (booksWithPositions.length === 0) return;
        
        const positions = booksWithPositions.map(book => book.series_position!).sort((a, b) => a - b);
        const maxPosition = Math.max(...positions);
        
        // Find gaps in the series
        for (let i = 1; i <= maxPosition; i++) {
          if (!positions.includes(i)) {
            missing.push({
              id: `${seriesName}-${i}`,
              seriesName,
              position: i,
              author: bookList[0]?.authors[0],
              detection_method: 'range'
            });
          }
        }
      });
      
      setMissingBooks(missing.sort((a, b) => a.seriesName.localeCompare(b.seriesName)));
    } finally {
      setMissingBooksLoading(false);
    }
  };

  const handleAddToWantlist = async (missingBook: MissingBook) => {
    try {
      const response = await fetch('http://localhost:8000/api/wantlist/missing-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          series_name: missingBook.seriesName,
          position: missingBook.position,
          title: missingBook.title,
          authors: missingBook.author ? [missingBook.author] : []
        })
      });
      
      if (response.ok) {
        await fetchWantlist(); // Refresh the list
        await fetchMissingBooks(); // Refresh missing books too
      } else if (response.status === 409) {
        alert('This book is already in your wantlist');
      }
    } catch (error) {
      console.error('Error adding to wantlist:', error);
    }
  };

  const handleAddManualWantlistItem = async () => {
    if (!newWantlistItem.title) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/wantlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newWantlistItem.title,
          authors: newWantlistItem.author ? [newWantlistItem.author] : [],
          isbn: newWantlistItem.isbn,
          series: newWantlistItem.seriesName,
          series_position: newWantlistItem.seriesPosition,
          notes: newWantlistItem.notes,
          priority: newWantlistItem.priority || 'medium',
          source: 'manual'
        })
      });
      
      if (response.ok) {
        await fetchWantlist(); // Refresh the list
        setNewWantlistItem({ priority: 'medium' });
        setShowAddForm(false);
      } else if (response.status === 409) {
        alert('This book is already in your wantlist');
      }
    } catch (error) {
      console.error('Error adding to wantlist:', error);
    }
  };

  const handleRemoveFromWantlist = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/wantlist/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchWantlist(); // Refresh the list
      }
    } catch (error) {
      console.error('Error removing from wantlist:', error);
    }
  };

  const totalMissing = missingBooks.length;
  const totalWantlist = wantlist.length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message="Loading wanted books..." />
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-booktarr-text text-2xl font-bold mb-2">Wanted Books</h1>
              <p className="text-booktarr-textSecondary text-sm">
                Track missing books from your series and manage your wishlist
              </p>
            </div>
            <div className="flex items-center space-x-3 bg-booktarr-surface2 rounded-lg p-2">
              <button
                onClick={() => setActiveTab('missing')}
                className={`text-sm font-medium transition-colors px-3 py-1 rounded ${
                  activeTab === 'missing'
                    ? 'bg-booktarr-accent text-white'
                    : 'text-booktarr-textSecondary hover:text-booktarr-text hover:bg-booktarr-hover'
                }`}
              >
                Missing From Series
                {totalMissing > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-booktarr-accent text-white text-xs rounded-full">
                    {totalMissing}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('wantlist')}
                className={`text-sm font-medium transition-colors px-3 py-1 rounded ${
                  activeTab === 'wantlist'
                    ? 'bg-booktarr-accent text-white'
                    : 'text-booktarr-textSecondary hover:text-booktarr-text hover:bg-booktarr-hover'
                }`}
              >
                Wantlist
                {totalWantlist > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-booktarr-accent text-white text-xs rounded-full">
                    {totalWantlist}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        
        <div className="booktarr-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-4 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
              <div className="text-3xl font-bold text-booktarr-accent mb-2">{totalMissing}</div>
              <div className="text-booktarr-textMuted text-sm uppercase tracking-wider">Missing From Series</div>
            </div>
            <div className="text-center p-4 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
              <div className="text-3xl font-bold text-booktarr-accent mb-2">{totalWantlist}</div>
              <div className="text-booktarr-textMuted text-sm uppercase tracking-wider">Wantlist Items</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'missing' ? (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">Missing From Series</h2>
            <p className="text-booktarr-textSecondary text-sm mt-1">
              Books that are missing from your series collections
            </p>
          </div>
          <div className="booktarr-card-body">
            {missingBooksLoading ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="medium" message="Loading missing books..." />
              </div>
            ) : missingBooks.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-booktarr-text text-lg font-semibold mb-2">No Missing Books</h3>
                <p className="text-booktarr-textSecondary text-sm">
                  All your series appear to be complete!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {missingBooks.map(missing => (
                  <MissingBookCard
                    key={missing.id}
                    seriesName={missing.seriesName}
                    position={missing.position}
                    bookTitle={missing.title}
                    author={missing.author}
                    isbn={missing.isbn}
                    thumbnailUrl={missing.thumbnail_url}
                    publishedDate={missing.published_date}
                    detectionMethod={missing.detection_method}
                    onClick={() => {
                      // Navigate to search page with ISBN or title
                      if (missing.isbn) {
                        window.location.href = `/search?isbn=${missing.isbn}`;
                      } else if (missing.title) {
                        window.location.href = `/search?q=${encodeURIComponent(missing.title)}`;
                      }
                    }}
                    onAddToWantlist={() => handleAddToWantlist(missing)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-booktarr-text">Wantlist</h2>
                <p className="text-booktarr-textSecondary text-sm mt-1">
                  Your personal wishlist of books you want to acquire
                </p>
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="booktarr-btn booktarr-btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Book
              </button>
            </div>
          </div>
          <div className="booktarr-card-body">
            {showAddForm && (
              <div className="mb-6 p-4 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
                <h3 className="text-booktarr-text font-medium mb-4">Add New Wantlist Item</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="booktarr-form-label">Title *</label>
                    <input
                      type="text"
                      value={newWantlistItem.title || ''}
                      onChange={(e) => setNewWantlistItem(prev => ({ ...prev, title: e.target.value }))}
                      className="booktarr-form-input"
                      placeholder="Enter book title"
                    />
                  </div>
                  <div>
                    <label className="booktarr-form-label">Author</label>
                    <input
                      type="text"
                      value={newWantlistItem.author || ''}
                      onChange={(e) => setNewWantlistItem(prev => ({ ...prev, author: e.target.value }))}
                      className="booktarr-form-input"
                      placeholder="Enter author name"
                    />
                  </div>
                  <div>
                    <label className="booktarr-form-label">ISBN</label>
                    <input
                      type="text"
                      value={newWantlistItem.isbn || ''}
                      onChange={(e) => setNewWantlistItem(prev => ({ ...prev, isbn: e.target.value }))}
                      className="booktarr-form-input"
                      placeholder="Enter ISBN"
                    />
                  </div>
                  <div>
                    <label className="booktarr-form-label">Priority</label>
                    <select
                      value={newWantlistItem.priority || 'medium'}
                      onChange={(e) => setNewWantlistItem(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                      className="booktarr-form-input"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="booktarr-form-label">Notes</label>
                  <textarea
                    value={newWantlistItem.notes || ''}
                    onChange={(e) => setNewWantlistItem(prev => ({ ...prev, notes: e.target.value }))}
                    className="booktarr-form-input"
                    placeholder="Add any notes about this book"
                    rows={3}
                  />
                </div>
                <div className="mt-4 flex items-center space-x-2">
                  <button
                    onClick={handleAddManualWantlistItem}
                    className="booktarr-btn booktarr-btn-primary"
                    disabled={!newWantlistItem.title}
                  >
                    Add to Wantlist
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="booktarr-btn booktarr-btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {wantlist.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <h3 className="text-booktarr-text text-lg font-semibold mb-2">No Wantlist Items</h3>
                <p className="text-booktarr-textSecondary text-sm">
                  Add books you want to acquire to your wantlist
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {wantlist.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-booktarr-text font-medium">{item.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.priority === 'high' ? 'bg-red-100 text-red-800' :
                          item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.priority}
                        </span>
                      </div>
                      {item.author && (
                        <p className="text-booktarr-textSecondary text-sm">by {item.author}</p>
                      )}
                      {item.seriesName && (
                        <p className="text-booktarr-textMuted text-sm">
                          {item.seriesName} {item.seriesPosition && `#${item.seriesPosition}`}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-booktarr-textMuted text-sm mt-1">{item.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="booktarr-btn booktarr-btn-primary text-xs">
                        Search for Book
                      </button>
                      <button
                        onClick={() => handleRemoveFromWantlist(item.id)}
                        className="booktarr-btn booktarr-btn-danger text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WantedPage;