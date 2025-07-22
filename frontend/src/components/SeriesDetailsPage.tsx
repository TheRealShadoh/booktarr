/**
 * SeriesDetailsPage - Sonarr-inspired series view showing all books in the series
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Book } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface SeriesBook {
  position: number;
  title: string;
  authors: string[];
  isbn_13?: string;
  isbn_10?: string;
  publisher?: string;
  release_date?: string;
  cover_url?: string;
  price?: number;
  status: 'owned' | 'missing' | 'wanted';
  owned_book?: Book; // If we own this book
}

interface SeriesDetailsPageProps {
  seriesName: string;
  ownedBooks: Book[];
  onBack: () => void;
  onBookClick?: (book: Book) => void;
}

const SeriesDetailsPage: React.FC<SeriesDetailsPageProps> = ({ 
  seriesName, 
  ownedBooks, 
  onBack, 
  onBookClick 
}) => {
  const [seriesBooks, setSeriesBooks] = useState<SeriesBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'position' | 'title' | 'release_date'>('position');
  const [filterBy, setFilterBy] = useState<'all' | 'owned' | 'missing' | 'wanted'>('all');

  // Process series information from owned books only (no API calls for now)
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // Just show owned books for now (no API calls)
    const ownedBooksInSeries = ownedBooks.filter(book => 
      book.series === seriesName
    );
    
    const processedBooks = ownedBooksInSeries.map(book => ({
      position: book.series_position || 999,
      title: book.title,
      authors: book.authors,
      isbn_13: book.isbn13,
      isbn_10: book.isbn10,
      publisher: book.publisher,
      release_date: book.published_date,
      cover_url: book.cover_url || book.thumbnail_url,
      price: book.pricing?.[0]?.price,
      status: 'owned' as const,
      owned_book: book
    }));
    
    setSeriesBooks(processedBooks);
    setLoading(false);
  }, [seriesName, ownedBooks]);

  // Calculate series statistics
  const stats = useMemo(() => {
    const total = seriesBooks.length;
    const owned = seriesBooks.filter(book => book.status === 'owned').length;
    const missing = seriesBooks.filter(book => book.status === 'missing').length;
    const wanted = seriesBooks.filter(book => book.status === 'wanted').length;
    const completionPercentage = total > 0 ? Math.round((owned / total) * 100) : 0;
    
    return { total, owned, missing, wanted, completionPercentage };
  }, [seriesBooks]);

  // Filter and sort books
  const filteredBooks = useMemo(() => {
    let filtered = seriesBooks;
    
    // Apply filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(book => book.status === filterBy);
    }
    
    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'position':
          return a.position - b.position;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'release_date':
          if (!a.release_date && !b.release_date) return 0;
          if (!a.release_date) return 1;
          if (!b.release_date) return -1;
          return new Date(a.release_date).getTime() - new Date(b.release_date).getTime();
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [seriesBooks, sortBy, filterBy]);

  const handleBookClick = (seriesBook: SeriesBook) => {
    if (seriesBook.owned_book && onBookClick) {
      onBookClick(seriesBook.owned_book);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-booktarr-bg">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-booktarr-bg min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-booktarr-textMuted hover:text-booktarr-text transition-colors"
          >
            <span className="text-xl">←</span>
            <span>Back to Library</span>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-booktarr-text">{seriesName}</h1>
            <p className="text-booktarr-textMuted">
              {ownedBooks[0]?.authors.join(', ') || 'Unknown Author'}
            </p>
          </div>
        </div>
        
        {/* Quick stats */}
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-booktarr-accent">{stats.owned}</div>
            <div className="text-xs text-booktarr-textMuted">Owned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{stats.missing}</div>
            <div className="text-xs text-booktarr-textMuted">Missing</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.completionPercentage}%</div>
            <div className="text-xs text-booktarr-textMuted">Complete</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-booktarr-textMuted mb-2">
          <span>Series Progress</span>
          <span>{stats.owned} of {stats.total} books</span>
        </div>
        <div className="w-full bg-booktarr-border rounded-full h-3">
          <div 
            className="bg-booktarr-accent h-3 rounded-full transition-all duration-300"
            style={{ width: `${stats.completionPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-booktarr-text mb-1">Sort by</label>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
            >
              <option value="position">Book Number</option>
              <option value="title">Title</option>
              <option value="release_date">Release Date</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-booktarr-text mb-1">Filter</label>
            <select 
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
            >
              <option value="all">All Books</option>
              <option value="owned">Owned</option>
              <option value="missing">Missing</option>
              <option value="wanted">Wanted</option>
            </select>
          </div>
        </div>
        
        <div className="text-sm text-booktarr-textMuted">
          Showing {filteredBooks.length} of {stats.total} books
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Books Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredBooks.map((seriesBook) => (
          <div 
            key={`${seriesBook.position}-${seriesBook.title}`}
            className={`group relative rounded-lg border transition-all duration-200 ${
              seriesBook.status === 'owned' 
                ? 'border-green-200 bg-white hover:shadow-lg cursor-pointer' 
                : seriesBook.status === 'wanted'
                ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                : 'border-red-200 bg-red-50 hover:bg-red-100'
            }`}
            onClick={() => seriesBook.status === 'owned' && handleBookClick(seriesBook)}
          >
            {/* Book Cover */}
            <div className="aspect-[2/3] relative overflow-hidden rounded-t-lg">
              {seriesBook.cover_url ? (
                <img 
                  src={seriesBook.cover_url} 
                  alt={seriesBook.title}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${
                  seriesBook.status === 'owned' ? 'bg-gray-200' : 
                  seriesBook.status === 'wanted' ? 'bg-blue-100' : 'bg-red-100'
                }`}>
                  <div className="text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <div className="text-xs">#{seriesBook.position}</div>
                  </div>
                </div>
              )}
              
              {/* Status overlay */}
              <div className="absolute top-2 left-2">
                {seriesBook.status === 'owned' && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    ✓ Owned
                  </span>
                )}
                {seriesBook.status === 'missing' && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    ❌ Missing
                  </span>
                )}
                {seriesBook.status === 'wanted' && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    ⭐ Wanted
                  </span>
                )}
              </div>
              
              {/* Book number */}
              <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-full">
                #{seriesBook.position}
              </div>
            </div>
            
            {/* Book Info */}
            <div className="p-3">
              <h3 className="font-semibold text-sm text-booktarr-text mb-1 line-clamp-2" title={seriesBook.title}>
                {seriesBook.title}
              </h3>
              
              <div className="text-xs text-booktarr-textMuted space-y-1">
                {seriesBook.release_date && (
                  <div>📅 {new Date(seriesBook.release_date).getFullYear()}</div>
                )}
                {seriesBook.publisher && (
                  <div>🏢 {seriesBook.publisher}</div>
                )}
                {seriesBook.isbn_13 && (
                  <div>📖 {seriesBook.isbn_13}</div>
                )}
                {seriesBook.price && (
                  <div>💰 ${seriesBook.price}</div>
                )}
              </div>
              
              {/* Action buttons for missing books */}
              {seriesBook.status === 'missing' && (
                <button className="mt-2 w-full bg-booktarr-accent text-white text-xs py-1 px-2 rounded hover:bg-booktarr-accent/90 transition-colors">
                  Add to Wishlist
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {filteredBooks.length === 0 && (
        <div className="text-center py-12 text-booktarr-textMuted">
          <span className="text-4xl block mb-4">📚</span>
          <p>No books found matching the current filter.</p>
        </div>
      )}
    </div>
  );
};

export default SeriesDetailsPage;