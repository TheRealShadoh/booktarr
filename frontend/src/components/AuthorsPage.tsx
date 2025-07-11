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
    <div className="space-y-8">
      {/* Authors summary with enhanced visual hierarchy */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-booktarr-text text-2xl font-bold mb-2">Authors Collection</h1>
              <p className="text-booktarr-textSecondary text-sm">
                Browse your library by author and discover your collection
              </p>
            </div>
            <div className="flex items-center space-x-3 bg-booktarr-surface2 rounded-lg p-2">
              <button
                onClick={() => setExpandedAuthors(new Set(authorGroups.map(group => group.name)))}
                className="text-booktarr-accent hover:text-booktarr-accentHover text-sm font-medium transition-colors px-3 py-1 rounded hover:bg-booktarr-hover"
              >
                Expand All
              </button>
              <div className="w-px h-4 bg-booktarr-border"></div>
              <button
                onClick={() => setExpandedAuthors(new Set())}
                className="text-booktarr-accent hover:text-booktarr-accentHover text-sm font-medium transition-colors px-3 py-1 rounded hover:bg-booktarr-hover"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>
        
        <div className="booktarr-card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
              <div className="text-3xl font-bold text-booktarr-accent mb-2">{totalAuthors}</div>
              <div className="text-booktarr-textMuted text-sm uppercase tracking-wider">Authors</div>
            </div>
            <div className="text-center p-4 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
              <div className="text-3xl font-bold text-booktarr-accent mb-2">{totalBooks}</div>
              <div className="text-booktarr-textMuted text-sm uppercase tracking-wider">Total Books</div>
            </div>
            <div className="text-center p-4 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
              <div className="text-3xl font-bold text-booktarr-accent mb-2">
                {totalAuthors > 0 ? Math.round(totalBooks / totalAuthors) : 0}
              </div>
              <div className="text-booktarr-textMuted text-sm uppercase tracking-wider">Avg per Author</div>
            </div>
          </div>
        </div>
      </div>

      {/* Author groups with enhanced visual flow */}
      <div className="space-y-5">
        {authorGroups.map((group) => (
          <div key={group.name} className="booktarr-card">
            <div 
              onClick={() => handleAuthorClick(group.name)}
              className="booktarr-card-header group cursor-pointer hover:bg-booktarr-hover transition-colors duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <svg 
                    className={`w-5 h-5 text-booktarr-accent transition-transform duration-200 ${expandedAuthors.has(group.name) ? 'rotate-90' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-booktarr-accent rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {group.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-booktarr-text group-hover:text-booktarr-accent transition-colors">
                        {group.name}
                      </h3>
                      {!expandedAuthors.has(group.name) && (
                        <div className="text-xs text-booktarr-textMuted mt-1">
                          {group.seriesCount} series • {group.bookCount} books
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-booktarr-text">
                      {group.bookCount} book{group.bookCount !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-booktarr-textMuted">
                      {group.seriesCount} series
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-booktarr-accent rounded-full opacity-50"></div>
                </div>
              </div>
            </div>
            
            {expandedAuthors.has(group.name) && (
              <div className="booktarr-card-body">
                <div className="animate-slide-up space-y-6">
                  {/* Author summary stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-booktarr-surface2 rounded-lg p-4 text-center border border-booktarr-border">
                      <div className="text-lg font-bold text-booktarr-accent">{group.bookCount}</div>
                      <div className="text-xs text-booktarr-textMuted uppercase tracking-wider">Books</div>
                    </div>
                    <div className="bg-booktarr-surface2 rounded-lg p-4 text-center border border-booktarr-border">
                      <div className="text-lg font-bold text-booktarr-accent">{group.seriesCount}</div>
                      <div className="text-xs text-booktarr-textMuted uppercase tracking-wider">Series</div>
                    </div>
                    <div className="bg-booktarr-surface2 rounded-lg p-4 text-center border border-booktarr-border">
                      <div className="text-lg font-bold text-booktarr-accent">
                        {Math.round(group.books.reduce((sum, book) => sum + (book.page_count || 0), 0) / group.bookCount)}
                      </div>
                      <div className="text-xs text-booktarr-textMuted uppercase tracking-wider">Avg Pages</div>
                    </div>
                    <div className="bg-booktarr-surface2 rounded-lg p-4 text-center border border-booktarr-border">
                      <div className="text-lg font-bold text-booktarr-accent">
                        {new Set(group.books.flatMap(book => book.categories)).size}
                      </div>
                      <div className="text-xs text-booktarr-textMuted uppercase tracking-wider">Categories</div>
                    </div>
                  </div>
                  
                  {/* Books grid */}
                  <div>
                    <h4 className="text-sm font-semibold text-booktarr-text mb-4 flex items-center">
                      <svg className="w-4 h-4 text-booktarr-accent mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Books by {group.name}
                    </h4>
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