/**
 * Smart Insights Dashboard
 * Displays advanced analytics including:
 * - Series Health Check (abandoned/incomplete series)
 * - Backlog Analysis (unread volumes + catch-up suggestions)
 * - Collection Value (market value + most valuable items)
 * - Reading Timeline (estimated completion dates)
 */

import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

interface SeriesHealthData {
  abandoned_series: Array<{
    name: string;
    last_volume_date: string;
    years_since_publication: number;
    owned_count: number;
    total_count: number;
  }>;
  incomplete_series: Array<{
    name: string;
    owned_count: number;
    total_count: number;
    missing_count: number;
    missing_volumes: number[];
  }>;
  healthy_series: number;
  summary: {
    total_series: number;
    abandoned_count: number;
    incomplete_count: number;
    complete_and_ongoing: number;
  };
}

interface BacklogData {
  total_unread: number;
  total_in_progress: number;
  unread_by_series: Array<{
    series_name: string;
    unread_count: number;
    in_progress_count: number;
    owned_count: number;
    completion_ratio: number;
    priority: 'high' | 'medium' | 'low';
    next_to_read?: {
      volume: number;
      title: string;
    };
  }>;
  recommendations: Array<{
    reason: string;
    series_name: string;
    next_volume: number;
    action: string;
  }>;
}

interface CollectionValueData {
  total_collection_value: number;
  average_book_value: number;
  books_with_price: number;
  books_without_price: number;
  total_books: number;
  value_by_format: Record<string, number>;
  most_valuable_items: Array<{
    title: string;
    authors: string;
    format: string;
    price: number;
    series_name?: string;
    series_position?: number;
  }>;
}

interface ReadingTimelineData {
  reading_pace: {
    books_per_month: number;
    pages_per_day: number;
    average_days_per_book: number;
    books_completed_tracked: number;
    confidence: number;
  };
  current_reads: Array<{
    title: string;
    series_name?: string;
    series_position?: number;
    progress_percentage: number;
    current_page?: number;
    total_pages?: number;
    estimated_finish_date?: string;
    days_until_completion: number;
  }>;
  series_timelines: Array<{
    series_name: string;
    unread_in_series: number;
    estimated_series_completion: string;
    months_until_completion: number;
  }>;
}

interface InsightsSummary {
  series_health: SeriesHealthData;
  backlog: BacklogData;
  collection_value: CollectionValueData;
  reading_timeline: ReadingTimelineData;
  last_updated: string;
}

const SmartInsightsPage: React.FC = () => {
  const [insights, setInsights] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'backlog' | 'value' | 'timeline'>('overview');

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await fetch('/api/insights/summary');
        if (!response.ok) {
          throw new Error('Failed to fetch insights');
        }
        const data = await response.json();
        setInsights(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (!insights) {
    return <ErrorMessage error="No insights data available" />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">📊 Smart Insights</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Advanced analytics about your book collection, reading habits, and series progress
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'overview', label: '📈 Overview', icon: '📈' },
          { id: 'health', label: '🏥 Series Health', icon: '🏥' },
          { id: 'backlog', label: '📚 Backlog', icon: '📚' },
          { id: 'value', label: '💰 Value', icon: '💰' },
          { id: 'timeline', label: '⏰ Timeline', icon: '⏰' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && <OverviewSection insights={insights} />}

        {/* Series Health Tab */}
        {activeTab === 'health' && <SeriesHealthSection health={insights.series_health} />}

        {/* Backlog Tab */}
        {activeTab === 'backlog' && <BacklogSection backlog={insights.backlog} />}

        {/* Collection Value Tab */}
        {activeTab === 'value' && <CollectionValueSection value={insights.collection_value} />}

        {/* Reading Timeline Tab */}
        {activeTab === 'timeline' && <ReadingTimelineSection timeline={insights.reading_timeline} />}
      </div>

      {/* Last Updated */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-4">
        Last updated: {new Date(insights.last_updated).toLocaleString()}
      </div>
    </div>
  );
};

// Overview Section
const OverviewSection: React.FC<{ insights: InsightsSummary }> = ({ insights }) => {
  const health = insights.series_health;
  const backlog = insights.backlog;
  const value = insights.collection_value;
  const timeline = insights.reading_timeline;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Key Metrics Cards */}
      <MetricCard
        title="Series Health"
        metric={health.summary.complete_and_ongoing}
        label="Healthy Series"
        icon="🏥"
        color="text-green-600 dark:text-green-400"
        details={`${health.summary.abandoned_count} abandoned, ${health.summary.incomplete_count} incomplete`}
      />

      <MetricCard
        title="Unread Backlog"
        metric={backlog.total_unread}
        label="Books to Read"
        icon="📚"
        color="text-blue-600 dark:text-blue-400"
        details={`${backlog.total_in_progress} currently reading`}
      />

      <MetricCard
        title="Collection Value"
        metric={`$${value.total_collection_value.toLocaleString()}`}
        label="Estimated Value"
        icon="💰"
        color="text-purple-600 dark:text-purple-400"
        details={`${value.books_with_price} books with price data`}
      />

      <MetricCard
        title="Reading Pace"
        metric={timeline.reading_pace.books_per_month.toFixed(1)}
        label="Books/Month"
        icon="⏰"
        color="text-orange-600 dark:text-orange-400"
        details={`${timeline.reading_pace.average_days_per_book.toFixed(0)} days/book average`}
      />

      <MetricCard
        title="Current Reads"
        metric={timeline.current_reads.length}
        label="In Progress"
        icon="👀"
        color="text-red-600 dark:text-red-400"
        details={`${timeline.current_reads.filter(r => r.estimated_finish_date).length} with finish estimates`}
      />

      <MetricCard
        title="Total Series"
        metric={health.summary.total_series}
        label="Series in Library"
        icon="📖"
        color="text-indigo-600 dark:text-indigo-400"
        details={`${value.total_books} total books`}
      />
    </div>
  );
};

// Series Health Section
const SeriesHealthSection: React.FC<{ health: SeriesHealthData }> = ({ health }) => {
  const [expandedSection, setExpandedSection] = React.useState<'abandoned' | 'incomplete' | null>('abandoned');

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg border border-green-200 dark:border-gray-600">
        <h3 className="font-semibold text-green-900 dark:text-green-300 mb-1">✅ Healthy Series</h3>
        <p className="text-3xl font-bold text-green-600 dark:text-green-400">{health.healthy_series}</p>
        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
          Complete series with ongoing publication
        </p>
      </div>

      {/* Abandoned Series */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'abandoned' ? null : 'abandoned')}
          className="w-full bg-orange-50 dark:bg-gray-800 px-4 py-3 flex items-center justify-between hover:bg-orange-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div className="text-left">
              <h3 className="font-semibold text-orange-900 dark:text-orange-300">Abandoned Series</h3>
              <p className="text-sm text-orange-700 dark:text-orange-400">
                No new volumes in 2+ years
              </p>
            </div>
          </div>
          <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {health.summary.abandoned_count}
          </span>
        </button>

        {expandedSection === 'abandoned' && health.abandoned_series.length > 0 && (
          <div className="p-4 bg-white dark:bg-gray-900 space-y-3">
            {health.abandoned_series.map((series, idx) => (
              <div
                key={idx}
                className="p-3 bg-orange-50 dark:bg-gray-800 rounded border border-orange-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{series.name}</h4>
                  <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                    {series.years_since_publication} years since last volume
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Owned: {series.owned_count}/{series.total_count} volumes
                  {series.owned_count < series.total_count && ` (${series.total_count - series.owned_count} missing)`}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Last published: {new Date(series.last_volume_date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incomplete Series */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'incomplete' ? null : 'incomplete')}
          className="w-full bg-yellow-50 dark:bg-gray-800 px-4 py-3 flex items-center justify-between hover:bg-yellow-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📖</span>
            <div className="text-left">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-300">Incomplete Series</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Missing volumes you don't own
              </p>
            </div>
          </div>
          <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {health.summary.incomplete_count}
          </span>
        </button>

        {expandedSection === 'incomplete' && health.incomplete_series.length > 0 && (
          <div className="p-4 bg-white dark:bg-gray-900 space-y-3">
            {health.incomplete_series.map((series, idx) => (
              <div
                key={idx}
                className="p-3 bg-yellow-50 dark:bg-gray-800 rounded border border-yellow-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{series.name}</h4>
                  <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                    {series.owned_count}/{series.total_count} volumes
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                  <div
                    className="bg-yellow-600 dark:bg-yellow-400 h-2 rounded-full"
                    style={{ width: `${(series.owned_count / series.total_count) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Missing volumes: {series.missing_volumes.join(', ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Backlog Section
const BacklogSection: React.FC<{ backlog: BacklogData }> = ({ backlog }) => {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-gray-700">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Unread</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{backlog.total_unread}</p>
        </div>
        <div className="bg-purple-50 dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-gray-700">
          <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">Currently Reading</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{backlog.total_in_progress}</p>
        </div>
      </div>

      {/* Recommendations */}
      {backlog.recommendations.length > 0 && (
        <div className="bg-green-50 dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-gray-700">
          <h3 className="font-semibold text-green-900 dark:text-green-300 mb-3">📝 Catch-Up Recommendations</h3>
          <div className="space-y-2">
            {backlog.recommendations.slice(0, 5).map((rec, idx) => (
              <div key={idx} className="text-sm text-green-800 dark:text-green-300 p-2 bg-green-100 dark:bg-gray-700 rounded">
                <p className="font-medium">{rec.series_name}</p>
                <p className="text-xs text-green-700 dark:text-green-400">{rec.reason} → {rec.action} (Vol {rec.next_volume})</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Series Backlog */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📚 Unread by Series</h3>
        <div className="space-y-3">
          {backlog.unread_by_series
            .filter(s => s.unread_count > 0 || s.in_progress_count > 0)
            .slice(0, 10)
            .map((series, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  series.priority === 'high'
                    ? 'bg-red-50 dark:bg-gray-800 border-red-200 dark:border-gray-700'
                    : series.priority === 'medium'
                    ? 'bg-yellow-50 dark:bg-gray-800 border-yellow-200 dark:border-gray-700'
                    : 'bg-blue-50 dark:bg-gray-800 border-blue-200 dark:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{series.series_name}</h4>
                  <span className={`text-xs px-2 py-1 rounded font-semibold ${
                    series.priority === 'high'
                      ? 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : series.priority === 'medium'
                      ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {series.priority.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  <p>Unread: {series.unread_count} | Reading: {series.in_progress_count} | Total: {series.owned_count}</p>
                  {series.next_to_read && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Next: Vol {series.next_to_read.volume} - {series.next_to_read.title}
                    </p>
                  )}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-orange-600 dark:bg-orange-400 h-2 rounded-full"
                    style={{ width: `${series.completion_ratio * 100}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

// Collection Value Section
const CollectionValueSection: React.FC<{ value: CollectionValueData }> = ({ value }) => {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-purple-50 dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-gray-700">
          <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">Total Value</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            ${value.total_collection_value.toLocaleString()}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-gray-700">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Average Price</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            ${value.average_book_value.toFixed(2)}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-gray-700">
          <p className="text-sm text-green-700 dark:text-green-300 font-medium">Books Priced</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {value.books_with_price}/{value.total_books}
          </p>
        </div>
      </div>

      {/* Value by Format */}
      {Object.keys(value.value_by_format).length > 0 && (
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Value by Format</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(value.value_by_format).map(([format, amount]) => (
              <div key={format} className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium capitalize">{format}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">${amount.toFixed(0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Most Valuable Items */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">💎 Top 10 Most Valuable</h3>
        <div className="space-y-2">
          {value.most_valuable_items.slice(0, 10).map((item, idx) => (
            <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white text-sm">{item.title}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {item.authors} • {item.format}
                </p>
              </div>
              <p className="font-bold text-purple-600 dark:text-purple-400 ml-2 whitespace-nowrap">
                ${item.price.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Reading Timeline Section
const ReadingTimelineSection: React.FC<{ timeline: ReadingTimelineData }> = ({ timeline }) => {
  const pace = timeline.reading_pace;

  return (
    <div className="space-y-4">
      {/* Reading Pace */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-indigo-50 dark:bg-gray-800 p-4 rounded-lg border border-indigo-200 dark:border-gray-700">
          <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">Books/Month</p>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{pace.books_per_month.toFixed(1)}</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
            {pace.confidence > 0 && `${(pace.confidence * 100).toFixed(0)}% confidence`}
          </p>
        </div>
        <div className="bg-teal-50 dark:bg-gray-800 p-4 rounded-lg border border-teal-200 dark:border-gray-700">
          <p className="text-sm text-teal-700 dark:text-teal-300 font-medium">Pages/Day</p>
          <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{pace.pages_per_day.toFixed(0)}</p>
        </div>
        <div className="bg-cyan-50 dark:bg-gray-800 p-4 rounded-lg border border-cyan-200 dark:border-gray-700">
          <p className="text-sm text-cyan-700 dark:text-cyan-300 font-medium">Days/Book</p>
          <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">{pace.average_days_per_book.toFixed(0)}</p>
        </div>
        <div className="bg-lime-50 dark:bg-gray-800 p-4 rounded-lg border border-lime-200 dark:border-gray-700">
          <p className="text-sm text-lime-700 dark:text-lime-300 font-medium">Books Tracked</p>
          <p className="text-3xl font-bold text-lime-600 dark:text-lime-400">{pace.books_completed_tracked}</p>
        </div>
      </div>

      {/* Current Reads */}
      {timeline.current_reads.length > 0 && (
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">👀 Currently Reading</h3>
          <div className="space-y-3">
            {timeline.current_reads.map((read, idx) => (
              <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{read.title}</p>
                    {read.series_name && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {read.series_name} {read.series_position && `• Vol ${read.series_position}`}
                      </p>
                    )}
                  </div>
                </div>
                {read.total_pages && (
                  <>
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>{read.progress_percentage.toFixed(1)}% complete</span>
                      <span>
                        {read.current_page}/{read.total_pages} pages
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                      <div
                        className="bg-orange-600 dark:bg-orange-400 h-2 rounded-full"
                        style={{ width: `${read.progress_percentage}%` }}
                      />
                    </div>
                  </>
                )}
                {read.estimated_finish_date && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    📅 Finish in ~{read.days_until_completion} days ({new Date(read.estimated_finish_date).toLocaleDateString()})
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Series Completion Timeline */}
      {timeline.series_timelines.length > 0 && (
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📅 Series Completion Timeline</h3>
          <div className="space-y-2">
            {timeline.series_timelines.slice(0, 8).map((series, idx) => (
              <div key={idx} className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium text-gray-900 dark:text-white">{series.series_name}</p>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {series.unread_in_series} unread
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  ⏰ ~{series.months_until_completion.toFixed(1)} months ({new Date(series.estimated_series_completion).toLocaleDateString()})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  title: string;
  metric: string | number;
  label: string;
  icon: string;
  color: string;
  details?: string;
}> = ({ title, metric, label, icon, color, details }) => (
  <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-2">
      <span className="text-2xl">{icon}</span>
      <span className={`text-xs font-medium text-gray-500 dark:text-gray-400`}>{title}</span>
    </div>
    <p className={`text-3xl font-bold ${color} mb-1`}>{metric}</p>
    <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
    {details && <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{details}</p>}
  </div>
);

export default SmartInsightsPage;
