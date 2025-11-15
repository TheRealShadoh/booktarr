import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Zap, Eye, EyeOff } from 'lucide-react';

interface IntegrationStatus {
  enabled: boolean;
  last_checked: string | null;
  errors: number;
}

interface IntegrationInfo {
  name: string;
  status: string;
  features: string[];
  setup: string;
  docs?: string;
}

interface Integrations {
  [key: string]: IntegrationStatus;
}

interface IntegrationGuide {
  [key: string]: IntegrationInfo;
}

export const IntegrationSettings: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integrations>({});
  const [guide, setGuide] = useState<IntegrationGuide>({});
  const [preferences, setPreferences] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrationSettings();
  }, []);

  const loadIntegrationSettings = async () => {
    try {
      setLoading(true);
      const [statusRes, prefRes, guideRes] = await Promise.all([
        fetch('/api/integrations/status'),
        fetch('/api/integrations/preferences'),
        fetch('/api/integrations/integration-guide')
      ]);

      if (statusRes.ok && prefRes.ok && guideRes.ok) {
        const statusData = await statusRes.json();
        const prefData = await prefRes.json();
        const guideData = await guideRes.json();

        setIntegrations(statusData.integrations || {});
        setPreferences(prefData || {});
        setGuide(guideData.integrations || {});
      }
    } catch (err) {
      setError('Failed to load integration settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleIntegration = async (source: string, enable: boolean) => {
    try {
      setSaving(true);
      const endpoint = enable ? `/api/integrations/enable/${source}` : `/api/integrations/disable/${source}`;
      const res = await fetch(endpoint, { method: 'POST' });

      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.status.integrations);
        setSuccess(`Integration ${source} ${enable ? 'enabled' : 'disabled'}`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to update integration');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/integrations/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      if (res.ok) {
        const data = await res.json();
        setPreferences(data);
        setSuccess('Preferences saved successfully');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to save preferences');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">{success}</div>
        </div>
      )}

      {/* User Preferences */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Preferences</h3>

        <div className="space-y-4">
          {/* Primary Metadata Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Metadata Source
            </label>
            <select
              value={preferences.primary_source || 'google_books'}
              onChange={(e) => handlePreferenceChange('primary_source', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="google_books">Google Books</option>
              <option value="openlibrary">OpenLibrary</option>
              <option value="goodreads">Goodreads</option>
            </select>
            <p className="mt-1 text-sm text-gray-600">
              Used for book searches and metadata enrichment
            </p>
          </div>

          {/* Manga Metadata Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Manga Metadata Source
            </label>
            <select
              value={preferences.manga_source || 'anilist'}
              onChange={(e) => handlePreferenceChange('manga_source', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="anilist">AniList (Recommended)</option>
              <option value="myanimelist">MyAnimeList</option>
            </select>
            <p className="mt-1 text-sm text-gray-600">
              Used for manga series metadata and volume information
            </p>
          </div>

          {/* Sync Options */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={preferences.sync_reading_progress || false}
                onChange={(e) => handlePreferenceChange('sync_reading_progress', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-orange-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700">Sync Reading Progress</span>
            </label>
            <p className="text-sm text-gray-600 ml-7 mb-3">
              Automatically sync reading progress with external services
            </p>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.sync_ratings || false}
                onChange={(e) => handlePreferenceChange('sync_ratings', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-orange-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700">Sync Ratings</span>
            </label>
            <p className="text-sm text-gray-600 ml-7">
              Automatically sync book ratings with external services
            </p>
          </div>

          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg transition"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Integration Status Cards */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Connected Services</h3>

        <div className="space-y-3">
          {Object.entries(integrations).map(([source, status]) => (
            <div key={source} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${status.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <div>
                    <h4 className="font-medium text-gray-900 capitalize">
                      {source.replace(/_/g, ' ')}
                    </h4>
                    {status.last_checked && (
                      <p className="text-sm text-gray-600">
                        Last checked: {new Date(status.last_checked).toLocaleDateString()}
                      </p>
                    )}
                    {status.errors > 0 && (
                      <p className="text-sm text-red-600">
                        {status.errors} error{status.errors !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleIntegration(source, !status.enabled)}
                  disabled={saving}
                  className={`px-3 py-1 rounded text-sm font-medium transition ${
                    status.enabled
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  } disabled:opacity-50`}
                >
                  {status.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Details</h3>

        <div className="space-y-2">
          {Object.entries(guide).map(([source, info]) => (
            <div key={source} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedIntegration(expandedIntegration === source ? null : source)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <div className="text-left">
                    <h4 className="font-medium text-gray-900">{info.name}</h4>
                    <p className="text-sm text-gray-600">{info.status}</p>
                  </div>
                </div>
                {expandedIntegration === source ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              {expandedIntegration === source && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 space-y-3">
                  <div>
                    <h5 className="font-medium text-sm text-gray-900 mb-2">Features</h5>
                    <ul className="space-y-1">
                      {info.features.map((feature, i) => (
                        <li key={i} className="text-sm text-gray-700">• {feature}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-medium text-sm text-gray-900 mb-2">Setup</h5>
                    <p className="text-sm text-gray-700">{info.setup}</p>
                    {info.docs && (
                      <a
                        href={info.docs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-orange-500 hover:text-orange-600 inline-block mt-2"
                      >
                        View Documentation →
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Integration Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 Tips for Best Results</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Enable multiple metadata sources for better coverage</li>
          <li>• Use AniList for manga series to get accurate volume counts</li>
          <li>• Goodreads integration requires an API key from goodreads.com/api</li>
          <li>• MyAnimeList requires a Client ID from their API settings</li>
          <li>• Google Books and OpenLibrary work automatically without setup</li>
        </ul>
      </div>
    </div>
  );
};
