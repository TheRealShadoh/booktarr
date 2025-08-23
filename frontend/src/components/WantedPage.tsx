/**
 * Wanted page component with Missing From Series and Wantlist functionality
 */
import React, { useState, useMemo } from 'react';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { BooksBySeriesMap, Book } from '../types';

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWantlistItem, setNewWantlistItem] = useState<Partial<WantlistItem>>({
    priority: 'medium'
  });

  // Calculate missing books from series
  const missingBooks = useMemo(() => {
    if (!books) return [];
    
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
            author: bookList[0]?.authors[0]
          });
        }
      }
    });
    
    return missing.sort((a, b) => a.seriesName.localeCompare(b.seriesName));
  }, [books]);

  const handleAddToWantlist = (missingBook: MissingBook) => {
    const newItem: WantlistItem = {
      id: `wl-${Date.now()}`,
      title: missingBook.title || `${missingBook.seriesName} #${missingBook.position}`,
      author: missingBook.author,
      seriesName: missingBook.seriesName,
      seriesPosition: missingBook.position,
      dateAdded: new Date(),
      priority: 'medium'
    };
    
    setWantlist(prev => [...prev, newItem]);
  };

  const handleAddManualWantlistItem = () => {
    if (!newWantlistItem.title) return;
    
    const item: WantlistItem = {
      id: `wl-${Date.now()}`,
      title: newWantlistItem.title,
      author: newWantlistItem.author,
      isbn: newWantlistItem.isbn,
      seriesName: newWantlistItem.seriesName,
      seriesPosition: newWantlistItem.seriesPosition,
      dateAdded: new Date(),
      notes: newWantlistItem.notes,
      priority: newWantlistItem.priority || 'medium'
    };
    
    setWantlist(prev => [...prev, item]);
    setNewWantlistItem({ priority: 'medium' });
    setShowAddForm(false);
  };

  const handleRemoveFromWantlist = (id: string) => {
    setWantlist(prev => prev.filter(item => item.id !== id));
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
            {missingBooks.length === 0 ? (
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
              <div className="space-y-4">
                {missingBooks.map(missing => (
                  <div key={missing.id} className="flex items-center justify-between p-4 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
                    <div className="flex-1">
                      <h4 className="text-booktarr-text font-medium">
                        {missing.seriesName} #{missing.position}
                      </h4>
                      {missing.author && (
                        <p className="text-booktarr-textSecondary text-sm">by {missing.author}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleAddToWantlist(missing)}
                        className="booktarr-btn booktarr-btn-secondary text-xs"
                      >
                        Add to Wantlist
                      </button>
                      <button className="booktarr-btn booktarr-btn-primary text-xs">
                        Search for Book
                      </button>
                    </div>
                  </div>
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