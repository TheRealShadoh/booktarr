import React, { useState, useEffect } from 'react';
import booktarrAPI from '../services/api';
import { BatchEnhancementResponse, EnhancementResult, CacheStatsResponse } from '../types';

const MetadataEnhancementPage: React.FC = () => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementResult, setEnhancementResult] = useState<BatchEnhancementResponse | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState(false);

  useEffect(() => {
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    try {
      const stats = await booktarrAPI.getEnhancementCacheStats();
      setCacheStats(stats);
    } catch (err) {
      console.error('Failed to load cache stats:', err);
    }
  };

  const handleEnhanceAllBooks = async () => {
    setIsEnhancing(true);
    setError(null);
    setEnhancementResult(null);

    try {
      const result = await booktarrAPI.enhanceAllBooksMetadata({ force_refresh: forceRefresh });
      setEnhancementResult(result);
      await loadCacheStats();
    } catch (err: any) {
      setError(err?.message || 'Failed to enhance metadata');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleClearCache = async () => {
    try {
      await booktarrAPI.clearEnhancementCache();
      await loadCacheStats();
    } catch (err: any) {
      setError(err?.message || 'Failed to clear cache');
    }
  };

  const formatProcessingTime = (seconds: number) => {
    return `${seconds.toFixed(2)}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-green-500">✅</span>;
      case 'cached':
        return <span className="text-blue-500">💾</span>;
      case 'failed':
        return <span className="text-red-500">❌</span>;
      default:
        return <span className="text-yellow-500">⏳</span>;
    }
  };

  return (
    <div className="booktarr-main-content">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="booktarr-card-header">
          <h1 className="text-3xl font-bold text-booktarr-text mb-2">
            📚 Metadata Enhancement
          </h1>
          <p className="text-booktarr-textSecondary">
            Enhance your book metadata with data from Google Books and Open Library APIs
          </p>
        </div>

        {/* Cache Statistics */}
        {cacheStats && (
          <div className="booktarr-card">
            <div className="booktarr-card-header">
              <h2 className="text-xl font-semibold text-booktarr-text">
                📊 Cache Statistics
              </h2>
            </div>
            <div className="booktarr-card-body">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-booktarr-surface2 p-4 rounded-lg border border-booktarr-border">
                  <h3 className="font-medium text-booktarr-text mb-2">Book Cache</h3>
                  <p className="text-sm text-booktarr-textSecondary">
                    Size: {cacheStats.cache_stats.book_cache.size}/{cacheStats.cache_stats.book_cache.max_size}
                  </p>
                  <p className="text-sm text-booktarr-textSecondary">
                    Hit Rate: {(cacheStats.cache_stats.book_cache.hit_rate * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-booktarr-surface2 p-4 rounded-lg border border-booktarr-border">
                  <h3 className="font-medium text-booktarr-text mb-2">API Cache</h3>
                  <p className="text-sm text-booktarr-textSecondary">
                    Size: {cacheStats.cache_stats.api_cache.size}/{cacheStats.cache_stats.api_cache.max_size}
                  </p>
                  <p className="text-sm text-booktarr-textSecondary">
                    Hit Rate: {(cacheStats.cache_stats.api_cache.hit_rate * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-booktarr-surface2 p-4 rounded-lg border border-booktarr-border">
                  <h3 className="font-medium text-booktarr-text mb-2">Page Cache</h3>
                  <p className="text-sm text-booktarr-textSecondary">
                    Size: {cacheStats.cache_stats.page_cache.size}/{cacheStats.cache_stats.page_cache.max_size}
                  </p>
                  <p className="text-sm text-booktarr-textSecondary">
                    Hit Rate: {(cacheStats.cache_stats.page_cache.hit_rate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleClearCache}
                  className="booktarr-btn booktarr-btn-danger"
                >
                  Clear Cache
                </button>
                <button
                  onClick={loadCacheStats}
                  className="booktarr-btn booktarr-btn-secondary"
                >
                  Refresh Stats
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhancement Controls */}
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-xl font-semibold text-booktarr-text">
              ⬇️ Enhance All Books
            </h2>
          </div>
          <div className="booktarr-card-body">
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={forceRefresh}
                  onChange={(e) => setForceRefresh(e.target.checked)}
                  className="booktarr-filter-checkbox"
                />
                <span className="text-sm text-booktarr-text">
                  Force refresh (bypass cache)
                </span>
              </label>
            </div>
            <button
              onClick={handleEnhanceAllBooks}
              disabled={isEnhancing}
              className={`booktarr-btn ${isEnhancing ? 'booktarr-btn-secondary' : 'booktarr-btn-primary'} flex items-center gap-2`}
            >
              {isEnhancing ? (
                <>
                  ⏳ Enhancing...
                </>
              ) : (
                <>
                  ⬇️ Enhance All Books
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="booktarr-card border-booktarr-error">
            <div className="booktarr-card-body">
              <div className="flex items-center gap-2 text-booktarr-error">
                <span className="text-lg">⚠️</span>
                <span className="font-medium">Error</span>
              </div>
              <p className="text-booktarr-error mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Enhancement Results */}
        {enhancementResult && (
          <div className="booktarr-card">
            <div className="booktarr-card-header">
              <h2 className="text-xl font-semibold text-booktarr-text">Enhancement Results</h2>
            </div>
            <div className="booktarr-card-body">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="booktarr-status-indicator booktarr-status-success text-center p-4 rounded-lg">
                  <div className="text-2xl font-bold">{enhancementResult.enhanced_books}</div>
                  <div className="text-sm">Enhanced</div>
                </div>
                <div className="booktarr-status-indicator booktarr-status-info text-center p-4 rounded-lg">
                  <div className="text-2xl font-bold">{enhancementResult.cached_books}</div>
                  <div className="text-sm">Cached</div>
                </div>
                <div className="booktarr-status-indicator booktarr-status-error text-center p-4 rounded-lg">
                  <div className="text-2xl font-bold">{enhancementResult.failed_books}</div>
                  <div className="text-sm">Failed</div>
                </div>
                <div className="bg-booktarr-surface2 p-4 rounded-lg text-center border border-booktarr-border">
                  <div className="text-2xl font-bold text-booktarr-text">{enhancementResult.total_books}</div>
                  <div className="text-sm text-booktarr-textSecondary">Total</div>
                </div>
                <div className="bg-booktarr-surface2 p-4 rounded-lg text-center border border-booktarr-border">
                  <div className="text-2xl font-bold text-booktarr-accent">
                    {formatProcessingTime(enhancementResult.processing_time)}
                  </div>
                  <div className="text-sm text-booktarr-textSecondary">Time</div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-booktarr-text">Detailed Results</h3>
                <div className="max-h-96 overflow-y-auto space-y-2 scrollbar-thin">
                  {enhancementResult.results.map((result: EnhancementResult) => (
                    <div key={result.isbn} className="flex items-center justify-between p-3 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <div className="font-medium text-booktarr-text">{result.isbn}</div>
                          {result.enhanced_book && (
                            <div className="text-sm text-booktarr-textSecondary">{result.enhanced_book.title}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-booktarr-textSecondary">
                          {formatProcessingTime(result.processing_time)}
                        </div>
                        {result.sources_used && result.sources_used.length > 0 && (
                          <div className="text-xs text-booktarr-textMuted">
                            {result.sources_used.join(', ')}
                          </div>
                        )}
                        {result.error_message && (
                          <div className="text-xs text-booktarr-error max-w-xs truncate">
                            {result.error_message}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetadataEnhancementPage;