/**
 * Authors page component
 */
import React, { useState, useMemo } from 'react';
import BookCard from './BookCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { BooksBySeriesMap, Book } from '../types';

interface AuthorsPageProps {
  books: BooksBySeriesMap;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

interface AuthorGroup {
  name: string;
  books: Book[];
  bookCount: number;
  seriesCount: number;
}

const AuthorsPage: React.FC<AuthorsPageProps> = ({ books, loading, error, onRefresh }) => {
  const [expandedAuthors, setExpandedAuthors] = useState<Set<string>>(new Set());
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);

  // Group books by author
  const authorGroups = useMemo(() => {
    if (!books) return [];
    
    const authorBookMap: { [author: string]: Book[] } = {};
    
    // Flatten all books and group by author
    Object.values(books).flat().forEach(book => {
      book.authors.forEach(author => {
        if (!authorBookMap[author]) {
          authorBookMap[author] = [];
        }
        authorBookMap[author].push(book);
      });
    });
    
    // Convert to sorted array
    return Object.entries(authorBookMap)
      .map(([authorName, bookList]) => {
        const uniqueSeries = new Set(bookList.map(book => book.series || 'Standalone'));
        return {
          name: authorName,
          books: bookList,
          bookCount: bookList.length,
          seriesCount: uniqueSeries.size
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [books]);

  const totalAuthors = authorGroups.length;
  const totalBooks = useMemo(() => {
    return Object.values(books).flat().length;
  }, [books]);

  const handleToggleAuthor = (authorName: string) => {
    setExpandedAuthors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(authorName)) {
        newSet.delete(authorName);
      } else {
        newSet.add(authorName);
      }
      return newSet;
    });
  };

  const handleAuthorClick = (authorName: string) => {
    setSelectedAuthor(selectedAuthor === authorName ? null : authorName);
    handleToggleAuthor(authorName);
  };

  const handleBookClick = (book: Book) => {
    // TODO: Implement book detail view
    console.log('Book clicked:', book);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message="Loading authors..." />
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

  if (!authorGroups || authorGroups.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="text-center">
          <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-booktarr-text text-xl font-semibold mb-2">No authors found</h3>
          <p className="text-booktarr-textSecondary text-sm max-w-md">
            Your library doesn't contain any books with author information yet.
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="booktarr-btn booktarr-btn-primary"
          >
            Refresh Library
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Authors summary */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-booktarr-text text-xl font-semibold">Authors Collection</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setExpandedAuthors(new Set(authorGroups.map(group => group.name)))}
                className="text-booktarr-accent hover:text-booktarr-accentHover text-sm transition-colors"
              >
                Expand All
              </button>
              <span className="text-booktarr-textMuted">|</span>
              <button
                onClick={() => setExpandedAuthors(new Set())}
                className="text-booktarr-accent hover:text-booktarr-accentHover text-sm transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>
          <p className="text-booktarr-textSecondary text-sm mt-1">
            Browse your library by author and discover your collection
          </p>
        </div>
        
        <div className="booktarr-card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-booktarr-accent">{totalAuthors}</div>
              <div className="text-booktarr-textMuted">Authors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-booktarr-accent">{totalBooks}</div>
              <div className="text-booktarr-textMuted">Total Books</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-booktarr-accent">
                {totalAuthors > 0 ? Math.round(totalBooks / totalAuthors) : 0}
              </div>
              <div className="text-booktarr-textMuted">Avg Books per Author</div>
            </div>
          </div>
        </div>
      </div>

      {/* Author groups */}
      <div className="space-y-6">
        {authorGroups.map((group) => (
          <div key={group.name} className="booktarr-series-section">
            <div 
              onClick={() => handleAuthorClick(group.name)}
              className="booktarr-series-header group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <svg 
                    className={`w-5 h-5 booktarr-series-toggle transition-transform duration-200 ${expandedAuthors.has(group.name) ? 'rotate-90' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div>
                    <h3 className="booktarr-series-title text-lg">
                      {group.name}
                    </h3>
                    {!expandedAuthors.has(group.name) && (
                      <div className="text-xs text-booktarr-textMuted mt-1">
                        {group.seriesCount} series • {group.bookCount} books
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="booktarr-series-count">
                    {group.bookCount} book{group.bookCount !== 1 ? 's' : ''}
                  </span>
                  <span className="px-2 py-1 bg-booktarr-accent text-white text-xs rounded-full">
                    {group.seriesCount} series
                  </span>
                </div>
              </div>
            </div>
            
            {expandedAuthors.has(group.name) && (
              <div className="animate-slide-up">
                <div className="booktarr-book-grid">
                  {group.books.map(book => (
                    <BookCard 
                      key={book.isbn} 
                      book={book} 
                      onClick={handleBookClick}
                      viewMode="grid"
                    />
                  ))}
                </div>
                
                {/* Author summary */}
                <div className="mt-6 p-4 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
                  <h4 className="text-sm font-semibold text-booktarr-text mb-2">Author Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-booktarr-textMuted">Total Books</span>
                      <p className="text-booktarr-text font-medium">{group.bookCount}</p>
                    </div>
                    <div>
                      <span className="text-booktarr-textMuted">Series</span>
                      <p className="text-booktarr-text font-medium">{group.seriesCount}</p>
                    </div>
                    <div>
                      <span className="text-booktarr-textMuted">Avg Pages</span>
                      <p className="text-booktarr-text font-medium">
                        {Math.round(group.books.reduce((sum, book) => sum + (book.page_count || 0), 0) / group.bookCount)}
                      </p>
                    </div>
                    <div>
                      <span className="text-booktarr-textMuted">Categories</span>
                      <p className="text-booktarr-text font-medium">
                        {new Set(group.books.flatMap(book => book.categories)).size}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuthorsPage;