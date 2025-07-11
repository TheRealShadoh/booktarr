/**
 * Bulk edit page for managing multiple books at once
 */
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { BooksBySeriesMap, Book } from '../types';
import BookCard from './BookCard';
import LoadingSpinner from './LoadingSpinner';

interface BulkEditPageProps {
  books: BooksBySeriesMap;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

interface BulkEditOperation {
  type: 'reading_status' | 'categories' | 'rating' | 'language' | 'series' | 'delete';
  value: any;
  mode: 'set' | 'add' | 'remove';
}

const BulkEditPage: React.FC<BulkEditPageProps> = ({
  books,
  loading,
  error,
  onRefresh
}) => {
  const { showToast } = useAppContext();
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'series' | 'author' | 'category'>('all');
  const [filterValue, setFilterValue] = useState('');
  const [bulkOperation, setBulkOperation] = useState<BulkEditOperation>({
    type: 'reading_status',
    value: '',
    mode: 'set'
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const allBooks = useMemo(() => Object.values(books).flat(), [books]);

  // Filter books based on search and filter criteria
  const filteredBooks = useMemo(() => {
    let filtered = allBooks;

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(query) ||
        book.authors.some(author => author.toLowerCase().includes(query)) ||
        book.isbn.includes(query) ||
        (book.series && book.series.toLowerCase().includes(query))
      );
    }

    // Apply additional filters
    if (filterBy !== 'all' && filterValue) {
      switch (filterBy) {
        case 'series':
          filtered = filtered.filter(book => book.series === filterValue);
          break;
        case 'author':
          filtered = filtered.filter(book => book.authors.includes(filterValue));
          break;
        case 'category':
          filtered = filtered.filter(book => book.categories.includes(filterValue));
          break;
      }
    }

    return filtered;
  }, [allBooks, searchQuery, filterBy, filterValue]);

  // Get unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const series = [...new Set(allBooks.map(book => book.series).filter(Boolean))].sort();
    const authors = [...new Set(allBooks.flatMap(book => book.authors))].sort();
    const categories = [...new Set(allBooks.flatMap(book => book.categories))].sort();
    
    return { series, authors, categories };
  }, [allBooks]);

  const handleBookSelect = (isbn: string, selected: boolean) => {
    setSelectedBooks(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(isbn);
      } else {
        newSet.delete(isbn);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedBooks.size === filteredBooks.length) {
      setSelectedBooks(new Set());
    } else {
      setSelectedBooks(new Set(filteredBooks.map(book => book.isbn)));
    }
  };

  const handleSelectBySeries = (seriesName: string) => {
    const seriesBooks = allBooks.filter(book => book.series === seriesName);
    const seriesISBNs = seriesBooks.map(book => book.isbn);
    
    setSelectedBooks(prev => {
      const newSet = new Set(prev);
      seriesISBNs.forEach(isbn => newSet.add(isbn));
      return newSet;
    });
    
    showToast(`Selected all books from "${seriesName}"`, 'success');
  };

  const handleSelectByAuthor = (authorName: string) => {
    const authorBooks = allBooks.filter(book => book.authors.includes(authorName));
    const authorISBNs = authorBooks.map(book => book.isbn);
    
    setSelectedBooks(prev => {
      const newSet = new Set(prev);
      authorISBNs.forEach(isbn => newSet.add(isbn));
      return newSet;
    });
    
    showToast(`Selected all books by "${authorName}"`, 'success');
  };

  const handleBulkEdit = async () => {
    if (selectedBooks.size === 0) {
      showToast('No books selected', 'error');
      return;
    }

    if (bulkOperation.type === 'delete') {
      setShowConfirmDialog(true);
      return;
    }

    try {
      // Simulate API call for bulk edit
      const selectedISBNs = Array.from(selectedBooks);
      
      // This would be replaced with actual API calls
      console.log('Bulk editing books:', selectedISBNs, bulkOperation);
      
      showToast(`Updated ${selectedBooks.size} books`, 'success');
      setSelectedBooks(new Set());
      onRefresh?.();
    } catch (error) {
      showToast(`Failed to update books: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      // Simulate API call for bulk delete
      const selectedISBNs = Array.from(selectedBooks);
      
      // This would be replaced with actual API calls
      console.log('Bulk deleting books:', selectedISBNs);
      
      showToast(`Deleted ${selectedBooks.size} books`, 'success');
      setSelectedBooks(new Set());
      setShowConfirmDialog(false);
      onRefresh?.();
    } catch (error) {
      showToast(`Failed to delete books: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const getOperationLabel = () => {
    switch (bulkOperation.type) {
      case 'reading_status':
        return 'Reading Status';
      case 'categories':
        return 'Categories';
      case 'rating':
        return 'Rating';
      case 'language':
        return 'Language';
      case 'series':
        return 'Series';
      case 'delete':
        return 'Delete Books';
      default:
        return 'Operation';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message="Loading books..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-booktarr-text text-2xl font-bold mb-2">Bulk Edit</h1>
              <p className="text-booktarr-textSecondary text-sm">
                Select multiple books and edit their properties at once
              </p>
            </div>
            <div className="text-booktarr-textSecondary">
              {selectedBooks.size} of {filteredBooks.length} books selected
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-lg font-semibold text-booktarr-text">Find Books</h2>
        </div>
        <div className="booktarr-card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="booktarr-form-label">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="booktarr-form-input"
                placeholder="Search titles, authors, ISBN..."
              />
            </div>
            <div>
              <label className="booktarr-form-label">Filter By</label>
              <select
                value={filterBy}
                onChange={(e) => {
                  setFilterBy(e.target.value as any);
                  setFilterValue('');
                }}
                className="booktarr-form-input"
              >
                <option value="all">All Books</option>
                <option value="series">Series</option>
                <option value="author">Author</option>
                <option value="category">Category</option>
              </select>
            </div>
            <div>
              <label className="booktarr-form-label">
                {filterBy === 'series' ? 'Series' : 
                 filterBy === 'author' ? 'Author' : 
                 filterBy === 'category' ? 'Category' : 'Value'}
              </label>
              {filterBy === 'all' ? (
                <input
                  type="text"
                  disabled
                  className="booktarr-form-input opacity-50"
                  placeholder="Select a filter type"
                />
              ) : (
                <select
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="booktarr-form-input"
                >
                  <option value="">All {filterBy}s</option>
                  {filterBy === 'series' && filterOptions.series.map(series => (
                    <option key={series} value={series}>{series}</option>
                  ))}
                  {filterBy === 'author' && filterOptions.authors.map(author => (
                    <option key={author} value={author}>{author}</option>
                  ))}
                  {filterBy === 'category' && filterOptions.categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Select Actions */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-lg font-semibold text-booktarr-text">Quick Select</h2>
        </div>
        <div className="booktarr-card-body">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSelectAll}
              className="booktarr-btn booktarr-btn-secondary text-sm"
            >
              {selectedBooks.size === filteredBooks.length ? 'Deselect All' : 'Select All Visible'}
            </button>
            <button
              onClick={() => setSelectedBooks(new Set())}
              className="booktarr-btn booktarr-btn-secondary text-sm"
              disabled={selectedBooks.size === 0}
            >
              Clear Selection
            </button>
            
            {/* Quick select by series */}
            {filterOptions.series.slice(0, 5).map(series => (
              <button
                key={series}
                onClick={() => handleSelectBySeries(series)}
                className="booktarr-btn booktarr-btn-secondary text-sm"
              >
                Select "{series}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Operations */}
      {selectedBooks.size > 0 && (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">
              Bulk Edit ({selectedBooks.size} books)
            </h2>
          </div>
          <div className="booktarr-card-body">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="booktarr-form-label">Operation</label>
                <select
                  value={bulkOperation.type}
                  onChange={(e) => setBulkOperation(prev => ({ 
                    ...prev, 
                    type: e.target.value as any,
                    value: ''
                  }))}
                  className="booktarr-form-input"
                >
                  <option value="reading_status">Update Reading Status</option>
                  <option value="categories">Manage Categories</option>
                  <option value="rating">Set Rating</option>
                  <option value="language">Set Language</option>
                  <option value="series">Move to Series</option>
                  <option value="delete">Delete Books</option>
                </select>
              </div>

              {bulkOperation.type !== 'delete' && (
                <>
                  <div>
                    <label className="booktarr-form-label">Mode</label>
                    <select
                      value={bulkOperation.mode}
                      onChange={(e) => setBulkOperation(prev => ({ 
                        ...prev, 
                        mode: e.target.value as any
                      }))}
                      className="booktarr-form-input"
                    >
                      <option value="set">Set/Replace</option>
                      {bulkOperation.type === 'categories' && (
                        <>
                          <option value="add">Add</option>
                          <option value="remove">Remove</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="booktarr-form-label">Value</label>
                    {bulkOperation.type === 'reading_status' ? (
                      <select
                        value={bulkOperation.value}
                        onChange={(e) => setBulkOperation(prev => ({ 
                          ...prev, 
                          value: e.target.value
                        }))}
                        className="booktarr-form-input"
                      >
                        <option value="">Select status...</option>
                        <option value="unread">Unread</option>
                        <option value="reading">Reading</option>
                        <option value="read">Read</option>
                        <option value="wishlist">Wishlist</option>
                        <option value="dnf">Did Not Finish</option>
                      </select>
                    ) : bulkOperation.type === 'rating' ? (
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={bulkOperation.value}
                        onChange={(e) => setBulkOperation(prev => ({ 
                          ...prev, 
                          value: e.target.value
                        }))}
                        className="booktarr-form-input"
                        placeholder="0-5"
                      />
                    ) : (
                      <input
                        type="text"
                        value={bulkOperation.value}
                        onChange={(e) => setBulkOperation(prev => ({ 
                          ...prev, 
                          value: e.target.value
                        }))}
                        className="booktarr-form-input"
                        placeholder={`Enter ${bulkOperation.type}...`}
                      />
                    )}
                  </div>
                </>
              )}

              <div className="flex items-end">
                <button
                  onClick={handleBulkEdit}
                  className={`booktarr-btn ${
                    bulkOperation.type === 'delete' 
                      ? 'booktarr-btn-danger' 
                      : 'booktarr-btn-primary'
                  } w-full`}
                  disabled={bulkOperation.type !== 'delete' && !bulkOperation.value}
                >
                  {bulkOperation.type === 'delete' ? 'Delete Selected' : 'Apply Changes'}
                </button>
              </div>
            </div>

            <div className="text-sm text-booktarr-textMuted">
              This will {bulkOperation.mode} {getOperationLabel().toLowerCase()} 
              {bulkOperation.value && ` to "${bulkOperation.value}"`} for {selectedBooks.size} selected books.
            </div>
          </div>
        </div>
      )}

      {/* Book Grid */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-lg font-semibold text-booktarr-text">
            Books ({filteredBooks.length})
          </h2>
        </div>
        <div className="booktarr-card-body">
          {filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="text-booktarr-text text-lg font-semibold mb-2">No Books Found</h3>
              <p className="text-booktarr-textSecondary text-sm">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="booktarr-book-grid">
              {filteredBooks.map(book => (
                <div key={book.isbn} className="relative">
                  <input
                    type="checkbox"
                    checked={selectedBooks.has(book.isbn)}
                    onChange={(e) => handleBookSelect(book.isbn, e.target.checked)}
                    className="absolute top-2 left-2 z-10 w-4 h-4 rounded border-2 border-white shadow-lg"
                  />
                  <BookCard
                    book={book}
                    onClick={() => handleBookSelect(book.isbn, !selectedBooks.has(book.isbn))}
                    showSeriesInfo={true}
                    className={selectedBooks.has(book.isbn) ? 'ring-2 ring-booktarr-accent' : ''}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="booktarr-card max-w-md w-full mx-4">
            <div className="booktarr-card-header">
              <h2 className="text-lg font-semibold text-booktarr-text">Confirm Delete</h2>
            </div>
            <div className="booktarr-card-body">
              <p className="text-booktarr-textSecondary mb-4">
                Are you sure you want to delete {selectedBooks.size} books? This action cannot be undone.
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleConfirmDelete}
                  className="booktarr-btn booktarr-btn-danger"
                >
                  Delete Books
                </button>
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="booktarr-btn booktarr-btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkEditPage;