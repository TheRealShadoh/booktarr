/**
 * Author Profile Page - Shows all books by an author with statistics
 */
import React, { useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Book, BooksBySeriesMap, ReadingStatus } from '../types';
import BookCard from './BookCard';
import LoadingSpinner from './LoadingSpinner';

interface AuthorProfilePageProps {
  books: BooksBySeriesMap;
  allBooks: Book[];
  loading: boolean;
  error: string | null;
  onBookClick?: (book: Book) => void;
}

interface AuthorStats {
  totalBooks: number;
  booksOwned: number;
  booksWanted: number;
  totalPages: number;
  avgRating: number;
  highestRated: Book | null;
  seriesList: string[];
  readCount: number;
  readingCount: number;
  unreadCount: number;
}

const AuthorProfilePage: React.FC<AuthorProfilePageProps> = ({
  books,
  allBooks,
  loading,
  error,
  onBookClick
}) => {
  const { authorName } = useParams<{ authorName?: string }>();
  const navigate = useNavigate();
  const decodedAuthorName = authorName ? decodeURIComponent(authorName) : '';

  // Get all books by this author
  const authorBooks = useMemo(() => {
    return allBooks.filter(book =>
      book.authors.some(author =>
        author.toLowerCase() === decodedAuthorName.toLowerCase()
      )
    );
  }, [allBooks, decodedAuthorName]);

  // Calculate author statistics
  const authorStats = useMemo((): AuthorStats => {
    const stats: AuthorStats = {
      totalBooks: authorBooks.length,
      booksOwned: 0,
      booksWanted: 0,
      totalPages: 0,
      avgRating: 0,
      highestRated: null,
      seriesList: [],
      readCount: 0,
      readingCount: 0,
      unreadCount: 0
    };

    let totalRating = 0;
    let ratedCount = 0;
    const seriesSet = new Set<string>();
    let highestRating = 0;

    authorBooks.forEach(book => {
      // Ownership counting
      const isOwned = book.reading_status !== ReadingStatus.WISHLIST;
      if (isOwned) {
        stats.booksOwned++;
      } else {
        stats.booksWanted++;
      }

      // Pages and ratings
      if (book.page_count) {
        stats.totalPages += book.page_count;
      }

      if (book.personal_rating && book.personal_rating > 0) {
        totalRating += book.personal_rating;
        ratedCount++;

        if (book.personal_rating > highestRating) {
          highestRating = book.personal_rating;
          stats.highestRated = book;
        }
      }

      // Series tracking
      if (book.series && book.series !== 'Standalone') {
        seriesSet.add(book.series);
      }

      // Reading status
      if (book.reading_status === ReadingStatus.READ) {
        stats.readCount++;
      } else if (book.reading_status === ReadingStatus.READING) {
        stats.readingCount++;
      } else if (book.reading_status === ReadingStatus.UNREAD) {
        stats.unreadCount++;
      }
    });

    stats.avgRating = ratedCount > 0 ? totalRating / ratedCount : 0;
    stats.seriesList = Array.from(seriesSet).sort();

    return stats;
  }, [authorBooks]);

  // Group books by series
  const booksBySeries = useMemo(() => {
    const grouped: Record<string, Book[]> = {};

    authorBooks.forEach(book => {
      const series = book.series || 'Standalone';
      if (!grouped[series]) {
        grouped[series] = [];
      }
      grouped[series].push(book);
    });

    // Sort books within each series by position
    Object.keys(grouped).forEach(series => {
      grouped[series].sort((a, b) => {
        if (a.series_position && b.series_position) {
          return a.series_position - b.series_position;
        }
        return 0;
      });
    });

    return grouped;
  }, [authorBooks]);

  // Get books missing from series
  const missingFromSeries = useMemo(() => {
    const missing: Record<string, number> = {};

    Object.entries(booksBySeries).forEach(([series, books]) => {
      if (series !== 'Standalone') {
        const positions = books
          .filter(b => b.series_position)
          .map(b => b.series_position as number)
          .sort((a, b) => a - b);

        if (positions.length > 0) {
          const maxPosition = positions[positions.length - 1];
          const ownedCount = books.filter(
            b => b.reading_status !== ReadingStatus.WISHLIST
          ).length;
          const missingCount = maxPosition - ownedCount;

          if (missingCount > 0) {
            missing[series] = missingCount;
          }
        }
      }
    });

    return missing;
  }, [booksBySeries]);

  const handleSeriesClick = useCallback((series: string) => {
    navigate(`/series/${encodeURIComponent(series)}`);
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message={`Loading ${decodedAuthorName}'s profile...`} />
      </div>
    );
  }

  if (authorBooks.length === 0) {
    return (
      <div className="booktarr-card">
        <div className="booktarr-card-body">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z" />
            </svg>
            <h3 className="text-booktarr-text text-lg font-semibold mb-2">Author Not Found</h3>
            <p className="text-booktarr-textSecondary text-sm">
              No books by {decodedAuthorName} in your collection.
            </p>
            <button
              onClick={() => navigate('/advanced-search')}
              className="booktarr-btn booktarr-btn-primary mt-4"
            >
              Search for Books
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Author Header */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-booktarr-text text-3xl font-bold mb-2">{decodedAuthorName}</h1>
              <p className="text-booktarr-textSecondary text-sm">
                Author of {authorStats.totalBooks} book{authorStats.totalBooks !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/advanced-search')}
                className="booktarr-btn booktarr-btn-secondary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search More
              </button>
              <button
                onClick={() => navigate('/')}
                className="booktarr-btn booktarr-btn-secondary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="booktarr-card">
          <div className="booktarr-card-body">
            <div className="text-center">
              <div className="text-3xl font-bold text-booktarr-accent">{authorStats.booksOwned}</div>
              <div className="text-sm text-booktarr-textSecondary mt-1">Books Owned</div>
            </div>
          </div>
        </div>

        <div className="booktarr-card">
          <div className="booktarr-card-body">
            <div className="text-center">
              <div className="text-3xl font-bold text-booktarr-accent">{authorStats.readCount}</div>
              <div className="text-sm text-booktarr-textSecondary mt-1">Books Read</div>
            </div>
          </div>
        </div>

        <div className="booktarr-card">
          <div className="booktarr-card-body">
            <div className="text-center">
              <div className="text-3xl font-bold text-booktarr-accent">
                {authorStats.avgRating > 0 ? authorStats.avgRating.toFixed(1) : '—'}
              </div>
              <div className="text-sm text-booktarr-textSecondary mt-1">Avg Rating</div>
            </div>
          </div>
        </div>

        <div className="booktarr-card">
          <div className="booktarr-card-body">
            <div className="text-center">
              <div className="text-3xl font-bold text-booktarr-accent">{authorStats.seriesList.length}</div>
              <div className="text-sm text-booktarr-textSecondary mt-1">Series</div>
            </div>
          </div>
        </div>
      </div>

      {/* Series Overview */}
      {authorStats.seriesList.length > 0 && (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">Series by {decodedAuthorName}</h2>
          </div>
          <div className="booktarr-card-body">
            <div className="space-y-3">
              {authorStats.seriesList.map(series => {
                const seriesBooks = booksBySeries[series];
                const ownedCount = seriesBooks.filter(b => b.reading_status !== ReadingStatus.WISHLIST).length;
                const totalCount = seriesBooks.length;
                const missing = missingFromSeries[series] || 0;

                return (
                  <div
                    key={series}
                    onClick={() => handleSeriesClick(series)}
                    className="p-4 bg-booktarr-surface2 rounded-lg cursor-pointer hover:bg-booktarr-surface hover:border-booktarr-accent border border-transparent transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-booktarr-text">{series}</h3>
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-booktarr-textSecondary">
                          {ownedCount}/{totalCount} owned
                        </div>
                        {missing > 0 && (
                          <div className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                            {missing} missing
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-booktarr-surface rounded-full h-2">
                      <div
                        className="bg-booktarr-accent h-2 rounded-full transition-all"
                        style={{ width: `${(ownedCount / totalCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Books by Series */}
      <div className="space-y-6">
        {Object.entries(booksBySeries).map(([series, booksInSeries]) => (
          <div key={series} className="booktarr-card">
            <div className="booktarr-card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-booktarr-text">
                  {series === 'Standalone' ? 'Standalone Books' : series}
                </h2>
                <div className="text-sm text-booktarr-textSecondary">
                  {booksInSeries.length} book{booksInSeries.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="booktarr-card-body">
              <div className="booktarr-book-grid">
                {booksInSeries.map(book => (
                  <BookCard
                    key={book.isbn}
                    book={book}
                    onClick={() => onBookClick?.(book)}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuthorProfilePage;
