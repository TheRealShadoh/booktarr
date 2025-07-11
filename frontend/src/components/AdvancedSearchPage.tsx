/**
 * Advanced search page with multiple filters and criteria
 */
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { BooksBySeriesMap, Book } from '../types';
import BookCard from './BookCard';
import LoadingSpinner from './LoadingSpinner';

interface SearchFilters {
  query: string;
  authors: string[];
  series: string[];
  categories: string[];
  readingStatus: string[];
  publicationYear: {
    min?: number;
    max?: number;
  };
  pageCount: {
    min?: number;
    max?: number;
  };
  rating: {
    min?: number;
    max?: number;
  };
  language: string[];
  hasDescription: boolean | null;
  hasCover: boolean | null;
  addedDate: {
    days?: number; // Last N days
  };
}

interface AdvancedSearchPageProps {
  books: BooksBySeriesMap;
  loading: boolean;
  error: string | null;
  onBookClick?: (book: Book) => void;
}

const AdvancedSearchPage: React.FC<AdvancedSearchPageProps> = ({
  books,
  loading,
  error,
  onBookClick
}) => {
  const { showToast } = useAppContext();
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    authors: [],
    series: [],
    categories: [],
    readingStatus: [],
    publicationYear: {},
    pageCount: {},
    rating: {},
    language: [],
    hasDescription: null,
    hasCover: null,
    addedDate: {}
  });
  const [showFilters, setShowFilters] = useState(true);
  const [savedSearches, setSavedSearches] = useState<Array<{id: string, name: string, filters: SearchFilters}>>([]);

  // Extract all unique values for filter options
  const filterOptions = useMemo(() => {
    const allBooks = Object.values(books).flat();
    
    const authors = [...new Set(allBooks.flatMap(book => book.authors))].sort();
    const series = [...new Set(allBooks.map(book => book.series).filter(Boolean))].sort();
    const categories = [...new Set(allBooks.flatMap(book => book.categories))].sort();
    const languages = [...new Set(allBooks.map(book => book.language))].sort();
    const readingStatuses = ['unread', 'reading', 'read', 'wishlist', 'dnf'];

    return { authors, series, categories, languages, readingStatuses };
  }, [books]);

  // Filter books based on current filters
  const filteredBooks = useMemo(() => {
    const allBooks = Object.values(books).flat();
    
    return allBooks.filter(book => {
      // Text query
      if (filters.query) {
        const query = filters.query.toLowerCase();
        const searchFields = [
          book.title,
          ...book.authors,
          book.series || '',
          book.description,
          ...book.categories,
          book.isbn
        ].join(' ').toLowerCase();
        
        if (!searchFields.includes(query)) return false;
      }

      // Authors filter
      if (filters.authors.length > 0) {
        if (!filters.authors.some(author => book.authors.includes(author))) return false;
      }

      // Series filter
      if (filters.series.length > 0) {
        if (!book.series || !filters.series.includes(book.series)) return false;
      }

      // Categories filter
      if (filters.categories.length > 0) {
        if (!filters.categories.some(category => book.categories.includes(category))) return false;
      }

      // Reading status filter
      if (filters.readingStatus.length > 0) {
        if (!filters.readingStatus.includes(book.reading_status)) return false;
      }

      // Publication year filter
      if (filters.publicationYear.min || filters.publicationYear.max) {
        const year = book.published_date ? new Date(book.published_date).getFullYear() : null;
        if (!year) return false;
        if (filters.publicationYear.min && year < filters.publicationYear.min) return false;
        if (filters.publicationYear.max && year > filters.publicationYear.max) return false;
      }

      // Page count filter
      if (filters.pageCount.min || filters.pageCount.max) {
        const pages = book.page_count || 0;
        if (filters.pageCount.min && pages < filters.pageCount.min) return false;
        if (filters.pageCount.max && pages > filters.pageCount.max) return false;
      }

      // Rating filter
      if (filters.rating.min || filters.rating.max) {
        const rating = book.rating || 0;
        if (filters.rating.min && rating < filters.rating.min) return false;
        if (filters.rating.max && rating > filters.rating.max) return false;
      }

      // Language filter
      if (filters.language.length > 0) {
        if (!filters.language.includes(book.language)) return false;
      }

      // Has description filter
      if (filters.hasDescription !== null) {
        const hasDesc = book.description && book.description.trim().length > 0;
        if (filters.hasDescription && !hasDesc) return false;
        if (!filters.hasDescription && hasDesc) return false;
      }

      // Has cover filter
      if (filters.hasCover !== null) {
        const hasCover = book.thumbnail && book.thumbnail.trim().length > 0;
        if (filters.hasCover && !hasCover) return false;
        if (!filters.hasCover && hasCover) return false;
      }

      // Added date filter
      if (filters.addedDate.days) {
        const addedDate = new Date(book.date_added);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - filters.addedDate.days);
        if (addedDate < cutoffDate) return false;
      }

      return true;
    });
  }, [books, filters]);

  const handleFilterChange = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleMultiSelectChange = (key: keyof SearchFilters, value: string, checked: boolean) => {
    setFilters(prev => {
      const currentArray = prev[key] as string[];
      if (checked) {
        return { ...prev, [key]: [...currentArray, value] };
      } else {
        return { ...prev, [key]: currentArray.filter(item => item !== value) };
      }
    });
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      authors: [],
      series: [],
      categories: [],
      readingStatus: [],
      publicationYear: {},
      pageCount: {},
      rating: {},
      language: [],
      hasDescription: null,
      hasCover: null,
      addedDate: {}
    });
  };

  const saveSearch = () => {
    const name = prompt('Enter a name for this search:');
    if (name) {
      const savedSearch = {
        id: Date.now().toString(),
        name,
        filters: { ...filters }
      };
      setSavedSearches(prev => [...prev, savedSearch]);
      showToast(`Search "${name}" saved`, 'success');
    }
  };

  const loadSavedSearch = (search: typeof savedSearches[0]) => {
    setFilters(search.filters);
    showToast(`Search "${search.name}" loaded`, 'success');
  };

  const deleteSavedSearch = (searchId: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== searchId));
    showToast('Saved search deleted', 'success');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message="Loading books..." />
      </div>
    );
  }

  const hasActiveFilters = filters.query || 
    filters.authors.length > 0 || 
    filters.series.length > 0 || 
    filters.categories.length > 0 || 
    filters.readingStatus.length > 0 ||
    Object.keys(filters.publicationYear).length > 0 ||
    Object.keys(filters.pageCount).length > 0 ||
    Object.keys(filters.rating).length > 0 ||
    filters.language.length > 0 ||
    filters.hasDescription !== null ||
    filters.hasCover !== null ||
    Object.keys(filters.addedDate).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-booktarr-text text-2xl font-bold mb-2">Advanced Search</h1>
              <p className="text-booktarr-textSecondary text-sm">
                Find books using multiple criteria and filters
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="booktarr-btn booktarr-btn-secondary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="booktarr-btn booktarr-btn-secondary"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={saveSearch}
                className="booktarr-btn booktarr-btn-primary"
                disabled={!hasActiveFilters}
              >
                Save Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-booktarr-textSecondary">
          Found <span className="font-medium text-booktarr-text">{filteredBooks.length}</span> books
          {hasActiveFilters && (
            <span> matching your criteria</span>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">Search Filters</h2>
          </div>
          <div className="booktarr-card-body space-y-6">
            {/* Text Search */}
            <div>
              <label className="booktarr-form-label">Search Query</label>
              <input
                type="text"
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                className="booktarr-form-input"
                placeholder="Search titles, authors, descriptions..."
              />
            </div>

            {/* Multi-select filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Authors */}
              <div>
                <label className="booktarr-form-label">Authors</label>
                <div className="max-h-32 overflow-y-auto border border-booktarr-border rounded-lg p-2 space-y-1">
                  {filterOptions.authors.slice(0, 10).map(author => (
                    <label key={author} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.authors.includes(author)}
                        onChange={(e) => handleMultiSelectChange('authors', author, e.target.checked)}
                        className="rounded border-booktarr-border"
                      />
                      <span className="text-sm text-booktarr-text">{author}</span>
                    </label>
                  ))}
                  {filterOptions.authors.length > 10 && (
                    <div className="text-xs text-booktarr-textMuted">
                      +{filterOptions.authors.length - 10} more...
                    </div>
                  )}
                </div>
              </div>

              {/* Series */}
              <div>
                <label className="booktarr-form-label">Series</label>
                <div className="max-h-32 overflow-y-auto border border-booktarr-border rounded-lg p-2 space-y-1">
                  {filterOptions.series.slice(0, 10).map(series => (
                    <label key={series} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.series.includes(series)}
                        onChange={(e) => handleMultiSelectChange('series', series, e.target.checked)}
                        className="rounded border-booktarr-border"
                      />
                      <span className="text-sm text-booktarr-text">{series}</span>
                    </label>
                  ))}
                  {filterOptions.series.length > 10 && (
                    <div className="text-xs text-booktarr-textMuted">
                      +{filterOptions.series.length - 10} more...
                    </div>
                  )}
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="booktarr-form-label">Categories</label>
                <div className="max-h-32 overflow-y-auto border border-booktarr-border rounded-lg p-2 space-y-1">
                  {filterOptions.categories.slice(0, 10).map(category => (
                    <label key={category} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(category)}
                        onChange={(e) => handleMultiSelectChange('categories', category, e.target.checked)}
                        className="rounded border-booktarr-border"
                      />
                      <span className="text-sm text-booktarr-text">{category}</span>
                    </label>
                  ))}
                  {filterOptions.categories.length > 10 && (
                    <div className="text-xs text-booktarr-textMuted">
                      +{filterOptions.categories.length - 10} more...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Range filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Publication Year */}
              <div>
                <label className="booktarr-form-label">Publication Year</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={filters.publicationYear.min || ''}
                    onChange={(e) => handleFilterChange('publicationYear', {
                      ...filters.publicationYear,
                      min: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    className="booktarr-form-input"
                    placeholder="Min"
                  />
                  <span className="text-booktarr-textMuted">to</span>
                  <input
                    type="number"
                    value={filters.publicationYear.max || ''}
                    onChange={(e) => handleFilterChange('publicationYear', {
                      ...filters.publicationYear,
                      max: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    className="booktarr-form-input"
                    placeholder="Max"
                  />
                </div>
              </div>

              {/* Page Count */}
              <div>
                <label className="booktarr-form-label">Page Count</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={filters.pageCount.min || ''}
                    onChange={(e) => handleFilterChange('pageCount', {
                      ...filters.pageCount,
                      min: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    className="booktarr-form-input"
                    placeholder="Min"
                  />
                  <span className="text-booktarr-textMuted">to</span>
                  <input
                    type="number"
                    value={filters.pageCount.max || ''}
                    onChange={(e) => handleFilterChange('pageCount', {
                      ...filters.pageCount,
                      max: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    className="booktarr-form-input"
                    placeholder="Max"
                  />
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="booktarr-form-label">Rating</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={filters.rating.min || ''}
                    onChange={(e) => handleFilterChange('rating', {
                      ...filters.rating,
                      min: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    className="booktarr-form-input"
                    placeholder="Min"
                  />
                  <span className="text-booktarr-textMuted">to</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={filters.rating.max || ''}
                    onChange={(e) => handleFilterChange('rating', {
                      ...filters.rating,
                      max: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    className="booktarr-form-input"
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>

            {/* Boolean filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Reading Status */}
              <div>
                <label className="booktarr-form-label">Reading Status</label>
                <div className="space-y-1">
                  {filterOptions.readingStatuses.map(status => (
                    <label key={status} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.readingStatus.includes(status)}
                        onChange={(e) => handleMultiSelectChange('readingStatus', status, e.target.checked)}
                        className="rounded border-booktarr-border"
                      />
                      <span className="text-sm text-booktarr-text capitalize">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Content filters */}
              <div>
                <label className="booktarr-form-label">Content</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hasDescription === true}
                      onChange={(e) => handleFilterChange('hasDescription', e.target.checked ? true : null)}
                      className="rounded border-booktarr-border"
                    />
                    <span className="text-sm text-booktarr-text">Has Description</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hasCover === true}
                      onChange={(e) => handleFilterChange('hasCover', e.target.checked ? true : null)}
                      className="rounded border-booktarr-border"
                    />
                    <span className="text-sm text-booktarr-text">Has Cover Image</span>
                  </label>
                </div>
              </div>

              {/* Date filter */}
              <div>
                <label className="booktarr-form-label">Added Date</label>
                <select
                  value={filters.addedDate.days || ''}
                  onChange={(e) => handleFilterChange('addedDate', {
                    days: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  className="booktarr-form-input"
                >
                  <option value="">Any time</option>
                  <option value="1">Last 24 hours</option>
                  <option value="7">Last week</option>
                  <option value="30">Last month</option>
                  <option value="90">Last 3 months</option>
                  <option value="365">Last year</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">Saved Searches</h2>
          </div>
          <div className="booktarr-card-body">
            <div className="flex flex-wrap gap-2">
              {savedSearches.map(search => (
                <div key={search.id} className="flex items-center space-x-2 bg-booktarr-surface2 rounded-lg px-3 py-2">
                  <button
                    onClick={() => loadSavedSearch(search)}
                    className="text-sm font-medium text-booktarr-text hover:text-booktarr-accent"
                  >
                    {search.name}
                  </button>
                  <button
                    onClick={() => deleteSavedSearch(search.id)}
                    className="text-booktarr-textMuted hover:text-booktarr-error"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="booktarr-card">
        <div className="booktarr-card-body">
          {filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0012 15c-2.34 0-4.29-1.32-5.314-3.266C5.814 10.291 3.982 9 2 9m10 0V9a4 4 0 118 0v-.5" />
              </svg>
              <h3 className="text-booktarr-text text-lg font-semibold mb-2">No Books Found</h3>
              <p className="text-booktarr-textSecondary text-sm">
                {hasActiveFilters 
                  ? 'Try adjusting your search criteria or clearing some filters.'
                  : 'Start by entering a search query or selecting some filters.'
                }
              </p>
            </div>
          ) : (
            <div className="booktarr-book-grid">
              {filteredBooks.map(book => (
                <BookCard
                  key={book.isbn}
                  book={book}
                  onClick={() => onBookClick?.(book)}
                  showSeriesInfo={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchPage;