import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

interface AmazonAuthStatus {
  audible_authenticated: boolean;
  kindle_authenticated: boolean;
  audible_last_sync: string | null;
  kindle_last_sync: string | null;
  audible_sync_status: string | null;
  kindle_sync_status: string | null;
}

interface SyncJob {
  id: number;
  service: string;
  job_type: string;
  status: string;
  books_found: number | null;
  books_added: number | null;
  books_updated: number | null;
  books_failed: number | null;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
}

const AmazonSyncPage: React.FC = () => {
  const { showToast } = useAppContext();
  const [authStatus, setAuthStatus] = useState<AmazonAuthStatus | null>(null);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Authentication form states
  const [showAudibleAuth, setShowAudibleAuth] = useState(false);
  const [audibleCredentials, setAudibleCredentials] = useState({
    username: '',
    password: '',
    marketplace: 'us'
  });
  
  // Kindle import states
  const [kindleImportType, setKindleImportType] = useState<'csv' | 'json' | 'device'>('csv');
  const [kindleDevicePath, setKindleDevicePath] = useState('/media/kindle');
  const [kindleFile, setKindleFile] = useState<File | null>(null);

  useEffect(() => {
    loadAuthStatus();
    loadSyncJobs();
  }, []);

  const loadAuthStatus = async () => {
    try {
      const response = await fetch('/api/amazon/status');
      if (response.ok) {
        const data = await response.json();
        setAuthStatus(data);
      }
    } catch (error) {
      console.error('Failed to load auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncJobs = async () => {
    try {
      const response = await fetch('/api/amazon/sync-jobs?limit=20');
      if (response.ok) {
        const data = await response.json();
        setSyncJobs(data);
      }
    } catch (error) {
      console.error('Failed to load sync jobs:', error);
    }
  };

  const handleAudibleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    
    try {
      const response = await fetch('/api/amazon/audible/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(audibleCredentials)
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast(`Audible authentication successful! Welcome, ${data.customer_name || 'User'}`, 'success');
        setShowAudibleAuth(false);
        setAudibleCredentials({ username: '', password: '', marketplace: 'us' });
        await loadAuthStatus();
      } else {
        showToast(data.error || 'Authentication failed', 'error');
      }
    } catch (error) {
      showToast('Authentication request failed', 'error');
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const handleAudibleSync = async () => {
    setSyncing(true);
    
    try {
      const response = await fetch('/api/amazon/audible/sync', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast('Audible library sync started!', 'success');
        await loadSyncJobs();
      } else {
        showToast(data.error || 'Sync failed to start', 'error');
      }
    } catch (error) {
      showToast('Sync request failed', 'error');
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const handleKindleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    
    try {
      let response;
      
      if (kindleImportType === 'device') {
        response = await fetch('/api/amazon/kindle/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_path: kindleDevicePath })
        });
      } else if (kindleFile) {
        const formData = new FormData();
        formData.append('file', kindleFile);
        
        const endpoint = kindleImportType === 'csv' ? '/api/amazon/kindle/import/csv' : '/api/amazon/kindle/import/json';
        response = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });
      } else {
        showToast('Please select a file to import', 'error');
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        showToast(`Kindle import started! Found ${data.items_found} items`, 'success');
        await loadSyncJobs();
      } else {
        showToast(data.error || 'Import failed', 'error');
      }
    } catch (error) {
      showToast('Import request failed', 'error');
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const handleRevokeAuth = async (service: 'audible' | 'kindle') => {
    try {
      const response = await fetch(`/api/amazon/${service}/auth`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        showToast(`${service.charAt(0).toUpperCase() + service.slice(1)} authentication revoked`, 'success');
        await loadAuthStatus();
      } else {
        showToast(`Failed to revoke ${service} authentication`, 'error');
      }
    } catch (error) {
      showToast('Request failed', 'error');
      console.error(error);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-booktarr-accent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-booktarr-text mb-2">Amazon Integration</h1>
        <p className="text-booktarr-textSecondary">Sync your Audible and Kindle libraries with Booktarr</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Audible Section */}
        <div className="booktarr-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-booktarr-text">Audible</h2>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              authStatus?.audible_authenticated 
                ? 'bg-booktarr-success bg-opacity-20 text-booktarr-success' 
                : 'bg-booktarr-surface2 text-booktarr-textSecondary'
            }`}>
              {authStatus?.audible_authenticated ? 'Connected' : 'Not Connected'}
            </div>
          </div>

          {authStatus?.audible_authenticated ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-booktarr-textSecondary">Last sync: {
                  authStatus.audible_last_sync 
                    ? new Date(authStatus.audible_last_sync).toLocaleString()
                    : 'Never'
                }</p>
                <p className="text-sm text-booktarr-textSecondary">Status: {authStatus.audible_sync_status || 'Unknown'}</p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleAudibleSync}
                  disabled={syncing}
                  className="booktarr-btn booktarr-btn-primary flex-1"
                >
                  {syncing ? 'Syncing...' : 'Sync Library'}
                </button>
                <button
                  onClick={() => handleRevokeAuth('audible')}
                  className="booktarr-btn booktarr-btn-danger"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!showAudibleAuth ? (
                <button
                  onClick={() => setShowAudibleAuth(true)}
                  className="booktarr-btn booktarr-btn-primary w-full"
                >
                  Connect Audible Account
                </button>
              ) : (
                <form onSubmit={handleAudibleAuth} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-booktarr-text mb-1">
                      Username/Email
                    </label>
                    <input
                      type="text"
                      value={audibleCredentials.username}
                      onChange={(e) => setAudibleCredentials({...audibleCredentials, username: e.target.value})}
                      className="booktarr-input"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-booktarr-text mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={audibleCredentials.password}
                      onChange={(e) => setAudibleCredentials({...audibleCredentials, password: e.target.value})}
                      className="booktarr-input"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-booktarr-text mb-1">
                      Marketplace
                    </label>
                    <select
                      value={audibleCredentials.marketplace}
                      onChange={(e) => setAudibleCredentials({...audibleCredentials, marketplace: e.target.value})}
                      className="booktarr-select"
                    >
                      <option value="us">United States</option>
                      <option value="uk">United Kingdom</option>
                      <option value="de">Germany</option>
                      <option value="fr">France</option>
                      <option value="ca">Canada</option>
                      <option value="au">Australia</option>
                    </select>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={syncing}
                      className="booktarr-btn booktarr-btn-primary flex-1"
                    >
                      {syncing ? 'Authenticating...' : 'Authenticate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAudibleAuth(false)}
                      className="booktarr-btn booktarr-btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Kindle Section */}
        <div className="booktarr-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-booktarr-text">Kindle</h2>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              authStatus?.kindle_authenticated 
                ? 'bg-booktarr-success bg-opacity-20 text-booktarr-success' 
                : 'bg-booktarr-surface2 text-booktarr-textSecondary'
            }`}>
              {authStatus?.kindle_authenticated ? 'Connected' : 'Not Connected'}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-booktarr-text mb-2">
                Import Method
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="csv"
                    checked={kindleImportType === 'csv'}
                    onChange={(e) => setKindleImportType(e.target.value as 'csv')}
                    className="mr-2"
                  />
                  CSV File
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="json"
                    checked={kindleImportType === 'json'}
                    onChange={(e) => setKindleImportType(e.target.value as 'json')}
                    className="mr-2"
                  />
                  JSON File
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="device"
                    checked={kindleImportType === 'device'}
                    onChange={(e) => setKindleImportType(e.target.value as 'device')}
                    className="mr-2"
                  />
                  Device Scan
                </label>
              </div>
            </div>

            <form onSubmit={handleKindleImport} className="space-y-4">
              {kindleImportType === 'device' ? (
                <div>
                  <label className="block text-sm font-medium text-booktarr-text mb-1">
                    Kindle Device Path
                  </label>
                  <input
                    type="text"
                    value={kindleDevicePath}
                    onChange={(e) => setKindleDevicePath(e.target.value)}
                    className="booktarr-input"
                    placeholder="/media/kindle"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-booktarr-text mb-1">
                    Select {kindleImportType.toUpperCase()} File
                  </label>
                  <input
                    type="file"
                    accept={kindleImportType === 'csv' ? '.csv' : '.json'}
                    onChange={(e) => setKindleFile(e.target.files?.[0] || null)}
                    className="booktarr-input"
                    required
                  />
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={syncing}
                  className="booktarr-btn booktarr-btn-primary flex-1"
                >
                  {syncing ? 'Importing...' : 'Import Kindle Library'}
                </button>
                {authStatus?.kindle_authenticated && (
                  <button
                    type="button"
                    onClick={() => handleRevokeAuth('kindle')}
                    className="booktarr-btn booktarr-btn-danger"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Sync Jobs History */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-xl font-semibold text-booktarr-text">Sync History</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-booktarr-surface2">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-booktarr-textMuted uppercase tracking-wider">
                  Service
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-booktarr-textMuted uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-booktarr-textMuted uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-booktarr-textMuted uppercase tracking-wider">
                  Books
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-booktarr-textMuted uppercase tracking-wider">
                  Duration
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-booktarr-textMuted uppercase tracking-wider">
                  Started
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-booktarr-border">
              {syncJobs.map((job) => (
                <tr key={job.id} className="hover:bg-booktarr-hover">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`h-3 w-3 rounded-full mr-3 ${
                        job.service === 'audible' ? 'bg-booktarr-accent' : 'bg-booktarr-info'
                      }`}></div>
                      <span className="capitalize">{job.service}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-booktarr-text">
                    {job.job_type.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      job.status === 'completed' ? 'bg-booktarr-success bg-opacity-20 text-booktarr-success' :
                      job.status === 'failed' ? 'bg-booktarr-error bg-opacity-20 text-booktarr-error' :
                      job.status === 'running' ? 'bg-booktarr-info bg-opacity-20 text-booktarr-info' :
                      'bg-booktarr-warning bg-opacity-20 text-booktarr-warning'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-booktarr-text">
                    {job.books_found ? (
                      <div className="text-sm">
                        <div>Found: {job.books_found}</div>
                        <div className="text-booktarr-success">Added: {job.books_added || 0}</div>
                        {job.books_failed ? (
                          <div className="text-booktarr-error">Failed: {job.books_failed}</div>
                        ) : null}
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-booktarr-text">
                    {formatDuration(job.duration_seconds)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-booktarr-text">
                    {new Date(job.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {syncJobs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-booktarr-textMuted">No sync jobs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AmazonSyncPage;