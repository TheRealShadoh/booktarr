/**
 * Advanced filter panel component for Sonarr-inspired UI
 */
import React, { useState } from 'react';
import { Book } from '../types';

interface FilterPanelProps {
  books: Book[];
  onFilterChange: (filteredBooks: Book[]) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

interface FilterState {
  authors: string[];
  genres: string[];
  series: string[];
  languages: string[];
  yearRange: { min: number; max: number };
  sortBy: 'title' | 'author' | 'year' | 'series' | 'dateAdded';
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list' | 'table';
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  books,
  onFilterChange,
  isVisible,
  onToggleVisibility
}) => {
  const [filters, setFilters] = useState<FilterState>({
    authors: [],
    genres: [],
    series: [],
    languages: [],
    yearRange: { min: 1900, max: new Date().getFullYear() },
    sortBy: 'title',
    sortOrder: 'asc',
    viewMode: 'grid'
  });

  // Extract unique values for filter options
  const getUniqueValues = (books: Book[], key: string) => {
    const values = new Set<string>();
    books.forEach(book => {
      const value = (book as any)[key];
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'string') {
            values.add(item);
          }
        });
      } else if (value && typeof value === 'string') {
        values.add(value);
      }
    });
    return Array.from(values).sort();
  };

  const uniqueAuthors = getUniqueValues(books, 'authors');
  const uniqueGenres = getUniqueValues(books, 'categories');
  const uniqueSeries = getUniqueValues(books, 'series').filter(s => s !== '');

  const handleFilterChange = (filterType: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const applyFilters = (currentFilters: FilterState) => {
    let filteredBooks = [...books];

    // Apply author filter
    if (currentFilters.authors.length > 0) {
      filteredBooks = filteredBooks.filter(book =>
        book.authors.some(author => currentFilters.authors.includes(author))
      );
    }

    // Apply genre filter
    if (currentFilters.genres.length > 0) {
      filteredBooks = filteredBooks.filter(book =>
        book.categories.some(category => currentFilters.genres.includes(category))
      );
    }

    // Apply series filter
    if (currentFilters.series.length > 0) {
      filteredBooks = filteredBooks.filter(book =>
        book.series && currentFilters.series.includes(book.series)
      );
    }

    // Apply language filter
    if (currentFilters.languages.length > 0) {
      filteredBooks = filteredBooks.filter(book =>
        currentFilters.languages.includes(book.language)
      );
    }

    // Apply year range filter
    filteredBooks = filteredBooks.filter(book => {
      if (!book.published_date) return true;
      const year = new Date(book.published_date).getFullYear();
      return year >= currentFilters.yearRange.min && year <= currentFilters.yearRange.max;
    });

    // Apply sorting
    filteredBooks.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (currentFilters.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'author':
          aValue = a.authors[0]?.toLowerCase() || '';
          bValue = b.authors[0]?.toLowerCase() || '';
          break;
        case 'year':
          aValue = a.published_date ? new Date(a.published_date).getFullYear() : 0;
          bValue = b.published_date ? new Date(b.published_date).getFullYear() : 0;
          break;
        case 'series':
          aValue = a.series?.toLowerCase() || '';
          bValue = b.series?.toLowerCase() || '';
          break;
        case 'dateAdded':
          aValue = new Date(a.added_date).getTime();
          bValue = new Date(b.added_date).getTime();
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (aValue < bValue) return currentFilters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return currentFilters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    onFilterChange(filteredBooks);
  };

  const handleCheckboxChange = (filterType: 'authors' | 'genres' | 'series' | 'languages', value: string) => {
    const currentValues = filters[filterType] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    handleFilterChange(filterType, newValues);
  };

  const clearAllFilters = () => {
    const defaultFilters: FilterState = {
      authors: [],
      genres: [],
      series: [],
      languages: [],
      yearRange: { min: 1900, max: new Date().getFullYear() },
      sortBy: 'title',
      sortOrder: 'asc',
      viewMode: 'grid'
    };
    setFilters(defaultFilters);
    applyFilters(defaultFilters);
  };

  const getActiveFilterCount = () => {
    return filters.authors.length + filters.genres.length + filters.series.length + filters.languages.length;
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="fixed top-20 left-4 z-50 btn btn-secondary shadow-lg"
        title="Show filters"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
        </svg>
        {getActiveFilterCount() > 0 && (
          <span className="absolute -top-2 -right-2 bg-sonarr-accent text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {getActiveFilterCount()}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed left-4 top-20 bottom-4 w-80 z-40 filter-panel shadow-2xl overflow-y-auto scrollbar-thin">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-semibold text-sonarr-text">Filters</h3>
        <div className="flex items-center space-x-2">
          {getActiveFilterCount() > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-sonarr-textSecondary hover:text-sonarr-accent transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={onToggleVisibility}
            className="text-sonarr-textSecondary hover:text-sonarr-text transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="card-body space-y-6">
        {/* Sort Options */}
        <div className="filter-section">
          <h4 className="filter-title mb-3">Sort & View</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-sonarr-textSecondary mb-2">Sort by</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-sonarr-surface2 border border-sonarr-border rounded-lg text-sonarr-text focus:border-sonarr-accent focus:ring-1 focus:ring-sonarr-accent"
              >
                <option value="title">Title</option>
                <option value="author">Author</option>
                <option value="year">Year</option>
                <option value="series">Series</option>
                <option value="dateAdded">Date Added</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  filters.sortOrder === 'asc' 
                    ? 'bg-sonarr-accent text-white' 
                    : 'bg-sonarr-surface2 text-sonarr-textSecondary hover:bg-sonarr-surface3'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
                <span>A-Z</span>
              </button>
              <button
                onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'desc' ? 'asc' : 'desc')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  filters.sortOrder === 'desc' 
                    ? 'bg-sonarr-accent text-white' 
                    : 'bg-sonarr-surface2 text-sonarr-textSecondary hover:bg-sonarr-surface3'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
                <span>Z-A</span>
              </button>
            </div>
          </div>
        </div>

        {/* Authors Filter */}
        {uniqueAuthors.length > 0 && (
          <div className="filter-section">
            <h4 className="filter-title mb-3">Authors ({uniqueAuthors.length})</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
              {uniqueAuthors.slice(0, 10).map(author => (
                <label key={author} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.authors.includes(author)}
                    onChange={() => handleCheckboxChange('authors', author)}
                    className="filter-checkbox"
                  />
                  <span className="filter-checkbox-label">{author}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Series Filter */}
        {uniqueSeries.length > 0 && (
          <div className="filter-section">
            <h4 className="filter-title mb-3">Series ({uniqueSeries.length})</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
              {uniqueSeries.slice(0, 10).map(series => (
                <label key={series} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.series.includes(series)}
                    onChange={() => handleCheckboxChange('series', series)}
                    className="filter-checkbox"
                  />
                  <span className="filter-checkbox-label">{series}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Genres Filter */}
        {uniqueGenres.length > 0 && (
          <div className="filter-section">
            <h4 className="filter-title mb-3">Genres ({uniqueGenres.length})</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
              {uniqueGenres.slice(0, 10).map(genre => (
                <label key={genre} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.genres.includes(genre)}
                    onChange={() => handleCheckboxChange('genres', genre)}
                    className="filter-checkbox"
                  />
                  <span className="filter-checkbox-label">{genre}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Year Range Filter */}
        <div className="filter-section">
          <h4 className="filter-title mb-3">Publication Year</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-sonarr-textSecondary mb-2">
                Range: {filters.yearRange.min} - {filters.yearRange.max}
              </label>
              <input
                type="range"
                min="1900"
                max={new Date().getFullYear()}
                value={filters.yearRange.min}
                onChange={(e) => handleFilterChange('yearRange', { 
                  ...filters.yearRange, 
                  min: parseInt(e.target.value) 
                })}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;