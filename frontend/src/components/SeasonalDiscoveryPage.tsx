/**
 * Seasonal Discovery Page - Browse books by season/year released
 */
import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, BooksBySeriesMap, ReadingStatus } from '../types';
import BookCard from './BookCard';
import LoadingSpinner from './LoadingSpinner';

interface SeasonalDiscoveryPageProps {
  books: BooksBySeriesMap;
  allBooks: Book[];
  loading: boolean;
  error: string | null;
  onBookClick?: (book: Book) => void;
}

interface SeasonStats {
  season: string;
  year: number;
  totalBooks: number;
  booksOwned: number;
  avgRating: number;
  mostPopularBook: Book | null;
}

const SEASONS = ['Winter', 'Spring', 'Summer', 'Fall'];

const getSeason = (date: Date): number => {
  const month = date.getMonth();
  if (month <= 1 || month === 11) return 0; // Winter
  if (month <= 4) return 1; // Spring
  if (month <= 7) return 2; // Summer
  return 3; // Fall
};

const getSeasonName = (seasonIndex: number): string => SEASONS[seasonIndex];

const SeasonalDiscoveryPage: React.FC<SeasonalDiscoveryPageProps> = ({
  books,
  allBooks,
  loading,
  error,
  onBookClick
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'season' | 'year'>('year');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  // Calculate seasonal statistics
  const seasonalStats = useMemo(() => {
    const stats = new Map<string, SeasonStats>();

    allBooks.forEach(book => {
      if (!book.published_date) return;

      const date = new Date(book.published_date);
      const year = date.getFullYear();
      const seasonIndex = getSeason(date);
      const seasonName = getSeasonName(seasonIndex);
      const key = `${seasonName} ${year}`;

      if (!stats.has(key)) {
        stats.set(key, {
          season: seasonName,
          year,
          totalBooks: 0,
          booksOwned: 0,
          avgRating: 0,
          mostPopularBook: null
        });
      }

      const stat = stats.get(key)!;
      stat.totalBooks++;

      if (book.reading_status !== ReadingStatus.WISHLIST) {
        stat.booksOwned++;
      }

      if (!stat.mostPopularBook || (book.personal_rating || 0) > (stat.mostPopularBook.personal_rating || 0)) {
        stat.mostPopularBook = book;
      }
    });

    // Calculate average ratings
    stats.forEach((stat, key) => {
      const seasonBooks = allBooks.filter(book => {
        if (!book.published_date) return false;
        const date = new Date(book.published_date);
        const year = date.getFullYear();
        const seasonIndex = getSeason(date);
        const seasonName = getSeasonName(seasonIndex);
        return `${seasonName} ${year}` === key;
      });

      const ratedBooks = seasonBooks.filter(b => b.personal_rating && b.personal_rating > 0);
      if (ratedBooks.length > 0) {
        stat.avgRating = ratedBooks.reduce((sum, b) => sum + (b.personal_rating || 0), 0) / ratedBooks.length;
      }
    });

    return stats;
  }, [allBooks]);

  // Group by year
  const yearStats = useMemo(() => {
    const years = new Map<number, { totalBooks: number; booksOwned: number; avgRating: number }>();

    allBooks.forEach(book => {
      if (!book.published_date) return;

      const date = new Date(book.published_date);
      const year = date.getFullYear();

      if (!years.has(year)) {
        years.set(year, {
          totalBooks: 0,
          booksOwned: 0,
          avgRating: 0
        });
      }

      const stat = years.get(year)!;
      stat.totalBooks++;

      if (book.reading_status !== ReadingStatus.WISHLIST) {
        stat.booksOwned++;
      }
    });

    // Calculate average ratings
    years.forEach((stat, year) => {
      const yearBooks = allBooks.filter(book => {
        if (!book.published_date) return false;
        const date = new Date(book.published_date);
        return date.getFullYear() === year;
      });

      const ratedBooks = yearBooks.filter(b => b.personal_rating && b.personal_rating > 0);
      if (ratedBooks.length > 0) {
        stat.avgRating = ratedBooks.reduce((sum, b) => sum + (b.personal_rating || 0), 0) / ratedBooks.length;
      }
    });

    return years;
  }, [allBooks]);

  // Get books for selected period
  const periodBooks = useMemo(() => {
    if (viewMode === 'year') {
      return allBooks.filter(book => {
        if (!book.published_date) return false;
        const date = new Date(book.published_date);
        return date.getFullYear() === selectedYear;
      });
    } else {
      // Season mode
      if (selectedSeason === null) return [];
      return allBooks.filter(book => {
        if (!book.published_date) return false;
        const date = new Date(book.published_date);
        return (
          date.getFullYear() === selectedYear &&
          getSeason(date) === selectedSeason
        );
      });
    }
  }, [allBooks, viewMode, selectedYear, selectedSeason]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allBooks.forEach(book => {
      if (book.published_date) {
        const date = new Date(book.published_date);
        years.add(date.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allBooks]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message="Loading seasonal data..." />
      </div>
    );
  }

  if (availableYears.length === 0) {
    return (
      <div className="booktarr-card">
        <div className="booktarr-card-body">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-booktarr-text text-lg font-semibold mb-2">No Date Information</h3>
            <p className="text-booktarr-textSecondary text-sm">
              Books need publication dates to be viewed by season or year.
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
              <h1 className="text-booktarr-text text-2xl font-bold mb-2">Seasonal Discovery</h1>
              <p className="text-booktarr-textSecondary text-sm">
                Browse books by publication season or year
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('year')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  viewMode === 'year'
                    ? 'bg-booktarr-accent bg-opacity-10 border-booktarr-accent text-booktarr-accent'
                    : 'border-booktarr-border text-booktarr-text hover:border-booktarr-accent'
                }`}
              >
                By Year
              </button>
              <button
                onClick={() => setViewMode('season')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  viewMode === 'season'
                    ? 'bg-booktarr-accent bg-opacity-10 border-booktarr-accent text-booktarr-accent'
                    : 'border-booktarr-border text-booktarr-text hover:border-booktarr-accent'
                }`}
              >
                By Season
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode: By Year */}
      {viewMode === 'year' && (
        <div className="space-y-6">
          {/* Year Timeline */}
          <div className="booktarr-card">
            <div className="booktarr-card-header">
              <h2 className="text-lg font-semibold text-booktarr-text">Release Years</h2>
            </div>
            <div className="booktarr-card-body">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {availableYears.map(year => {
                  const stat = yearStats.get(year);
                  return (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`p-4 rounded-lg border-2 transition-all text-center ${
                        selectedYear === year
                          ? 'bg-booktarr-accent bg-opacity-10 border-booktarr-accent'
                          : 'border-booktarr-border hover:border-booktarr-accent'
                      }`}
                    >
                      <div className="font-bold text-lg text-booktarr-text">{year}</div>
                      <div className="text-xs text-booktarr-textSecondary mt-1">
                        {stat?.booksOwned}/{stat?.totalBooks} owned
                      </div>
                      {stat?.avgRating ? (
                        <div className="text-xs text-booktarr-textSecondary">★ {stat.avgRating.toFixed(1)}</div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Books from selected year */}
          <div className="booktarr-card">
            <div className="booktarr-card-header">
              <h2 className="text-lg font-semibold text-booktarr-text">
                Books from {selectedYear} ({periodBooks.length})
              </h2>
            </div>
            <div className="booktarr-card-body">
              {periodBooks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-booktarr-textMuted">No books from {selectedYear}</p>
                </div>
              ) : (
                <div className="booktarr-book-grid">
                  {periodBooks.map(book => (
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
      )}

      {/* View Mode: By Season */}
      {viewMode === 'season' && (
        <div className="space-y-6">
          {/* Year selector */}
          <div className="booktarr-card">
            <div className="booktarr-card-header">
              <h2 className="text-lg font-semibold text-booktarr-text">Select Year</h2>
            </div>
            <div className="booktarr-card-body">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {availableYears.map(year => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      selectedYear === year
                        ? 'bg-booktarr-accent bg-opacity-10 border-booktarr-accent'
                        : 'border-booktarr-border hover:border-booktarr-accent'
                    }`}
                  >
                    <div className="font-bold text-lg text-booktarr-text">{year}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Season selector */}
          <div className="booktarr-card">
            <div className="booktarr-card-header">
              <h2 className="text-lg font-semibold text-booktarr-text">Select Season</h2>
            </div>
            <div className="booktarr-card-body">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SEASONS.map((season, index) => {
                  const seasonBookCount = allBooks.filter(book => {
                    if (!book.published_date) return false;
                    const date = new Date(book.published_date);
                    return date.getFullYear() === selectedYear && getSeason(date) === index;
                  }).length;

                  return (
                    <button
                      key={season}
                      onClick={() => setSelectedSeason(selectedSeason === index ? null : index)}
                      className={`p-4 rounded-lg border-2 transition-all text-center ${
                        selectedSeason === index
                          ? 'bg-booktarr-accent bg-opacity-10 border-booktarr-accent'
                          : 'border-booktarr-border hover:border-booktarr-accent'
                      }`}
                      disabled={seasonBookCount === 0}
                    >
                      <div className="font-bold text-lg text-booktarr-text">{season}</div>
                      <div className="text-xs text-booktarr-textSecondary mt-1">{seasonBookCount} books</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Books from selected season */}
          {selectedSeason !== null && (
            <div className="booktarr-card">
              <div className="booktarr-card-header">
                <h2 className="text-lg font-semibold text-booktarr-text">
                  {SEASONS[selectedSeason]} {selectedYear} ({periodBooks.length})
                </h2>
              </div>
              <div className="booktarr-card-body">
                {periodBooks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-booktarr-textMuted">
                      No books from {SEASONS[selectedSeason]} {selectedYear}
                    </p>
                  </div>
                ) : (
                  <div className="booktarr-book-grid">
                    {periodBooks.map(book => (
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
          )}
        </div>
      )}
    </div>
  );
};

export default SeasonalDiscoveryPage;
