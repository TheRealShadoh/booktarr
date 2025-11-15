/**
 * Publisher Discovery Page - Browse and discover books by publisher
 */
import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, BooksBySeriesMap, ReadingStatus } from '../types';
import BookCard from './BookCard';
import LoadingSpinner from './LoadingSpinner';

interface PublisherDiscoveryPageProps {
  books: BooksBySeriesMap;
  allBooks: Book[];
  loading: boolean;
  error: string | null;
  onBookClick?: (book: Book) => void;
}

interface PublisherStats {
  name: string;
  totalBooks: number;
  booksOwned: number;
  avgRating: number;
  categories: string[];
  yearRange: { min: number; max: number } | null;
  highestRated: Book | null;
}

const PublisherDiscoveryPage: React.FC<PublisherDiscoveryPageProps> = ({
  books,
  allBooks,
  loading,
  error,
  onBookClick
}) => {
  const navigate = useNavigate();
  const [selectedPublisher, setSelectedPublisher] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'count' | 'owned' | 'rating'>('count');

  // Calculate statistics for each publisher
  const publisherStats = useMemo(() => {
    const publishers = new Map<string, Book[]>();

    allBooks.forEach(book => {
      if (book.publisher && book.publisher.trim()) {
        const publisherName = book.publisher.trim();
        if (!publishers.has(publisherName)) {
          publishers.set(publisherName, []);
        }
        publishers.get(publisherName)!.push(book);
      }
    });

    const stats: PublisherStats[] = [];

    publishers.forEach((publisherBooks, publisherName) => {
      const ownedBooks = publisherBooks.filter(b => b.reading_status !== ReadingStatus.WISHLIST);
      const ratedBooks = publisherBooks.filter(b => b.personal_rating && b.personal_rating > 0);
      const avgRating = ratedBooks.length > 0
        ? ratedBooks.reduce((sum, b) => sum + (b.personal_rating || 0), 0) / ratedBooks.length
        : 0;

      const categories = new Set(publisherBooks.flatMap(b => b.categories));
      const years = publisherBooks
        .map(b => b.published_date ? new Date(b.published_date).getFullYear() : null)
        .filter((y): y is number => y !== null);

      const yearRange = years.length > 0
        ? { min: Math.min(...years), max: Math.max(...years) }
        : null;

      const highestRated = [...publisherBooks]
        .sort((a, b) => (b.personal_rating || 0) - (a.personal_rating || 0))
        .find(b => b.personal_rating && b.personal_rating > 0) || null;

      stats.push({
        name: publisherName,
        totalBooks: publisherBooks.length,
        booksOwned: ownedBooks.length,
        avgRating,
        categories: Array.from(categories),
        yearRange,
        highestRated
      });
    });

    return stats;
  }, [allBooks]);

  // Sort publishers
  const sortedPublishers = useMemo(() => {
    const sorted = [...publisherStats];

    switch (sortBy) {
      case 'owned':
        return sorted.sort((a, b) => b.booksOwned - a.booksOwned);
      case 'rating':
        return sorted.sort((a, b) => b.avgRating - a.avgRating);
      case 'count':
      default:
        return sorted.sort((a, b) => b.totalBooks - a.totalBooks);
    }
  }, [publisherStats, sortBy]);

  // Get books for selected publisher
  const selectedPublisherBooks = useMemo(() => {
    if (!selectedPublisher) return [];

    return allBooks.filter(book =>
      book.publisher && book.publisher.trim() === selectedPublisher
    );
  }, [allBooks, selectedPublisher]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message="Loading publisher data..." />
      </div>
    );
  }

  if (publisherStats.length === 0) {
    return (
      <div className="booktarr-card">
        <div className="booktarr-card-body">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z" />
            </svg>
            <h3 className="text-booktarr-text text-lg font-semibold mb-2">No Publishers Found</h3>
            <p className="text-booktarr-textSecondary text-sm">
              Add books with publisher information to see them here.
            </p>
          </div>
        </div>
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
              <h1 className="text-booktarr-text text-2xl font-bold mb-2">Publisher Directory</h1>
              <p className="text-booktarr-textSecondary text-sm">
                Browse books by publisher. Found {publisherStats.length} publisher{publisherStats.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'count' | 'owned' | 'rating')}
                className="booktarr-input text-sm"
              >
                <option value="count">Most Books</option>
                <option value="owned">Most Owned</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Publisher List */}
        <div className="lg:col-span-1">
          <div className="booktarr-card sticky top-4">
            <div className="booktarr-card-header">
              <h2 className="text-lg font-semibold text-booktarr-text">Publishers</h2>
            </div>
            <div className="booktarr-card-body max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {sortedPublishers.map(publisher => (
                  <button
                    key={publisher.name}
                    onClick={() => setSelectedPublisher(publisher.name)}
                    className={`w-full text-left p-3 rounded-lg transition-all border ${
                      selectedPublisher === publisher.name
                        ? 'bg-booktarr-accent bg-opacity-10 border-booktarr-accent text-booktarr-accent'
                        : 'border-booktarr-border hover:border-booktarr-accent text-booktarr-text hover:bg-booktarr-surface2'
                    }`}
                  >
                    <div className="font-semibold text-sm truncate">{publisher.name}</div>
                    <div className="text-xs text-booktarr-textSecondary mt-1">
                      {publisher.booksOwned}/{publisher.totalBooks} owned
                      {publisher.avgRating > 0 && ` • ★ ${publisher.avgRating.toFixed(1)}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Publisher Details and Books */}
        <div className="lg:col-span-2">
          {selectedPublisher ? (
            <div className="space-y-6">
              {/* Publisher Stats */}
              {publisherStats.find(p => p.name === selectedPublisher) && (
                <div className="booktarr-card">
                  <div className="booktarr-card-header">
                    <h2 className="text-2xl font-bold text-booktarr-text">{selectedPublisher}</h2>
                  </div>
                  <div className="booktarr-card-body">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div>
                        <div className="text-2xl font-bold text-booktarr-accent">
                          {publisherStats.find(p => p.name === selectedPublisher)?.totalBooks}
                        </div>
                        <div className="text-sm text-booktarr-textSecondary">Total Books</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-booktarr-accent">
                          {publisherStats.find(p => p.name === selectedPublisher)?.booksOwned}
                        </div>
                        <div className="text-sm text-booktarr-textSecondary">Books Owned</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-booktarr-accent">
                          {publisherStats.find(p => p.name === selectedPublisher)?.avgRating.toFixed(1)}
                        </div>
                        <div className="text-sm text-booktarr-textSecondary">Avg Rating</div>
                      </div>
                    </div>

                    {/* Publisher details */}
                    {publisherStats.find(p => p.name === selectedPublisher) && (
                      <div className="space-y-3">
                        {publisherStats.find(p => p.name === selectedPublisher)?.yearRange && (
                          <div>
                            <div className="text-sm font-semibold text-booktarr-text">Publishing Years</div>
                            <div className="text-sm text-booktarr-textSecondary">
                              {publisherStats.find(p => p.name === selectedPublisher)?.yearRange?.min} - {publisherStats.find(p => p.name === selectedPublisher)?.yearRange?.max}
                            </div>
                          </div>
                        )}

                        {publisherStats.find(p => p.name === selectedPublisher)?.categories.length! > 0 && (
                          <div>
                            <div className="text-sm font-semibold text-booktarr-text mb-2">Categories</div>
                            <div className="flex flex-wrap gap-2">
                              {publisherStats.find(p => p.name === selectedPublisher)?.categories.slice(0, 6).map(category => (
                                <div key={category} className="px-2 py-1 bg-booktarr-surface2 text-booktarr-textSecondary text-xs rounded">
                                  {category}
                                </div>
                              ))}
                              {publisherStats.find(p => p.name === selectedPublisher)?.categories.length! > 6 && (
                                <div className="px-2 py-1 bg-booktarr-surface2 text-booktarr-textSecondary text-xs rounded">
                                  +{publisherStats.find(p => p.name === selectedPublisher)?.categories.length! - 6} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {publisherStats.find(p => p.name === selectedPublisher)?.highestRated && (
                          <div>
                            <div className="text-sm font-semibold text-booktarr-text mb-2">Highest Rated</div>
                            <div className="text-sm text-booktarr-text">
                              {publisherStats.find(p => p.name === selectedPublisher)?.highestRated?.title}
                            </div>
                            <div className="text-sm text-booktarr-textSecondary">
                              ★ {publisherStats.find(p => p.name === selectedPublisher)?.highestRated?.personal_rating}/5
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Books from this publisher */}
              <div className="booktarr-card">
                <div className="booktarr-card-header">
                  <h3 className="text-lg font-semibold text-booktarr-text">
                    Books ({selectedPublisherBooks.length})
                  </h3>
                </div>
                <div className="booktarr-card-body">
                  {selectedPublisherBooks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-booktarr-textMuted">No books from this publisher</p>
                    </div>
                  ) : (
                    <div className="booktarr-book-grid">
                      {selectedPublisherBooks.map(book => (
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
            </div>
          ) : (
            <div className="booktarr-card">
              <div className="booktarr-card-body">
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="text-booktarr-text text-lg font-semibold mb-2">Select a Publisher</h3>
                  <p className="text-booktarr-textSecondary text-sm">
                    Choose a publisher from the list to see their books
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublisherDiscoveryPage;
