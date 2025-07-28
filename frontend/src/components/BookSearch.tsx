import React, { useState, useEffect, useRef } from 'react';
import { Book } from '../types';
import { useStateManager } from '../hooks/useStateManager';

interface BookSearchProps {
  onBookSelect: (book: Book) => void;
  onAddNewBook: (searchQuery: string) => void;
  placeholder?: string;
  className?: string;
}

interface SearchResult {
  type: 'book' | 'add_new';
  book?: Book;
  searchQuery?: string;
  title: string;
  subtitle?: string;
}

const BookSearch: React.FC<BookSearchProps> = ({ 
  onBookSelect, 
  onAddNewBook,
  placeholder = "Search books...",
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const { state } = useStateManager();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search books in the collection
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    const lowercaseSearch = searchTerm.toLowerCase();
    
    // Search in local collection - flatten books from series map
    const allBooks = Object.values(state.books).flat();
    const matchingBooks = allBooks.filter((book: Book) => 
      book.title.toLowerCase().includes(lowercaseSearch) ||
      book.authors.some((author: string) => author.toLowerCase().includes(lowercaseSearch)) ||
      (book.series && book.series.toLowerCase().includes(lowercaseSearch)) ||
      (book.isbn && book.isbn.includes(searchTerm)) ||
      (book.isbn13 && book.isbn13.includes(searchTerm)) ||
      (book.isbn10 && book.isbn10.includes(searchTerm))
    );

    const results: SearchResult[] = matchingBooks.slice(0, 5).map((book: Book) => ({
      type: 'book' as const,
      book,
      title: book.title,
      subtitle: `${book.authors.join(', ')}${book.series ? ` • ${book.series}` : ''}`
    }));

    // Add "Add new book" option
    results.push({
      type: 'add_new',
      searchQuery: searchTerm,
      title: `Add "${searchTerm}"`,
      subtitle: 'Search and add new book to collection'
    });

    setSearchResults(results);
    setShowDropdown(true);
    setSelectedIndex(-1);
    setIsSearching(false);
  }, [searchTerm, state.books]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleResultSelect(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleResultSelect = (result: SearchResult) => {
    if (result.type === 'book' && result.book) {
      onBookSelect(result.book);
      setSearchTerm('');
      setShowDropdown(false);
    } else if (result.type === 'add_new' && result.searchQuery) {
      onAddNewBook(result.searchQuery);
      setSearchTerm('');
      setShowDropdown(false);
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full booktarr-form-input pl-10 pr-4"
        data-testid="search-input"
      />
      <svg 
        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-booktarr-textMuted" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>

      {/* Loading indicator */}
      {isSearching && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <svg className="animate-spin h-4 w-4 text-booktarr-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}

      {/* Search results dropdown */}
      {showDropdown && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-booktarr-surface border border-booktarr-border rounded-lg shadow-lg z-50 max-h-96 overflow-auto">
          {searchResults.map((result, index) => (
            <button
              key={index}
              onClick={() => handleResultSelect(result)}
              className={`w-full text-left px-4 py-3 hover:bg-booktarr-hover transition-colors flex items-center space-x-3 ${
                index === selectedIndex ? 'bg-booktarr-hover' : ''
              }`}
            >
              <div className="flex-1">
                <div className="font-medium text-booktarr-text">
                  {result.title}
                </div>
                {result.subtitle && (
                  <div className="text-sm text-booktarr-textMuted">
                    {result.subtitle}
                  </div>
                )}
              </div>
              {result.type === 'book' ? (
                <svg className="w-5 h-5 text-booktarr-textMuted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-booktarr-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookSearch;