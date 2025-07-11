/**
 * Library analytics page with comprehensive statistics and insights
 */
import React, { useMemo } from 'react';
import { BooksBySeriesMap, Book } from '../types';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

interface LibraryAnalyticsPageProps {
  books: BooksBySeriesMap;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

interface LibraryStats {
  totalBooks: number;
  totalSeries: number;
  totalAuthors: number;
  totalPages: number;
  averagePages: number;
  averageRating: number;
  readingProgress: {
    unread: number;
    reading: number;
    read: number;
    wishlist: number;
    dnf: number;
  };
  topAuthors: Array<{ name: string; bookCount: number; seriesCount: number; }>;
  topSeries: Array<{ name: string; bookCount: number; completeness: number; }>;
  topCategories: Array<{ name: string; bookCount: number; }>;
  languageDistribution: Array<{ language: string; count: number; }>;
  publicationYears: Array<{ year: number; count: number; }>;
  monthlyAdditions: Array<{ month: string; count: number; }>;
  seriesCompletion: {
    complete: number;
    incomplete: number;
    standalone: number;
  };
  ratingDistribution: Array<{ rating: string; count: number; }>;
}

const LibraryAnalyticsPage: React.FC<LibraryAnalyticsPageProps> = ({
  books,
  loading,
  error,
  onRefresh
}) => {
  const stats = useMemo((): LibraryStats => {
    const allBooks = Object.values(books).flat();
    
    // Basic counts
    const totalBooks = allBooks.length;
    const totalSeries = Object.keys(books).filter(key => key !== 'Standalone').length;
    const uniqueAuthors = new Set(allBooks.flatMap(book => book.authors));
    const totalAuthors = uniqueAuthors.size;
    
    // Page statistics
    const booksWithPages = allBooks.filter(book => book.page_count && book.page_count > 0);
    const totalPages = booksWithPages.reduce((sum, book) => sum + (book.page_count || 0), 0);
    const averagePages = booksWithPages.length > 0 ? Math.round(totalPages / booksWithPages.length) : 0;

    // Rating statistics
    const booksWithRatings = allBooks.filter(book => book.rating && book.rating > 0);
    const averageRating = booksWithRatings.length > 0 
      ? booksWithRatings.reduce((sum, book) => sum + (book.rating || 0), 0) / booksWithRatings.length
      : 0;

    // Reading progress
    const readingProgress = {
      unread: allBooks.filter(book => book.reading_status === 'unread').length,
      reading: allBooks.filter(book => book.reading_status === 'reading').length,
      read: allBooks.filter(book => book.reading_status === 'read').length,
      wishlist: allBooks.filter(book => book.reading_status === 'wishlist').length,
      dnf: allBooks.filter(book => book.reading_status === 'dnf').length,
    };

    // Top authors
    const authorCounts = new Map<string, { bookCount: number; series: Set<string> }>();
    allBooks.forEach(book => {
      book.authors.forEach(author => {
        if (!authorCounts.has(author)) {
          authorCounts.set(author, { bookCount: 0, series: new Set() });
        }
        const authorData = authorCounts.get(author)!;
        authorData.bookCount++;
        if (book.series) {
          authorData.series.add(book.series);
        }
      });
    });
    
    const topAuthors = Array.from(authorCounts.entries())
      .map(([name, data]) => ({
        name,
        bookCount: data.bookCount,
        seriesCount: data.series.size
      }))
      .sort((a, b) => b.bookCount - a.bookCount)
      .slice(0, 10);

    // Top series
    const topSeries = Object.entries(books)
      .filter(([seriesName]) => seriesName !== 'Standalone')
      .map(([seriesName, seriesBooks]) => {
        const positions = seriesBooks
          .map(book => book.series_position)
          .filter(pos => pos !== null && pos !== undefined) as number[];
        
        let completeness = 100;
        if (positions.length > 0) {
          const maxPosition = Math.max(...positions);
          const expectedBooks = maxPosition;
          completeness = Math.round((seriesBooks.length / expectedBooks) * 100);
        }
        
        return {
          name: seriesName,
          bookCount: seriesBooks.length,
          completeness
        };
      })
      .sort((a, b) => b.bookCount - a.bookCount)
      .slice(0, 10);

    // Top categories
    const categoryCounts = new Map<string, number>();
    allBooks.forEach(book => {
      book.categories.forEach(category => {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      });
    });
    
    const topCategories = Array.from(categoryCounts.entries())
      .map(([name, bookCount]) => ({ name, bookCount }))
      .sort((a, b) => b.bookCount - a.bookCount)
      .slice(0, 10);

    // Language distribution
    const languageCounts = new Map<string, number>();
    allBooks.forEach(book => {
      const lang = book.language || 'unknown';
      languageCounts.set(lang, (languageCounts.get(lang) || 0) + 1);
    });
    
    const languageDistribution = Array.from(languageCounts.entries())
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);

    // Publication years
    const yearCounts = new Map<number, number>();
    allBooks.forEach(book => {
      if (book.published_date) {
        const year = new Date(book.published_date).getFullYear();
        if (year > 1800 && year <= new Date().getFullYear()) {
          yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
        }
      }
    });
    
    const publicationYears = Array.from(yearCounts.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year - a.year)
      .slice(0, 20);

    // Monthly additions (last 12 months)
    const monthCounts = new Map<string, number>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      monthCounts.set(monthKey, 0);
    }
    
    allBooks.forEach(book => {
      const addedDate = new Date(book.date_added);
      const monthKey = addedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (monthCounts.has(monthKey)) {
        monthCounts.set(monthKey, monthCounts.get(monthKey)! + 1);
      }
    });
    
    const monthlyAdditions = Array.from(monthCounts.entries())
      .map(([month, count]) => ({ month, count }));

    // Series completion
    let completeSeriesCount = 0;
    let incompleteSeriesCount = 0;
    
    Object.entries(books).forEach(([seriesName, seriesBooks]) => {
      if (seriesName === 'Standalone') return;
      
      const positions = seriesBooks
        .map(book => book.series_position)
        .filter(pos => pos !== null && pos !== undefined) as number[];
      
      if (positions.length === 0) {
        incompleteSeriesCount++;
        return;
      }
      
      const maxPosition = Math.max(...positions);
      const hasAllBooks = Array.from({ length: maxPosition }, (_, i) => i + 1)
        .every(pos => positions.includes(pos));
      
      if (hasAllBooks) {
        completeSeriesCount++;
      } else {
        incompleteSeriesCount++;
      }
    });
    
    const seriesCompletion = {
      complete: completeSeriesCount,
      incomplete: incompleteSeriesCount,
      standalone: books.Standalone?.length || 0
    };

    // Rating distribution
    const ratingCounts = new Map<string, number>();
    ['0-1', '1-2', '2-3', '3-4', '4-5', 'Unrated'].forEach(range => {
      ratingCounts.set(range, 0);
    });
    
    allBooks.forEach(book => {
      if (!book.rating || book.rating === 0) {
        ratingCounts.set('Unrated', ratingCounts.get('Unrated')! + 1);
      } else if (book.rating <= 1) {
        ratingCounts.set('0-1', ratingCounts.get('0-1')! + 1);
      } else if (book.rating <= 2) {
        ratingCounts.set('1-2', ratingCounts.get('1-2')! + 1);
      } else if (book.rating <= 3) {
        ratingCounts.set('2-3', ratingCounts.get('2-3')! + 1);
      } else if (book.rating <= 4) {
        ratingCounts.set('3-4', ratingCounts.get('3-4')! + 1);
      } else {
        ratingCounts.set('4-5', ratingCounts.get('4-5')! + 1);
      }
    });
    
    const ratingDistribution = Array.from(ratingCounts.entries())
      .map(([rating, count]) => ({ rating, count }));

    return {
      totalBooks,
      totalSeries,
      totalAuthors,
      totalPages,
      averagePages,
      averageRating,
      readingProgress,
      topAuthors,
      topSeries,
      topCategories,
      languageDistribution,
      publicationYears,
      monthlyAdditions,
      seriesCompletion,
      ratingDistribution
    };
  }, [books]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message="Analyzing library..." />
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
    <div className="space-y-6">
      {/* Header */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h1 className="text-booktarr-text text-2xl font-bold mb-2">Library Analytics</h1>
          <p className="text-booktarr-textSecondary text-sm">
            Comprehensive insights and statistics about your book collection
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="booktarr-card">
          <div className="booktarr-card-body text-center">
            <div className="text-3xl font-bold text-booktarr-accent mb-2">{stats.totalBooks}</div>
            <div className="text-sm text-booktarr-textMuted">Total Books</div>
          </div>
        </div>
        <div className="booktarr-card">
          <div className="booktarr-card-body text-center">
            <div className="text-3xl font-bold text-booktarr-accent mb-2">{stats.totalSeries}</div>
            <div className="text-sm text-booktarr-textMuted">Series</div>
          </div>
        </div>
        <div className="booktarr-card">
          <div className="booktarr-card-body text-center">
            <div className="text-3xl font-bold text-booktarr-accent mb-2">{stats.totalAuthors}</div>
            <div className="text-sm text-booktarr-textMuted">Authors</div>
          </div>
        </div>
        <div className="booktarr-card">
          <div className="booktarr-card-body text-center">
            <div className="text-3xl font-bold text-booktarr-accent mb-2">{stats.averagePages}</div>
            <div className="text-sm text-booktarr-textMuted">Avg Pages</div>
          </div>
        </div>
      </div>

      {/* Reading Progress */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-lg font-semibold text-booktarr-text">Reading Progress</h2>
        </div>
        <div className="booktarr-card-body">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500 mb-1">{stats.readingProgress.unread}</div>
              <div className="text-sm text-booktarr-textMuted">Unread</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500 mb-1">{stats.readingProgress.reading}</div>
              <div className="text-sm text-booktarr-textMuted">Reading</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500 mb-1">{stats.readingProgress.read}</div>
              <div className="text-sm text-booktarr-textMuted">Read</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500 mb-1">{stats.readingProgress.wishlist}</div>
              <div className="text-sm text-booktarr-textMuted">Wishlist</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500 mb-1">{stats.readingProgress.dnf}</div>
              <div className="text-sm text-booktarr-textMuted">DNF</div>
            </div>
          </div>
        </div>
      </div>

      {/* Series Completion */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-lg font-semibold text-booktarr-text">Collection Breakdown</h2>
        </div>
        <div className="booktarr-card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-booktarr-surface2 rounded-lg">
              <div className="text-2xl font-bold text-green-500 mb-1">{stats.seriesCompletion.complete}</div>
              <div className="text-sm text-booktarr-textMuted">Complete Series</div>
            </div>
            <div className="text-center p-4 bg-booktarr-surface2 rounded-lg">
              <div className="text-2xl font-bold text-orange-500 mb-1">{stats.seriesCompletion.incomplete}</div>
              <div className="text-sm text-booktarr-textMuted">Incomplete Series</div>
            </div>
            <div className="text-center p-4 bg-booktarr-surface2 rounded-lg">
              <div className="text-2xl font-bold text-gray-500 mb-1">{stats.seriesCompletion.standalone}</div>
              <div className="text-sm text-booktarr-textMuted">Standalone Books</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Authors */}
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">Top Authors</h2>
          </div>
          <div className="booktarr-card-body">
            <div className="space-y-3">
              {stats.topAuthors.map((author, index) => (
                <div key={author.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-booktarr-accent text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-booktarr-text">{author.name}</div>
                      <div className="text-sm text-booktarr-textMuted">
                        {author.seriesCount} series
                      </div>
                    </div>
                  </div>
                  <div className="text-booktarr-accent font-bold">{author.bookCount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Series */}
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">Top Series</h2>
          </div>
          <div className="booktarr-card-body">
            <div className="space-y-3">
              {stats.topSeries.map((series, index) => (
                <div key={series.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-booktarr-accent text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-booktarr-text">{series.name}</div>
                      <div className="text-sm text-booktarr-textMuted">
                        {series.completeness}% complete
                      </div>
                    </div>
                  </div>
                  <div className="text-booktarr-accent font-bold">{series.bookCount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Categories and Languages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories */}
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">Top Categories</h2>
          </div>
          <div className="booktarr-card-body">
            <div className="space-y-2">
              {stats.topCategories.map(category => (
                <div key={category.name} className="flex items-center justify-between">
                  <span className="text-booktarr-text">{category.name}</span>
                  <span className="text-booktarr-accent font-medium">{category.bookCount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Language Distribution */}
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">Languages</h2>
          </div>
          <div className="booktarr-card-body">
            <div className="space-y-2">
              {stats.languageDistribution.map(lang => (
                <div key={lang.language} className="flex items-center justify-between">
                  <span className="text-booktarr-text capitalize">{lang.language}</span>
                  <span className="text-booktarr-accent font-medium">{lang.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Additions */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-lg font-semibold text-booktarr-text">Monthly Additions (Last 12 Months)</h2>
        </div>
        <div className="booktarr-card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stats.monthlyAdditions.map(month => (
              <div key={month.month} className="text-center">
                <div className="text-lg font-bold text-booktarr-accent">{month.count}</div>
                <div className="text-sm text-booktarr-textMuted">{month.month}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-lg font-semibold text-booktarr-text">Rating Distribution</h2>
        </div>
        <div className="booktarr-card-body">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.ratingDistribution.map(rating => (
              <div key={rating.rating} className="text-center">
                <div className="text-lg font-bold text-booktarr-accent">{rating.count}</div>
                <div className="text-sm text-booktarr-textMuted">{rating.rating}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Publication Years */}
      {stats.publicationYears.length > 0 && (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">Publication Years (Top 20)</h2>
          </div>
          <div className="booktarr-card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {stats.publicationYears.map(year => (
                <div key={year.year} className="text-center">
                  <div className="text-lg font-bold text-booktarr-accent">{year.count}</div>
                  <div className="text-sm text-booktarr-textMuted">{year.year}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryAnalyticsPage;