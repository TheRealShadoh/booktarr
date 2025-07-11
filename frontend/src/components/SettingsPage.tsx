/**
 * Enhanced Settings page component with optimistic updates and state management
 */
import React, { useState, useEffect } from 'react';
import { SettingsPageProps, Settings, SettingsUpdateRequest } from '../types';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import Toast from './Toast';
import { useStateManager } from '../hooks/useStateManager';

const SettingsPage: React.FC<SettingsPageProps> = ({
  settings: propsSettings,
  onUpdateSettings,
  onValidateUrl,
  loading: propsLoading = false,
  error: propsError = null
}) => {
  const {
    state,
    updateSettingsWithOptimizations,
    getCacheInfo,
    clearCache,
    exportData,
    syncWithServer,
    showToast
  } = useStateManager();
  
  // Use state from context if available, fallback to props
  const settings = state.settings || propsSettings;
  const loading = state.settingsLoading || propsLoading;
  const error = state.error || propsError;
  const [formData, setFormData] = useState<SettingsUpdateRequest>({});
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        skoolib_url: settings.skoolib_url || '',
        google_books_api_key: settings.google_books_api_key || '',
        open_library_api_key: settings.open_library_api_key || '',
        cache_ttl: settings.cache_ttl,
        enable_price_lookup: settings.enable_price_lookup,
        default_language: settings.default_language,
      });
      
      // Load sync history and cache stats
      loadSyncHistory();
      loadCacheStats();
    }
  }, [settings]);

  const loadSyncHistory = async () => {
    try {
      const response = await fetch('/api/settings/sync-history');
      if (response.ok) {
        const data = await response.json();
        setSyncHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load sync history:', error);
    }
  };

  const loadCacheStats = async () => {
    try {
      const response = await fetch('/api/settings/cache/stats');
      if (response.ok) {
        const data = await response.json();
        setCacheStats(data);
      }
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  const handleClearCache = async (cacheType?: string) => {
    setCacheLoading(true);
    try {
      await clearCache(cacheType);
      
      // Reload cache stats
      await loadCacheStats();
    } catch (error) {
      // Error handling is done by clearCache
    } finally {
      setCacheLoading(false);
    }
  };

  const handleInputChange = (field: keyof SettingsUpdateRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Use optimistic updates
      await updateSettingsWithOptimizations(formData);
    } catch (error) {
      // Error handling is done by optimistic updates
    }
  };

  const handleValidateUrl = async () => {
    if (!formData.skoolib_url) {
      setToast({ message: 'Please enter a Skoolib URL first', type: 'warning' });
      return;
    }

    setValidationLoading(true);
    setValidationResult(null);

    try {
      const result = await onValidateUrl(formData.skoolib_url);
      setValidationResult(result);
      
      if (result.valid) {
        setToast({ 
          message: `URL is valid! Found ${result.isbn_count || 0} books.`, 
          type: 'success' 
        });
      } else {
        setToast({ 
          message: `URL validation failed: ${result.error}`, 
          type: 'error' 
        });
      }
    } catch (error) {
      setToast({ message: 'Failed to validate URL', type: 'error' });
    } finally {
      setValidationLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncLoading(true);
    
    try {
      const response = await fetch('/api/settings/sync-skoolib', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setToast({ 
          message: result.message || `Sync completed! Added ${result.books_added} new books.`,
          type: 'success' 
        });
        
        // Reload sync history
        await loadSyncHistory();
      } else {
        setToast({ 
          message: result.detail || result.message || 'Sync failed',
          type: 'error' 
        });
      }
    } catch (error) {
      setToast({ message: 'Failed to start sync', type: 'error' });
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message="Loading settings..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <ErrorMessage error={error} />
      </div>
    );
  }

  return (
    <div className="booktarr-main-content">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h1 className="text-2xl font-bold text-booktarr-text mb-2">Settings</h1>
            <p className="text-booktarr-textSecondary">Configure Booktarr settings and preferences</p>
          </div>
          <div className="booktarr-card-body">
        
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Skoolib Configuration */}
              <div className="booktarr-card">
                <div className="booktarr-card-header">
                  <h2 className="text-lg font-semibold text-booktarr-text">Skoolib Configuration</h2>
                </div>
                <div className="booktarr-card-body">
                  <div className="space-y-4">
                    <div>
                      <label className="booktarr-form-label">
                        Skoolib Share URL
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="url"
                          value={formData.skoolib_url || ''}
                          onChange={(e) => handleInputChange('skoolib_url', e.target.value)}
                          placeholder="https://skoolib.com/share/..."
                          data-testid="skoolib-url-input"
                          className="booktarr-form-input flex-1"
                        />
                        <button
                          type="button"
                          onClick={handleValidateUrl}
                          disabled={validationLoading}
                          data-testid="validate-url-button"
                          className="booktarr-btn booktarr-btn-primary"
                        >
                          {validationLoading ? 'Validating...' : 'Validate'}
                        </button>
                      </div>
                      <p className="text-sm text-booktarr-textSecondary mt-1">
                        Enter your Skoolib library share URL to import your books
                      </p>
                      
                      {validationResult && (
                        <div className={`mt-2 p-3 rounded-md ${
                          validationResult.valid ? 'booktarr-status-indicator booktarr-status-success' : 'booktarr-status-indicator booktarr-status-error'
                        }`}>
                          <p className="text-sm">
                            {validationResult.valid ? (
                              <>
                                ✓ Valid URL! Found {validationResult.isbn_count || 0} books
                                {validationResult.warning && (
                                  <span className="block text-booktarr-warning mt-1">⚠ {validationResult.warning}</span>
                                )}
                              </>
                            ) : (
                              <>✗ {validationResult.error}</>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* API Configuration */}
              <div className="booktarr-card">
                <div className="booktarr-card-header">
                  <h2 className="text-lg font-semibold text-booktarr-text">API Configuration</h2>
                </div>
                <div className="booktarr-card-body">
                  <div className="space-y-4">
                    <div>
                      <label className="booktarr-form-label">
                        Google Books API Key (Optional)
                      </label>
                      <input
                        type="password"
                        value={formData.google_books_api_key || ''}
                        onChange={(e) => handleInputChange('google_books_api_key', e.target.value)}
                        placeholder="Enter your Google Books API key"
                        data-testid="google-api-key-input"
                        className="booktarr-form-input"
                      />
                      <p className="text-sm text-booktarr-textSecondary mt-1">
                        Optional: Provides higher rate limits for Google Books API
                      </p>
                    </div>

                    <div>
                      <label className="booktarr-form-label">
                        Open Library API Key (Optional)
                      </label>
                      <input
                        type="password"
                        value={formData.open_library_api_key || ''}
                        onChange={(e) => handleInputChange('open_library_api_key', e.target.value)}
                        placeholder="Enter your Open Library API key"
                        data-testid="open-library-api-key-input"
                        className="booktarr-form-input"
                      />
                      <p className="text-sm text-booktarr-textSecondary mt-1">
                        Optional: Provides higher rate limits for Open Library API
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Application Settings */}
              <div className="booktarr-card">
                <div className="booktarr-card-header">
                  <h2 className="text-lg font-semibold text-booktarr-text">Application Settings</h2>
                </div>
                <div className="booktarr-card-body">
                  <div className="space-y-4">
                    <div>
                      <label className="booktarr-form-label">
                        Cache TTL (seconds)
                      </label>
                      <input
                        type="number"
                        min="60"
                        max="86400"
                        value={formData.cache_ttl || 3600}
                        onChange={(e) => handleInputChange('cache_ttl', parseInt(e.target.value))}
                        data-testid="cache-ttl-input"
                        className="booktarr-form-input"
                      />
                      <p className="text-sm text-booktarr-textSecondary mt-1">
                        How long to cache API responses (60-86400 seconds)
                      </p>
                    </div>

                    <div>
                      <label className="booktarr-form-label">
                        Default Language
                      </label>
                      <select
                        value={formData.default_language || 'en'}
                        onChange={(e) => handleInputChange('default_language', e.target.value)}
                        data-testid="default-language-select"
                        className="booktarr-form-input"
                      >
                        <option value="en">English</option>
                        <option value="fr">French</option>
                        <option value="es">Spanish</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                        <option value="pt">Portuguese</option>
                        <option value="ja">Japanese</option>
                        <option value="ko">Korean</option>
                        <option value="zh">Chinese</option>
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.enable_price_lookup || false}
                          onChange={(e) => handleInputChange('enable_price_lookup', e.target.checked)}
                          data-testid="enable-price-lookup-checkbox"
                          className="booktarr-filter-checkbox"
                        />
                        <span className="text-sm font-medium text-booktarr-text">
                          Enable price lookup
                        </span>
                      </label>
                      <p className="text-sm text-booktarr-textSecondary mt-1 ml-6">
                        Fetch pricing information from external sources
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync Management */}
              <div className="booktarr-card">
                <div className="booktarr-card-header">
                  <h2 className="text-lg font-semibold text-booktarr-text">Sync Management</h2>
                </div>
                <div className="booktarr-card-body space-y-4">
                  <div className="bg-booktarr-surface2 rounded-lg p-4 border border-booktarr-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-booktarr-text">Manual Skoolib Sync</span>
                      {formData.skoolib_url && (
                        <span className="booktarr-status-indicator booktarr-status-success">
                          Ready
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-booktarr-textSecondary mb-4">
                      Manually trigger synchronization with your Skoolib library to import new books.
                      {!formData.skoolib_url && " Please configure your Skoolib URL first."}
                    </p>
                    <button
                      type="button"
                      onClick={handleManualSync}
                      disabled={syncLoading || !formData.skoolib_url}
                      data-testid="manual-sync-button"
                      className="booktarr-btn booktarr-btn-primary"
                    >
                      {syncLoading ? 'Syncing...' : 'Sync Now'}
                    </button>
                  </div>

                  {/* Sync History */}
                  {syncHistory.length > 0 && (
                    <div className="bg-booktarr-surface2 rounded-lg p-4 border border-booktarr-border">
                      <h3 className="text-md font-semibold text-booktarr-text mb-3">Recent Sync History</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                        {syncHistory.map((sync: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-booktarr-surface3 rounded">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className={`w-2 h-2 rounded-full ${sync.success ? 'bg-booktarr-success' : 'bg-booktarr-error'}`}></span>
                                <span className="text-sm text-booktarr-text">
                                  {sync.source} sync - {sync.books_processed}/{sync.books_found} books
                                </span>
                              </div>
                              {sync.error_details && (
                                <div className="text-xs text-booktarr-error mt-1 ml-4">
                                  {sync.error_details[0]}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-booktarr-textMuted">
                              {new Date(sync.timestamp).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cache Management */}
              <div className="booktarr-card">
                <div className="booktarr-card-header">
                  <h2 className="text-lg font-semibold text-booktarr-text">Cache Management</h2>
                </div>
                <div className="booktarr-card-body">
                  <div className="mb-4">
                    <h3 className="text-md font-semibold text-booktarr-text mb-2">Cache Statistics</h3>
                    {cacheStats ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-booktarr-surface2 p-3 rounded border border-booktarr-border">
                          <h4 className="text-sm font-medium text-booktarr-textSecondary mb-1">Book Cache</h4>
                          <p className="text-booktarr-text text-lg">{cacheStats.book_cache.size} items</p>
                          <p className="text-xs text-booktarr-textMuted">
                            Hit rate: {(cacheStats.book_cache.hit_rate * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-booktarr-surface2 p-3 rounded border border-booktarr-border">
                          <h4 className="text-sm font-medium text-booktarr-textSecondary mb-1">API Cache</h4>
                          <p className="text-booktarr-text text-lg">{cacheStats.api_cache.size} items</p>
                          <p className="text-xs text-booktarr-textMuted">
                            Hit rate: {(cacheStats.api_cache.hit_rate * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-booktarr-surface2 p-3 rounded border border-booktarr-border">
                          <h4 className="text-sm font-medium text-booktarr-textSecondary mb-1">Page Cache</h4>
                          <p className="text-booktarr-text text-lg">{cacheStats.page_cache.size} items</p>
                          <p className="text-xs text-booktarr-textMuted">
                            Hit rate: {(cacheStats.page_cache.hit_rate * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-booktarr-textSecondary text-sm">Loading cache statistics...</div>
                    )}
                  </div>

                  <div className="border-t border-booktarr-border pt-4">
                    <h3 className="text-md font-semibold text-booktarr-text mb-2">Clear Cache</h3>
                    <p className="text-sm text-booktarr-textSecondary mb-3">
                      Clear cached data to free up memory and force fresh data retrieval.
                      Note: Search results cache persists until manually cleared here.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleClearCache()}
                        disabled={cacheLoading}
                        className="booktarr-btn booktarr-btn-danger text-sm"
                      >
                        {cacheLoading ? 'Clearing...' : 'Clear All Caches'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClearCache('book')}
                        disabled={cacheLoading}
                        className="booktarr-btn booktarr-btn-secondary text-sm"
                      >
                        Clear Book Cache
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClearCache('api')}
                        disabled={cacheLoading}
                        className="booktarr-btn booktarr-btn-secondary text-sm"
                      >
                        Clear API Cache
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClearCache('page')}
                        disabled={cacheLoading}
                        className="booktarr-btn booktarr-btn-secondary text-sm"
                      >
                        Clear Page Cache
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Management */}
              <div className="booktarr-card">
                <div className="booktarr-card-header">
                  <h2 className="text-lg font-semibold text-booktarr-text">Data Management</h2>
                </div>
                <div className="booktarr-card-body">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={exportData}
                      className="booktarr-btn booktarr-btn-primary flex items-center justify-center space-x-2 py-3"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export Data</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={syncWithServer}
                      className="booktarr-btn booktarr-btn-primary flex items-center justify-center space-x-2 py-3"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Sync with Server</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => showToast('Performance metrics logged to console', 'info')}
                      className="booktarr-btn booktarr-btn-secondary flex items-center justify-center space-x-2 py-3"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>Performance Info</span>
                    </button>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-booktarr-border">
                    <h3 className="text-md font-semibold text-booktarr-text mb-2">Keyboard Shortcuts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-booktarr-textSecondary">Go to Library:</span>
                        <span className="text-booktarr-text font-mono">Ctrl + L</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-booktarr-textSecondary">Go to Settings:</span>
                        <span className="text-booktarr-text font-mono">Ctrl + S</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-booktarr-textSecondary">Add Books:</span>
                        <span className="text-booktarr-text font-mono">Ctrl + N</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-booktarr-textSecondary">Focus Search:</span>
                        <span className="text-booktarr-text font-mono">Ctrl + F</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-booktarr-textSecondary">Undo Action:</span>
                        <span className="text-booktarr-text font-mono">Ctrl + Z</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-booktarr-textSecondary">Redo Action:</span>
                        <span className="text-booktarr-text font-mono">Ctrl + Y</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  data-testid="save-settings-button"
                  className="booktarr-btn booktarr-btn-primary px-6"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;