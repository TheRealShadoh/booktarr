/**
 * Collections page component for advanced library organization
 */
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { BooksBySeriesMap, Book } from '../types';
import BookCard from './BookCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  bookCount: number;
  isSystem: boolean;
  books: string[]; // ISBNs
  tags: string[];
  createdDate: Date;
  lastModified: Date;
}

interface CollectionsPageProps {
  books: BooksBySeriesMap;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
  onBookClick?: (book: Book) => void;
}

const CollectionsPage: React.FC<CollectionsPageProps> = ({
  books,
  loading,
  error,
  onRefresh,
  onBookClick
}) => {
  const { showToast } = useAppContext();
  const [activeView, setActiveView] = useState<'collections' | 'tags'>('collections');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollection, setNewCollection] = useState<Partial<Collection>>({
    color: '#3B82F6',
    icon: 'collection'
  });

  // Default system collections
  const systemCollections: Collection[] = useMemo(() => {
    const allBooks = Object.values(books).flat();
    return [
      {
        id: 'favorites',
        name: 'Favorites',
        description: 'Your favorite books',
        color: '#EF4444',
        icon: 'heart',
        bookCount: allBooks.filter(book => book.personal_rating && book.personal_rating >= 4).length,
        isSystem: true,
        books: allBooks.filter(book => book.personal_rating && book.personal_rating >= 4).map(book => book.isbn),
        tags: [],
        createdDate: new Date(),
        lastModified: new Date()
      },
      {
        id: 'currently-reading',
        name: 'Currently Reading',
        description: 'Books you are currently reading',
        color: '#10B981',
        icon: 'book-open',
        bookCount: allBooks.filter(book => book.reading_status === 'reading').length,
        isSystem: true,
        books: allBooks.filter(book => book.reading_status === 'reading').map(book => book.isbn),
        tags: [],
        createdDate: new Date(),
        lastModified: new Date()
      },
      {
        id: 'to-read',
        name: 'To Read',
        description: 'Books on your reading list',
        color: '#F59E0B',
        icon: 'bookmark',
        bookCount: allBooks.filter(book => book.reading_status === 'unread' || book.reading_status === 'wishlist').length,
        isSystem: true,
        books: allBooks.filter(book => book.reading_status === 'unread' || book.reading_status === 'wishlist').map(book => book.isbn),
        tags: [],
        createdDate: new Date(),
        lastModified: new Date()
      },
      {
        id: 'completed',
        name: 'Completed',
        description: 'Books you have finished reading',
        color: '#8B5CF6',
        icon: 'check-circle',
        bookCount: allBooks.filter(book => book.reading_status === 'read').length,
        isSystem: true,
        books: allBooks.filter(book => book.reading_status === 'read').map(book => book.isbn),
        tags: [],
        createdDate: new Date(),
        lastModified: new Date()
      },
      {
        id: 'recent',
        name: 'Recently Added',
        description: 'Books added in the last 30 days',
        color: '#06B6D4',
        icon: 'clock',
        bookCount: allBooks.filter(book => {
          const addedDate = new Date(book.added_date);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return addedDate > thirtyDaysAgo;
        }).length,
        isSystem: true,
        books: allBooks.filter(book => {
          const addedDate = new Date(book.added_date);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return addedDate > thirtyDaysAgo;
        }).map(book => book.isbn),
        tags: [],
        createdDate: new Date(),
        lastModified: new Date()
      }
    ];
  }, [books]);

  const [customCollections, setCustomCollections] = useState<Collection[]>([]);

  const allCollections = [...systemCollections, ...customCollections];

  // Extract all unique tags from books
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    Object.values(books).flat().forEach(book => {
      book.categories.forEach(category => tagSet.add(category));
    });
    return Array.from(tagSet).sort();
  }, [books]);

  const handleCreateCollection = () => {
    if (!newCollection.name) {
      showToast('Collection name is required', 'error');
      return;
    }

    const collection: Collection = {
      id: `custom-${Date.now()}`,
      name: newCollection.name,
      description: newCollection.description || '',
      color: newCollection.color || '#3B82F6',
      icon: newCollection.icon || 'collection',
      bookCount: 0,
      isSystem: false,
      books: [],
      tags: [],
      createdDate: new Date(),
      lastModified: new Date()
    };

    setCustomCollections(prev => [...prev, collection]);
    setNewCollection({ color: '#3B82F6', icon: 'collection' });
    setShowCreateForm(false);
    showToast(`Collection "${collection.name}" created`, 'success');
  };

  const handleDeleteCollection = (collectionId: string) => {
    const collection = allCollections.find(c => c.id === collectionId);
    if (collection?.isSystem) {
      showToast('Cannot delete system collections', 'error');
      return;
    }

    setCustomCollections(prev => prev.filter(c => c.id !== collectionId));
    if (selectedCollection === collectionId) {
      setSelectedCollection(null);
    }
    showToast('Collection deleted', 'success');
  };

  const getSelectedCollectionBooks = (): Book[] => {
    if (!selectedCollection) return [];
    const collection = allCollections.find(c => c.id === selectedCollection);
    if (!collection) return [];

    const allBooks = Object.values(books).flat();
    return allBooks.filter(book => collection.books.includes(book.isbn));
  };

  const getIconElement = (iconName: string, className: string = "w-5 h-5") => {
    const icons: Record<string, JSX.Element> = {
      heart: (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      ),
      'book-open': (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
      ),
      bookmark: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
        </svg>
      ),
      'check-circle': (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
      clock: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
      collection: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
        </svg>
      ),
      tag: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
        </svg>
      )
    };
    return icons[iconName] || icons.collection;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message="Loading collections..." />
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
              <h1 className="text-booktarr-text text-2xl font-bold mb-2">Collections</h1>
              <p className="text-booktarr-textSecondary text-sm">
                Organize your books into custom collections and browse by tags
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-booktarr-surface2 rounded-lg p-2">
                <button
                  onClick={() => setActiveView('collections')}
                  className={`text-sm font-medium transition-colors px-3 py-1 rounded ${
                    activeView === 'collections'
                      ? 'bg-booktarr-accent text-white'
                      : 'text-booktarr-textSecondary hover:text-booktarr-text hover:bg-booktarr-hover'
                  }`}
                >
                  Collections
                </button>
                <button
                  onClick={() => setActiveView('tags')}
                  className={`text-sm font-medium transition-colors px-3 py-1 rounded ${
                    activeView === 'tags'
                      ? 'bg-booktarr-accent text-white'
                      : 'text-booktarr-textSecondary hover:text-booktarr-text hover:bg-booktarr-hover'
                  }`}
                >
                  Tags
                </button>
              </div>
              {activeView === 'collections' && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="booktarr-btn booktarr-btn-primary"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Collection
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collections View */}
      {activeView === 'collections' && (
        <>
          {/* Create Collection Form */}
          {showCreateForm && (
            <div className="booktarr-card">
              <div className="booktarr-card-header">
                <h2 className="text-lg font-semibold text-booktarr-text">Create New Collection</h2>
              </div>
              <div className="booktarr-card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="booktarr-form-label">Name *</label>
                    <input
                      type="text"
                      value={newCollection.name || ''}
                      onChange={(e) => setNewCollection(prev => ({ ...prev, name: e.target.value }))}
                      className="booktarr-form-input"
                      placeholder="Enter collection name"
                    />
                  </div>
                  <div>
                    <label className="booktarr-form-label">Color</label>
                    <input
                      type="color"
                      value={newCollection.color || '#3B82F6'}
                      onChange={(e) => setNewCollection(prev => ({ ...prev, color: e.target.value }))}
                      className="booktarr-form-input h-10"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="booktarr-form-label">Description</label>
                  <textarea
                    value={newCollection.description || ''}
                    onChange={(e) => setNewCollection(prev => ({ ...prev, description: e.target.value }))}
                    className="booktarr-form-input"
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
                <div className="mt-4 flex items-center space-x-2">
                  <button
                    onClick={handleCreateCollection}
                    className="booktarr-btn booktarr-btn-primary"
                    disabled={!newCollection.name}
                  >
                    Create Collection
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="booktarr-btn booktarr-btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Collections Grid */}
          {selectedCollection ? (
            <div className="booktarr-card">
              <div className="booktarr-card-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedCollection(null)}
                      className="p-2 rounded-lg hover:bg-booktarr-hover transition-colors"
                    >
                      <svg className="w-5 h-5 text-booktarr-textSecondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: allCollections.find(c => c.id === selectedCollection)?.color }}
                      >
                        {getIconElement(allCollections.find(c => c.id === selectedCollection)?.icon || 'collection')}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-booktarr-text">
                          {allCollections.find(c => c.id === selectedCollection)?.name}
                        </h2>
                        <p className="text-booktarr-textSecondary text-sm">
                          {getSelectedCollectionBooks().length} books
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="booktarr-card-body">
                {getSelectedCollectionBooks().length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-booktarr-surface2 rounded-lg flex items-center justify-center mx-auto mb-4">
                      {getIconElement(allCollections.find(c => c.id === selectedCollection)?.icon || 'collection', "w-8 h-8 text-booktarr-textMuted")}
                    </div>
                    <h3 className="text-booktarr-text text-lg font-semibold mb-2">No Books</h3>
                    <p className="text-booktarr-textSecondary text-sm">
                      This collection doesn't have any books yet.
                    </p>
                  </div>
                ) : (
                  <div className="booktarr-book-grid">
                    {getSelectedCollectionBooks().map(book => (
                      <BookCard
                        key={book.isbn}
                        book={book}
                        onClick={() => onBookClick?.(book)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allCollections.map(collection => (
                <div
                  key={collection.id}
                  className="booktarr-card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedCollection(collection.id)}
                >
                  <div className="booktarr-card-body">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: collection.color }}
                        >
                          {getIconElement(collection.icon)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-booktarr-text">{collection.name}</h3>
                          <p className="text-sm text-booktarr-textSecondary">
                            {collection.bookCount} books
                          </p>
                        </div>
                      </div>
                      {!collection.isSystem && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCollection(collection.id);
                          }}
                          className="p-1 rounded text-booktarr-textMuted hover:text-booktarr-error hover:bg-booktarr-error hover:bg-opacity-10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {collection.description && (
                      <p className="text-sm text-booktarr-textMuted mb-4">{collection.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-booktarr-textMuted">
                        {collection.isSystem ? 'System' : 'Custom'}
                      </span>
                      <svg className="w-4 h-4 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tags View */}
      {activeView === 'tags' && (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">Browse by Tags</h2>
            <p className="text-booktarr-textSecondary text-sm mt-1">
              Explore your library by book categories and genres
            </p>
          </div>
          <div className="booktarr-card-body">
            {allTags.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-booktarr-surface2 rounded-lg flex items-center justify-center mx-auto mb-4">
                  {getIconElement('tag', "w-8 h-8 text-booktarr-textMuted")}
                </div>
                <h3 className="text-booktarr-text text-lg font-semibold mb-2">No Tags</h3>
                <p className="text-booktarr-textSecondary text-sm">
                  Your books don't have any categories or tags yet.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => {
                  const bookCount = Object.values(books).flat().filter(book => 
                    book.categories.includes(tag)
                  ).length;
                  
                  return (
                    <div
                      key={tag}
                      className="flex items-center space-x-2 bg-booktarr-surface2 hover:bg-booktarr-hover rounded-lg px-3 py-2 cursor-pointer transition-colors"
                    >
                      {getIconElement('tag', "w-4 h-4 text-booktarr-textMuted")}
                      <span className="text-sm font-medium text-booktarr-text">{tag}</span>
                      <span className="text-xs text-booktarr-textMuted bg-booktarr-background rounded-full px-2 py-1">
                        {bookCount}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionsPage;