import React, { useState } from 'react';
import BookCard from './BookCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { Book, BookListProps, ViewMode } from '../types';

const BookList: React.FC<BookListProps> = ({
  books,
  loading = false,
  error = null,
  onBookClick,
  onRefresh,
  onStatusChange,
  showFilters = true,
  showSort = true,
  showSearch = true,
  viewMode = 'grid'
}) => {
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>(viewMode);
  const [sortBy, setSortBy] = useState<'title' | 'author' | 'dateAdded' | 'rating'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const getSortedBooks = () => {
    const sorted = [...books].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'author':
          aValue = a.authors?.[0]?.toLowerCase() || '';
          bValue = b.authors?.[0]?.toLowerCase() || '';
          break;
        case 'dateAdded':
          aValue = new Date(a.dateAdded || '').getTime();
          bValue = new Date(b.dateAdded || '').getTime();
          break;
        case 'rating':
          aValue = a.rating || 0;
          bValue = b.rating || 0;
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const handleSort = (newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const renderGridView = () => (
    <div className="booktarr-book-grid p-6">
      {getSortedBooks().map((book) => (
        <BookCard
          key={book.id}
          book={book}
          onClick={onBookClick}
          onStatusChange={onStatusChange}
          size="medium"
        />
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-4 p-6">
      {getSortedBooks().map((book) => (
        <div
          key={book.id}
          className="booktarr-card hover:bg-booktarr-hover cursor-pointer"
          onClick={() => onBookClick?.(book)}
        >
          <div className="flex items-center p-4">
            <div className="w-16 h-24 flex-shrink-0">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <div className="w-full h-full bg-booktarr-surface2 rounded flex items-center justify-center">
                  <svg className="w-6 h-6 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              )}
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-booktarr-text">{book.title}</h3>
              <p className="text-booktarr-textSecondary">
                {book.authors?.join(', ') || 'Unknown Author'}
              </p>
              {book.series && (
                <p className="text-booktarr-accent text-sm">
                  {book.series} {book.seriesPosition && `#${book.seriesPosition}`}
                </p>
              )}
              {book.description && (
                <p className="text-booktarr-textMuted text-sm mt-2 line-clamp-2">
                  {book.description}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {book.rating && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-booktarr-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="ml-1 text-sm text-booktarr-textSecondary">
                    {book.rating.toFixed(1)}
                  </span>
                </div>
              )}
              <span className={`booktarr-status-indicator ${
                book.status === 'owned' ? 'booktarr-status-success' :
                book.status === 'wanted' ? 'booktarr-status-warning' :
                book.status === 'read' ? 'booktarr-status-info' :
                'booktarr-status-error'
              }`}>
                {book.status}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" message="Loading books..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage message={error} onRetry={onRefresh} />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <svg className="w-16 h-16 text-booktarr-textMuted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <h3 className="text-xl font-semibold text-booktarr-text mb-2">
          No books found
        </h3>
        <p className="text-booktarr-textSecondary mb-4">
          Start building your library by adding some books.
        </p>
        <button
          onClick={() => onRefresh?.()}
          className="booktarr-btn booktarr-btn-primary"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="border-b border-booktarr-border p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-booktarr-textSecondary">
            {books.length} book{books.length !== 1 ? 's' : ''}
          </span>
          
          {showSort && (
            <div className="flex items-center space-x-2">
              <label className="text-sm text-booktarr-textSecondary">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value as any)}
                className="booktarr-select text-sm py-1 px-2"
              >
                <option value="title">Title</option>
                <option value="author">Author</option>
                <option value="dateAdded">Date Added</option>
                <option value="rating">Rating</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="booktarr-btn booktarr-btn-ghost p-1"
                title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              >
                <svg className={`w-4 h-4 transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentViewMode('grid')}
            className={`booktarr-btn p-2 ${currentViewMode === 'grid' ? 'booktarr-btn-primary' : 'booktarr-btn-ghost'}`}
            title="Grid view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentViewMode('list')}
            className={`booktarr-btn p-2 ${currentViewMode === 'list' ? 'booktarr-btn-primary' : 'booktarr-btn-ghost'}`}
            title="List view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {currentViewMode === 'grid' ? renderGridView() : renderListView()}
    </div>
  );
};

export default BookList;