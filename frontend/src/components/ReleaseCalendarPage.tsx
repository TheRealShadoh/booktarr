/**
 * Release Calendar Page - Shows upcoming book releases
 */
import React, { useState, useEffect } from 'react';
import { Book } from '../types';

interface ReleaseCalendarPageProps {
  books?: Book[];
  loading?: boolean;
  error?: string | null;
}

interface ReleaseEvent {
  title: string;
  releaseDate: string;
  format: string;
  owned: boolean;
  wanted: boolean;
  author?: string;
  series?: string;
}

const ReleaseCalendarPage: React.FC<ReleaseCalendarPageProps> = ({
  books = [],
  loading = false,
  error = null
}) => {
  const [upcomingReleases, setUpcomingReleases] = useState<ReleaseEvent[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  useEffect(() => {
    // Initialize with current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(currentMonth);

    // Generate some sample upcoming releases
    const sampleReleases: ReleaseEvent[] = [
      {
        title: "Stormlight Archive Book 5",
        releaseDate: "2025-11-05",
        format: "hardcover",
        owned: false,
        wanted: true,
        author: "Brandon Sanderson",
        series: "Stormlight Archive"
      },
      {
        title: "The Winds of Winter",
        releaseDate: "2025-12-15",
        format: "hardcover",
        owned: false,
        wanted: true,
        author: "George R.R. Martin",
        series: "A Song of Ice and Fire"
      }
    ];

    setUpcomingReleases(sampleReleases);
  }, [books]);

  const getMonthReleases = (month: string) => {
    return upcomingReleases.filter(release => 
      release.releaseDate.startsWith(month)
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-booktarr-surface rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-booktarr-surface rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading release calendar: {error}</p>
        </div>
      </div>
    );
  }

  const monthReleases = getMonthReleases(selectedMonth);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-booktarr-text mb-2">Release Calendar</h1>
        <p className="text-booktarr-textSecondary">Track upcoming book releases</p>
      </div>

      {/* Month Selector */}
      <div className="mb-6">
        <label htmlFor="month-select" className="block text-sm font-medium text-booktarr-text mb-2">
          Select Month
        </label>
        <select
          id="month-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border border-booktarr-border rounded-lg px-3 py-2 bg-booktarr-surface text-booktarr-text"
        >
          <option value="2025-11">November 2025</option>
          <option value="2025-12">December 2025</option>
          <option value="2026-01">January 2026</option>
        </select>
      </div>

      {/* Calendar View */}
      <div className="bg-booktarr-surface rounded-lg shadow-sm border border-booktarr-border p-6">
        <h2 className="text-xl font-semibold text-booktarr-text mb-4">
          Releases for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>

        {monthReleases.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-booktarr-textMuted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-booktarr-text mb-2">No releases scheduled</h3>
            <p className="text-booktarr-textSecondary">No upcoming releases found for this month.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {monthReleases.map((release, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-booktarr-bg rounded-lg border border-booktarr-border">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-booktarr-text">{release.title}</h3>
                  {release.author && (
                    <p className="text-sm text-booktarr-textSecondary">by {release.author}</p>
                  )}
                  {release.series && (
                    <p className="text-sm text-booktarr-textMuted">Series: {release.series}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-sm text-booktarr-textSecondary">
                      {new Date(release.releaseDate).toLocaleDateString()}
                    </span>
                    <span className="text-sm text-booktarr-textSecondary capitalize">
                      {release.format}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {release.wanted && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Wanted
                    </span>
                  )}
                  {release.owned && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Owned
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReleaseCalendarPage;