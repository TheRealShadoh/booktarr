/**
 * Settings page component for managing application configuration
 */
import React, { useState, useEffect } from 'react';
import { SettingsPageProps, Settings, SettingsUpdateRequest } from '../types';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import Toast from './Toast';

const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  onValidateUrl,
  loading = false,
  error = null
}) => {
  const [formData, setFormData] = useState<SettingsUpdateRequest>({});
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        skoolib_url: settings.skoolib_url || '',
        google_books_api_key: settings.google_books_api_key || '',
        cache_ttl: settings.cache_ttl,
        enable_price_lookup: settings.enable_price_lookup,
        default_language: settings.default_language,
      });
    }
  }, [settings]);

  const handleInputChange = (field: keyof SettingsUpdateRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateSettings(formData);
      setToast({ message: 'Settings updated successfully!', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to update settings', type: 'error' });
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="bg-gray-800 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Skoolib Configuration */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Skoolib Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Skoolib Share URL
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={formData.skoolib_url || ''}
                    onChange={(e) => handleInputChange('skoolib_url', e.target.value)}
                    placeholder="https://skoolib.com/share/..."
                    data-testid="skoolib-url-input"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleValidateUrl}
                    disabled={validationLoading}
                    data-testid="validate-url-button"
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    {validationLoading ? 'Validating...' : 'Validate'}
                  </button>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Enter your Skoolib library share URL to import your books
                </p>
                
                {validationResult && (
                  <div className={`mt-2 p-3 rounded-md ${
                    validationResult.valid ? 'bg-green-900/20 border border-green-500/50' : 'bg-red-900/20 border border-red-500/50'
                  }`}>
                    <p className={`text-sm ${validationResult.valid ? 'text-green-400' : 'text-red-400'}`}>
                      {validationResult.valid ? (
                        <>
                          ✓ Valid URL! Found {validationResult.isbn_count || 0} books
                          {validationResult.warning && (
                            <span className="block text-yellow-400 mt-1">⚠ {validationResult.warning}</span>
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

          {/* API Configuration */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">API Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Google Books API Key (Optional)
                </label>
                <input
                  type="password"
                  value={formData.google_books_api_key || ''}
                  onChange={(e) => handleInputChange('google_books_api_key', e.target.value)}
                  placeholder="Enter your Google Books API key"
                  data-testid="google-api-key-input"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
                <p className="text-sm text-gray-400 mt-1">
                  Optional: Provides higher rate limits for Google Books API
                </p>
              </div>
            </div>
          </div>

          {/* Application Settings */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Application Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cache TTL (seconds)
                </label>
                <input
                  type="number"
                  min="60"
                  max="86400"
                  value={formData.cache_ttl || 3600}
                  onChange={(e) => handleInputChange('cache_ttl', parseInt(e.target.value))}
                  data-testid="cache-ttl-input"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-sm text-gray-400 mt-1">
                  How long to cache API responses (60-86400 seconds)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Default Language
                </label>
                <select
                  value={formData.default_language || 'en'}
                  onChange={(e) => handleInputChange('default_language', e.target.value)}
                  data-testid="default-language-select"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-purple-500"
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
                    className="rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-300">
                    Enable price lookup
                  </span>
                </label>
                <p className="text-sm text-gray-400 mt-1 ml-6">
                  Fetch pricing information from external sources
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              data-testid="save-settings-button"
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-md transition-colors"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;