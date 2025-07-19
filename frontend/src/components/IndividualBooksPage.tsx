/**
 * Individual Books page component - shows all books as individual items
 */
import React, { useState, useMemo } from 'react';
import BookCard from './BookCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { BooksBySeriesMap, Book } from '../types';

interface IndividualBooksPageProps {
  books: BooksBySeriesMap;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

const IndividualBooksPage: React.FC<IndividualBooksPageProps> = ({ books, loading, error, onRefresh }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'title' | 'author' | 'series' | 'published_date' | 'added_date'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Flatten all books and sort them
  const individualBooks = useMemo(() => {
    if (!books) return [];
    
    const allBooks = Object.values(books).flat();
    
    return allBooks.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'author':
          comparison = (a.authors[0] || '').localeCompare(b.authors[0] || '');
          break;
        case 'series':
          comparison = (a.series || 'Standalone').localeCompare(b.series || 'Standalone');
          break;
        case 'published_date':
          const dateA = a.published_date ? new Date(a.published_date).getTime() : 0;
          const dateB = b.published_date ? new Date(b.published_date).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'added_date':
          comparison = new Date(a.added_date).getTime() - new Date(b.added_date).getTime();
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [books, sortBy, sortOrder]);

  const totalBooks = individualBooks.length;
  const uniqueSeries = useMemo(() => {
    return new Set(individualBooks.map(book => book.series || 'Standalone')).size;
  }, [individualBooks]);
  const uniqueAuthors = useMemo(() => {
    return new Set(individualBooks.flatMap(book => book.authors)).size;
  }, [individualBooks]);

  const handleBookClick = (book: Book) => {
    // TODO: Implement book detail view
    console.log('Book clicked:', book);
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

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

  if (!individualBooks || individualBooks.length === 0) {
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
      {/* Library summary and controls */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-booktarr-text text-lg font-semibold">
              Your Library
            </h2>
            <div className="flex items-center space-x-4">
              {/* Sort controls */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-booktarr-textMuted">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
                  className="booktarr-form-input text-sm py-1 px-2"
                >
                  <option value="title">Title</option>
                  <option value="author">Author</option>
                  <option value="series">Series</option>
                  <option value="published_date">Published Date</option>
                  <option value="added_date">Added Date</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="text-booktarr-accent hover:text-booktarr-accentHover"
                >
                  {sortOrder === 'asc' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center space-x-1 bg-booktarr-surface2 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`booktarr-btn px-3 py-1 text-sm ${viewMode === 'grid' ? 'booktarr-btn-primary' : 'booktarr-btn-ghost'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`booktarr-btn px-3 py-1 text-sm ${viewMode === 'list' ? 'booktarr-btn-primary' : 'booktarr-btn-ghost'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="booktarr-card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-booktarr-accent">{totalBooks}</div>
              <div className="text-booktarr-textMuted">Total Books</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-booktarr-accent">{uniqueSeries}</div>
              <div className="text-booktarr-textMuted">Series</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-booktarr-accent">{uniqueAuthors}</div>
              <div className="text-booktarr-textMuted">Authors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-booktarr-accent">
                {Math.round(individualBooks.reduce((sum, book) => sum + (book.page_count || 0), 0) / totalBooks) || 0}
              </div>
              <div className="text-booktarr-textMuted">Avg Pages</div>
            </div>
          </div>
        </div>
      </div>

      {/* Books display */}
      <div className="space-y-4">
        {viewMode === 'grid' ? (
          <div className="booktarr-book-grid">
            {individualBooks.map(book => (
              <BookCard 
                key={book.isbn} 
                book={book} 
                onClick={handleBookClick}
                viewMode="grid"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {individualBooks.map(book => (
              <BookCard 
                key={book.isbn} 
                book={book} 
                onClick={handleBookClick}
                viewMode="list"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IndividualBooksPage;