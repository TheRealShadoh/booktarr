/**
 * Combined Analytics Dashboard component
 * Displays comprehensive library statistics, analytics, and insights
 */
import React, { useState, useMemo } from 'react';
import { useStateManager } from '../hooks/useStateManager';
import { Book } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
}

interface SeriesStats {
  name: string;
  bookCount: number;
  totalPages: number;
  avgRating?: number;
  completionRate: number;
}

interface AuthorStats {
  name: string;
  bookCount: number;
  totalPages: number;
  series: string[];
}

const StatsDashboard: React.FC = () => {
  const { state, showToast } = useStateManager();
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    const allBooks = Object.values(state.books).flat();
    const totalBooks = allBooks.length;
    
    if (totalBooks === 0) {
      return {
        overview: [],
        seriesStats: [],
        authorStats: [],
        categoryStats: [],
        yearlyStats: [],
        readingStats: {}
      };
    }

    // Overview stats
    const totalPages = allBooks.reduce((sum, book) => sum + (book.page_count || 0), 0);
    const avgPages = totalPages / totalBooks;
    const totalSeries = Object.keys(state.books).length;
    const uniqueAuthors = new Set(allBooks.flatMap(book => book.authors)).size;
    const booksThisYear = allBooks.filter(book => {
      if (!book.added_date) return false;
      const addedYear = new Date(book.added_date).getFullYear();
      return addedYear === new Date().getFullYear();
    }).length;

    const overview: StatItem[] = [
      {
        label: 'Total Books',
        value: totalBooks.toLocaleString(),
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
        color: 'text-blue-400',
        trend: booksThisYear > 0 ? { value: booksThisYear, direction: 'up' } : undefined
      },
      {
        label: 'Series',
        value: totalSeries.toLocaleString(),
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        ),
        color: 'text-green-400'
      },
      {
        label: 'Authors',
        value: uniqueAuthors.toLocaleString(),
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        color: 'text-purple-400'
      },
      {
        label: 'Total Pages',
        value: totalPages.toLocaleString(),
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        color: 'text-yellow-400'
      },
      {
        label: 'Avg Pages/Book',
        value: Math.round(avgPages).toLocaleString(),
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
        color: 'text-indigo-400'
      },
      {
        label: 'Added This Year',
        value: booksThisYear.toLocaleString(),
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        color: 'text-red-400'
      }
    ];

    // Series statistics
    const seriesStats: SeriesStats[] = Object.entries(state.books)
      .map(([seriesName, books]) => ({
        name: seriesName,
        bookCount: books.length,
        totalPages: books.reduce((sum, book) => sum + (book.page_count || 0), 0),
        completionRate: 100 // Placeholder - could track reading progress
      }))
      .sort((a, b) => b.bookCount - a.bookCount)
      .slice(0, 10);

    // Author statistics
    const authorMap = new Map<string, { books: Book[], series: Set<string> }>();
    allBooks.forEach(book => {
      book.authors.forEach(author => {
        if (!authorMap.has(author)) {
          authorMap.set(author, { books: [], series: new Set() });
        }
        const authorData = authorMap.get(author)!;
        authorData.books.push(book);
        if (book.series) {
          authorData.series.add(book.series);
        }
      });
    });

    const authorStats: AuthorStats[] = Array.from(authorMap.entries())
      .map(([name, data]) => ({
        name,
        bookCount: data.books.length,
        totalPages: data.books.reduce((sum, book) => sum + (book.page_count || 0), 0),
        series: Array.from(data.series)
      }))
      .sort((a, b) => b.bookCount - a.bookCount)
      .slice(0, 10);

    // Category statistics
    const categoryMap = new Map<string, number>();
    allBooks.forEach(book => {
      if (book.categories && Array.isArray(book.categories)) {
        book.categories.forEach(category => {
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        });
      }
    });

    const categoryStats = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Yearly addition statistics
    const yearMap = new Map<number, number>();
    allBooks.forEach(book => {
      if (book.added_date) {
        const year = new Date(book.added_date).getFullYear();
        yearMap.set(year, (yearMap.get(year) || 0) + 1);
      }
    });

    const yearlyStats = Array.from(yearMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year);

    // Reading statistics (estimated)
    const readingStats = {
      estimatedReadingTime: Math.round(totalPages / 250), // ~250 words per page, ~250 words per minute
      longestBook: allBooks.reduce((max, book) => 
        (book.page_count || 0) > (max.page_count || 0) ? book : max, allBooks[0]),
      shortestBook: allBooks.reduce((min, book) => 
        (book.page_count || 999999) < (min.page_count || 999999) ? book : min, allBooks[0]),
      mostProductiveAuthor: authorStats[0]?.name || 'N/A'
    };

    return {
      overview,
      seriesStats,
      authorStats,
      categoryStats,
      yearlyStats,
      readingStats
    };
  }, [state.books]);

  const exportStats = () => {
    try {
      const data = {
        generated: new Date().toISOString(),
        overview: stats.overview,
        series: stats.seriesStats,
        authors: stats.authorStats,
        categories: stats.categoryStats,
        yearly: stats.yearlyStats,
        reading: stats.readingStats
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `booktarr-stats-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      showToast('Statistics exported successfully!', 'success');
    } catch (error) {
      showToast('Failed to export statistics', 'error');
    }
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-booktarr-text text-2xl font-bold">Library Statistics</h1>
          <p className="text-booktarr-textSecondary text-sm mt-1">
            Insights and analytics for your book collection
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="booktarr-form-input"
          >
            <option value="all">All Time</option>
            <option value="year">This Year</option>
            <option value="month">This Month</option>
          </select>
          
          <button
            onClick={exportStats}
            className="booktarr-btn booktarr-btn-primary"
          >
            Export Stats
          </button>
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.overview.map((stat, index) => (
          <div key={index} className="booktarr-card">
            <div className="booktarr-card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-booktarr-textSecondary text-sm">{stat.label}</p>
                  <p className="text-booktarr-text text-2xl font-bold">{stat.value}</p>
                  {stat.trend && (
                    <p className="text-green-400 text-xs flex items-center mt-1">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l10-10M17 7v10" />
                      </svg>
                      +{stat.trend.value} this year
                    </p>
                  )}
                </div>
                <div className={`${stat.color} opacity-80`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Series */}
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h3 className="text-booktarr-text text-lg font-semibold">Top Series</h3>
          </div>
          <div className="booktarr-card-body">
            <div className="space-y-3">
              {stats.seriesStats.slice(0, 5).map((series, index) => (
                <div key={series.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-booktarr-textMuted text-sm w-4">#{index + 1}</span>
                    <div>
                      <p className="text-booktarr-text font-medium">{series.name}</p>
                      <p className="text-booktarr-textSecondary text-xs">
                        {series.totalPages.toLocaleString()} pages
                      </p>
                    </div>
                  </div>
                  <span className="text-booktarr-accent font-bold">{series.bookCount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Authors */}
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h3 className="text-booktarr-text text-lg font-semibold">Top Authors</h3>
          </div>
          <div className="booktarr-card-body">
            <div className="space-y-3">
              {stats.authorStats.slice(0, 5).map((author, index) => (
                <div key={author.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-booktarr-textMuted text-sm w-4">#{index + 1}</span>
                    <div>
                      <p className="text-booktarr-text font-medium">{author.name}</p>
                      <p className="text-booktarr-textSecondary text-xs">
                        {author.series.length} series
                      </p>
                    </div>
                  </div>
                  <span className="text-booktarr-accent font-bold">{author.bookCount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h3 className="text-booktarr-text text-lg font-semibold">Top Categories</h3>
          </div>
          <div className="booktarr-card-body">
            <div className="space-y-3">
              {stats.categoryStats.slice(0, 5).map((category, index) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-booktarr-textMuted text-sm w-4">#{index + 1}</span>
                    <p className="text-booktarr-text font-medium">{category.name}</p>
                  </div>
                  <span className="text-booktarr-accent font-bold">{category.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reading Insights */}
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h3 className="text-booktarr-text text-lg font-semibold">Reading Insights</h3>
          </div>
          <div className="booktarr-card-body">
            <div className="space-y-4">
              <div>
                <p className="text-booktarr-textSecondary text-sm">Estimated Reading Time</p>
                <p className="text-booktarr-text text-xl font-bold">
                  {stats.readingStats && 'estimatedReadingTime' in stats.readingStats 
                    ? Math.floor(stats.readingStats.estimatedReadingTime / 24) 
                    : 0} days
                </p>
              </div>
              
              <div>
                <p className="text-booktarr-textSecondary text-sm">Longest Book</p>
                <p className="text-booktarr-text font-medium">
                  {stats.readingStats && 'longestBook' in stats.readingStats 
                    ? stats.readingStats.longestBook?.title || 'N/A'
                    : 'N/A'}
                </p>
                <p className="text-booktarr-textMuted text-xs">
                  {stats.readingStats && 'longestBook' in stats.readingStats 
                    ? stats.readingStats.longestBook?.page_count || 0 
                    : 0} pages
                </p>
              </div>
              
              <div>
                <p className="text-booktarr-textSecondary text-sm">Most Productive Author</p>
                <p className="text-booktarr-text font-medium">
                  {stats.readingStats && 'mostProductiveAuthor' in stats.readingStats 
                    ? stats.readingStats.mostProductiveAuthor 
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Yearly Additions Chart */}
      {stats.yearlyStats.length > 0 && (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h3 className="text-booktarr-text text-lg font-semibold">Books Added by Year</h3>
          </div>
          <div className="booktarr-card-body">
            <div className="flex items-end space-x-2 h-32">
              {stats.yearlyStats.map((year) => {
                const maxCount = Math.max(...stats.yearlyStats.map(y => y.count));
                const height = (year.count / maxCount) * 100;
                
                return (
                  <div key={year.year} className="flex flex-col items-center space-y-1 flex-1">
                    <div 
                      className="bg-booktarr-accent rounded-t"
                      style={{ height: `${height}%`, minHeight: '4px', width: '100%' }}
                      title={`${year.year}: ${year.count} books`}
                    />
                    <span className="text-booktarr-textMuted text-xs">{year.year}</span>
                    <span className="text-booktarr-text text-xs font-medium">{year.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsDashboard;