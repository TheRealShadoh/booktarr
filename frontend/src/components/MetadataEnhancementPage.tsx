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
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📚 Metadata Enhancement
        </h1>
        <p className="text-gray-600">
          Enhance your book metadata with data from Google Books and Open Library APIs
        </p>
      </div>

      {/* Cache Statistics */}
      {cacheStats && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            📊 Cache Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Book Cache</h3>
              <p className="text-sm text-gray-600">
                Size: {cacheStats.cache_stats.book_cache.size}/{cacheStats.cache_stats.book_cache.max_size}
              </p>
              <p className="text-sm text-gray-600">
                Hit Rate: {(cacheStats.cache_stats.book_cache.hit_rate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">API Cache</h3>
              <p className="text-sm text-gray-600">
                Size: {cacheStats.cache_stats.api_cache.size}/{cacheStats.cache_stats.api_cache.max_size}
              </p>
              <p className="text-sm text-gray-600">
                Hit Rate: {(cacheStats.cache_stats.api_cache.hit_rate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Page Cache</h3>
              <p className="text-sm text-gray-600">
                Size: {cacheStats.cache_stats.page_cache.size}/{cacheStats.cache_stats.page_cache.max_size}
              </p>
              <p className="text-sm text-gray-600">
                Hit Rate: {(cacheStats.cache_stats.page_cache.hit_rate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleClearCache}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              Clear Cache
            </button>
            <button
              onClick={loadCacheStats}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
            >
              Refresh Stats
            </button>
          </div>
        </div>
      )}

      {/* Enhancement Controls */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          ⬇️ Enhance All Books
        </h2>
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={forceRefresh}
              onChange={(e) => setForceRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Force refresh (bypass cache)
            </span>
          </label>
        </div>
        <button
          onClick={handleEnhanceAllBooks}
          disabled={isEnhancing}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700">
            <span className="text-lg">⚠️</span>
            <span className="font-medium">Error</span>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Enhancement Results */}
      {enhancementResult && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Enhancement Results</h2>
          
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{enhancementResult.enhanced_books}</div>
              <div className="text-sm text-green-700">Enhanced</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{enhancementResult.cached_books}</div>
              <div className="text-sm text-blue-700">Cached</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{enhancementResult.failed_books}</div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-600">{enhancementResult.total_books}</div>
              <div className="text-sm text-gray-700">Total</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatProcessingTime(enhancementResult.processing_time)}
              </div>
              <div className="text-sm text-purple-700">Time</div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Detailed Results</h3>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {enhancementResult.results.map((result: EnhancementResult) => (
                <div key={result.isbn} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <div className="font-medium">{result.isbn}</div>
                      {result.enhanced_book && (
                        <div className="text-sm text-gray-600">{result.enhanced_book.title}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {formatProcessingTime(result.processing_time)}
                    </div>
                    {result.sources_used && result.sources_used.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {result.sources_used.join(', ')}
                      </div>
                    )}
                    {result.error_message && (
                      <div className="text-xs text-red-500 max-w-xs truncate">
                        {result.error_message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetadataEnhancementPage;