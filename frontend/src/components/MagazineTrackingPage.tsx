/**
 * Magazine/Periodical Tracking Page - Track magazine series and issues
 */
import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, BooksBySeriesMap, ReadingStatus } from '../types';
import BookCard from './BookCard';
import LoadingSpinner from './LoadingSpinner';

interface MagazineTrackingPageProps {
  books: BooksBySeriesMap;
  allBooks: Book[];
  loading: boolean;
  error: string | null;
  onBookClick?: (book: Book) => void;
}

interface MagazineStats {
  seriesName: string;
  totalIssues: number;
  ownedIssues: number;
  missingIssues: number;
  lastIssue: Book | null;
  avgRating: number;
  latestPublished: Date | null;
  categories: string[];
}

const MagazineTrackingPage: React.FC<MagazineTrackingPageProps> = ({
  books,
  allBooks,
  loading,
  error,
  onBookClick
}) => {
  const navigate = useNavigate();
  const [selectedMagazine, setSelectedMagazine] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'issues' | 'owned' | 'recent'>('issues');

  // Identify magazine/periodical series (series with many volumes)
  const magazineStats = useMemo(() => {
    const stats: MagazineStats[] = [];

    Object.entries(books).forEach(([seriesName, seriesBooks]) => {
      // Skip standalone books
      if (seriesName === 'Standalone') return;

      // Consider it a magazine if it has multiple issues and/or publication dates spanning years
      if (seriesBooks.length >= 3) {
        const ownedBooks = seriesBooks.filter(b => b.reading_status !== ReadingStatus.WISHLIST);
        const ratedBooks = seriesBooks.filter(b => b.personal_rating && b.personal_rating > 0);
        const avgRating = ratedBooks.length > 0
          ? ratedBooks.reduce((sum, b) => sum + (b.personal_rating || 0), 0) / ratedBooks.length
          : 0;

        const sortedByDate = [...seriesBooks].sort((a, b) => {
          const dateA = a.published_date ? new Date(a.published_date).getTime() : 0;
          const dateB = b.published_date ? new Date(b.published_date).getTime() : 0;
          return dateB - dateA;
        });

        const lastIssue = sortedByDate[0] || null;
        const latestPublished = lastIssue?.published_date ? new Date(lastIssue.published_date) : null;

        // Calculate missing issues (consecutive numbering)
        let missingCount = 0;
        const positions = seriesBooks
          .filter(b => b.series_position)
          .map(b => b.series_position as number)
          .sort((a, b) => a - b);

        if (positions.length > 0) {
          const maxPosition = positions[positions.length - 1];
          missingCount = maxPosition - positions.length;
        }

        const categories = new Set(seriesBooks.flatMap(b => b.categories));

        stats.push({
          seriesName,
          totalIssues: seriesBooks.length,
          ownedIssues: ownedBooks.length,
          missingIssues: missingCount,
          lastIssue,
          avgRating,
          latestPublished,
          categories: Array.from(categories)
        });
      }
    });

    return stats;
  }, [books]);

  // Sort magazines
  const sortedMagazines = useMemo(() => {
    const sorted = [...magazineStats];

    switch (sortBy) {
      case 'owned':
        return sorted.sort((a, b) => b.ownedIssues - a.ownedIssues);
      case 'recent':
        return sorted.sort((a, b) => {
          const dateA = a.latestPublished?.getTime() || 0;
          const dateB = b.latestPublished?.getTime() || 0;
          return dateB - dateA;
        });
      case 'issues':
      default:
        return sorted.sort((a, b) => b.totalIssues - a.totalIssues);
    }
  }, [magazineStats, sortBy]);

  // Get issues for selected magazine
  const selectedMagazineIssues = useMemo(() => {
    if (!selectedMagazine) return [];
    return (books[selectedMagazine] || [])
      .sort((a, b) => {
        if (a.series_position && b.series_position) {
          return b.series_position - a.series_position;
        }
        return 0;
      });
  }, [books, selectedMagazine]);

  const handleSeriesClick = useCallback((seriesName: string) => {
    navigate(`/series/${encodeURIComponent(seriesName)}`);
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message="Loading magazine data..." />
      </div>
    );
  }

  if (magazineStats.length === 0) {
    return (
      <div className="booktarr-card">
        <div className="booktarr-card-body">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-booktarr-text text-lg font-semibold mb-2">No Magazines Found</h3>
            <p className="text-booktarr-textSecondary text-sm">
              Magazine series (with 3+ issues) will appear here. Start adding magazine issues to track them.
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
              <h1 className="text-booktarr-text text-2xl font-bold mb-2">Magazine Tracking</h1>
              <p className="text-booktarr-textSecondary text-sm">
                Track magazine and periodical series. Found {magazineStats.length} magazine{magazineStats.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'issues' | 'owned' | 'recent')}
                className="booktarr-input text-sm"
              >
                <option value="issues">Most Issues</option>
                <option value="owned">Most Owned</option>
                <option value="recent">Recently Published</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Magazine List */}
        <div className="lg:col-span-1">
          <div className="booktarr-card sticky top-4">
            <div className="booktarr-card-header">
              <h2 className="text-lg font-semibold text-booktarr-text">Magazines</h2>
            </div>
            <div className="booktarr-card-body max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {sortedMagazines.map(magazine => (
                  <button
                    key={magazine.seriesName}
                    onClick={() => setSelectedMagazine(magazine.seriesName)}
                    className={`w-full text-left p-3 rounded-lg transition-all border ${
                      selectedMagazine === magazine.seriesName
                        ? 'bg-booktarr-accent bg-opacity-10 border-booktarr-accent text-booktarr-accent'
                        : 'border-booktarr-border hover:border-booktarr-accent text-booktarr-text hover:bg-booktarr-surface2'
                    }`}
                  >
                    <div className="font-semibold text-sm truncate">{magazine.seriesName}</div>
                    <div className="text-xs text-booktarr-textSecondary mt-1">
                      {magazine.ownedIssues}/{magazine.totalIssues} owned
                      {magazine.missingIssues > 0 && ` • ${magazine.missingIssues} missing`}
                    </div>
                    {magazine.latestPublished && (
                      <div className="text-xs text-booktarr-textMuted mt-1">
                        Latest: {magazine.latestPublished.toLocaleDateString()}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Magazine Details and Issues */}
        <div className="lg:col-span-2">
          {selectedMagazine ? (
            <div className="space-y-6">
              {/* Magazine Stats */}
              {magazineStats.find(m => m.seriesName === selectedMagazine) && (
                <div className="booktarr-card">
                  <div className="booktarr-card-header">
                    <div className="flex items-start justify-between">
                      <h2 className="text-2xl font-bold text-booktarr-text">{selectedMagazine}</h2>
                      <button
                        onClick={() => handleSeriesClick(selectedMagazine)}
                        className="booktarr-btn booktarr-btn-secondary text-sm"
                      >
                        View Series
                      </button>
                    </div>
                  </div>
                  <div className="booktarr-card-body">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                      <div>
                        <div className="text-2xl font-bold text-booktarr-accent">
                          {magazineStats.find(m => m.seriesName === selectedMagazine)?.totalIssues}
                        </div>
                        <div className="text-sm text-booktarr-textSecondary">Total Issues</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-booktarr-accent">
                          {magazineStats.find(m => m.seriesName === selectedMagazine)?.ownedIssues}
                        </div>
                        <div className="text-sm text-booktarr-textSecondary">Owned</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-500">
                          {magazineStats.find(m => m.seriesName === selectedMagazine)?.missingIssues}
                        </div>
                        <div className="text-sm text-booktarr-textSecondary">Missing</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-booktarr-accent">
                          {magazineStats.find(m => m.seriesName === selectedMagazine)?.avgRating.toFixed(1)}
                        </div>
                        <div className="text-sm text-booktarr-textSecondary">Avg Rating</div>
                      </div>
                    </div>

                    {/* Magazine details */}
                    <div className="space-y-3 border-t border-booktarr-border pt-4">
                      {magazineStats.find(m => m.seriesName === selectedMagazine)?.latestPublished && (
                        <div>
                          <div className="text-sm font-semibold text-booktarr-text">Latest Issue</div>
                          <div className="text-sm text-booktarr-textSecondary">
                            {magazineStats.find(m => m.seriesName === selectedMagazine)?.latestPublished?.toLocaleDateString()}
                          </div>
                        </div>
                      )}

                      {magazineStats.find(m => m.seriesName === selectedMagazine)?.lastIssue && (
                        <div>
                          <div className="text-sm font-semibold text-booktarr-text">Latest Issue Title</div>
                          <div className="text-sm text-booktarr-text">
                            {magazineStats.find(m => m.seriesName === selectedMagazine)?.lastIssue?.title}
                          </div>
                        </div>
                      )}

                      {magazineStats.find(m => m.seriesName === selectedMagazine)?.categories.length! > 0 && (
                        <div>
                          <div className="text-sm font-semibold text-booktarr-text mb-2">Categories</div>
                          <div className="flex flex-wrap gap-2">
                            {magazineStats.find(m => m.seriesName === selectedMagazine)?.categories.slice(0, 4).map(category => (
                              <div key={category} className="px-2 py-1 bg-booktarr-surface2 text-booktarr-textSecondary text-xs rounded">
                                {category}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Issues/Editions */}
              <div className="booktarr-card">
                <div className="booktarr-card-header">
                  <h3 className="text-lg font-semibold text-booktarr-text">
                    Issues ({selectedMagazineIssues.length})
                  </h3>
                </div>
                <div className="booktarr-card-body">
                  {selectedMagazineIssues.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-booktarr-textMuted">No issues available</p>
                    </div>
                  ) : (
                    <div className="booktarr-book-grid">
                      {selectedMagazineIssues.map(book => (
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="text-booktarr-text text-lg font-semibold mb-2">Select a Magazine</h3>
                  <p className="text-booktarr-textSecondary text-sm">
                    Choose a magazine from the list to see its issues
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

export default MagazineTrackingPage;
