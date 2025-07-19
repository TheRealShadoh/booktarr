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
  const [audible2FA, setAudible2FA] = useState({
    required: false,
    sessionId: '',
    cvfCode: ''
  });
  
  const [showKindleAuth, setShowKindleAuth] = useState(false);
  const [kindleCredentials, setKindleCredentials] = useState({
    username: '',
    password: '',
    marketplace: 'us'
  });
  const [kindle2FA, setKindle2FA] = useState({
    required: false,
    sessionId: '',
    verificationCode: ''
  });
  
  // Kindle import states
  const [kindleImportType, setKindleImportType] = useState<'auth' | 'csv' | 'json' | 'device'>('auth');
  const [kindleDevicePath, setKindleDevicePath] = useState('/media/kindle');
  const [kindleFile, setKindleFile] = useState<File | null>(null);

  useEffect(() => {
    loadAuthStatus();
    loadSyncJobs();
  }, []);

  const loadAuthStatus = async () => {
    console.log('🔍 Loading Amazon auth status...');
    try {
      const response = await fetch('/api/amazon/status');
      console.log('📡 Auth status response:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Auth status data:', data);
        setAuthStatus(data);
      } else {
        console.error('❌ Auth status request failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error response body:', errorText);
      }
    } catch (error) {
      console.error('❌ Failed to load auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncJobs = async () => {
    console.log('🔍 Loading sync jobs...');
    try {
      const response = await fetch('/api/amazon/sync-jobs?limit=20');
      console.log('📡 Sync jobs response:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Sync jobs data:', data);
        setSyncJobs(data);
      } else {
        console.error('❌ Sync jobs request failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error response body:', errorText);
      }
    } catch (error) {
      console.error('❌ Failed to load sync jobs:', error);
    }
  };

  const handleAudibleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    
    console.log('🎵 Starting Audible authentication...');
    console.log('📝 Credentials:', { username: audibleCredentials.username, marketplace: audibleCredentials.marketplace, password: '[HIDDEN]' });
    
    try {
      const requestBody = {
        ...audibleCredentials,
        ...(audible2FA.required && {
          cvf_code: audible2FA.cvfCode,
          auth_session_id: audible2FA.sessionId
        })
      };
      
      console.log('📝 Request body:', { ...requestBody, password: '[HIDDEN]', cvf_code: audible2FA.cvfCode ? '[PROVIDED]' : undefined });
      
      const response = await fetch('/api/amazon/audible/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📡 Audible auth response:', response.status, response.statusText);
      const data = await response.json();
      console.log('📊 Audible auth data:', data);
      
      if (data.success) {
        console.log('✅ Audible authentication successful!');
        showToast(`Audible authentication successful! Welcome, ${data.customer_name || 'User'}`, 'success');
        setShowAudibleAuth(false);
        setAudibleCredentials({ username: '', password: '', marketplace: 'us' });
        setAudible2FA({ required: false, sessionId: '', cvfCode: '' });
        await loadAuthStatus();
      } else if (data.requires_2fa) {
        console.log('🔐 2FA required for Audible authentication');
        setAudible2FA({ 
          required: true, 
          sessionId: data.auth_session_id || '', 
          cvfCode: '' 
        });
        showToast('Please check your email for a verification code', 'info');
      } else {
        console.error('❌ Audible authentication failed:', data.error);
        showToast(data.error || 'Authentication failed', 'error');
      }
    } catch (error) {
      console.error('❌ Audible authentication exception:', error);
      showToast('Authentication request failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleAudibleSync = async () => {
    setSyncing(true);
    
    console.log('🔄 Starting Audible library sync...');
    
    try {
      const response = await fetch('/api/amazon/audible/sync', {
        method: 'POST'
      });
      
      console.log('📡 Audible sync response:', response.status, response.statusText);
      const data = await response.json();
      console.log('📊 Audible sync data:', data);
      
      if (data.success) {
        console.log('✅ Audible sync started successfully, job ID:', data.job_id);
        showToast('Audible library sync started!', 'success');
        await loadSyncJobs();
      } else {
        console.error('❌ Audible sync failed:', data.error);
        showToast(data.error || 'Sync failed to start', 'error');
      }
    } catch (error) {
      console.error('❌ Audible sync exception:', error);
      showToast('Sync request failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleKindleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    
    console.log('📚 Starting Kindle authentication...');
    console.log('📝 Credentials:', { username: kindleCredentials.username, marketplace: kindleCredentials.marketplace, password: '[HIDDEN]' });
    
    try {
      const requestBody = {
        ...kindleCredentials,
        ...(kindle2FA.required && {
          verification_code: kindle2FA.verificationCode,
          auth_session_id: kindle2FA.sessionId
        })
      };
      
      console.log('📝 Request body:', { ...requestBody, password: '[HIDDEN]', verification_code: kindle2FA.verificationCode ? '[PROVIDED]' : undefined });
      
      const response = await fetch('/api/amazon/kindle/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📡 Kindle auth response:', response.status, response.statusText);
      const data = await response.json();
      console.log('📊 Kindle auth data:', data);
      
      if (data.success) {
        console.log('✅ Kindle authentication successful!');
        showToast(`Kindle authentication successful! Welcome, ${data.customer_name || 'User'}`, 'success');
        setShowKindleAuth(false);
        setKindleCredentials({ username: '', password: '', marketplace: 'us' });
        setKindle2FA({ required: false, sessionId: '', verificationCode: '' });
        await loadAuthStatus();
      } else if (data.requires_2fa) {
        console.log('🔐 2FA required for Kindle authentication');
        setKindle2FA({ 
          required: true, 
          sessionId: data.auth_session_id || '', 
          verificationCode: '' 
        });
        showToast('Please check your email/SMS for a verification code', 'info');
      } else {
        console.error('❌ Kindle authentication failed:', data.error);
        showToast(data.error || 'Authentication failed', 'error');
      }
    } catch (error) {
      console.error('❌ Kindle authentication exception:', error);
      showToast('Authentication request failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleKindleSync = async () => {
    setSyncing(true);
    
    console.log('🔄 Starting Kindle library sync...');
    
    try {
      const response = await fetch('/api/amazon/kindle/sync', {
        method: 'POST'
      });
      
      console.log('📡 Kindle sync response:', response.status, response.statusText);
      const data = await response.json();
      console.log('📊 Kindle sync data:', data);
      
      if (data.success) {
        console.log('✅ Kindle sync started successfully, job ID:', data.job_id);
        showToast('Kindle library sync started!', 'success');
        await loadSyncJobs();
      } else {
        console.error('❌ Kindle sync failed:', data.error);
        showToast(data.error || 'Sync failed to start', 'error');
      }
    } catch (error) {
      console.error('❌ Kindle sync exception:', error);
      showToast('Sync request failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleKindleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    
    console.log('📥 Starting Kindle import...', 'Type:', kindleImportType);
    
    try {
      let response;
      
      if (kindleImportType === 'device') {
        console.log('📱 Scanning Kindle device at:', kindleDevicePath);
        response = await fetch('/api/amazon/kindle/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_path: kindleDevicePath })
        });
      } else if (kindleFile) {
        console.log('📄 Uploading Kindle file:', kindleFile.name);
        const formData = new FormData();
        formData.append('file', kindleFile);
        
        const endpoint = kindleImportType === 'csv' ? '/api/amazon/kindle/import/csv' : '/api/amazon/kindle/import/json';
        response = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });
      } else {
        console.error('❌ No file selected for import');
        showToast('Please select a file to import', 'error');
        return;
      }
      
      console.log('📡 Kindle import response:', response.status, response.statusText);
      const data = await response.json();
      console.log('📊 Kindle import data:', data);
      
      if (data.success) {
        console.log('✅ Kindle import started successfully');
        showToast(`Kindle import started! Found ${data.items_found} items`, 'success');
        await loadSyncJobs();
      } else {
        console.error('❌ Kindle import failed:', data.error);
        showToast(data.error || 'Import failed', 'error');
      }
    } catch (error) {
      console.error('❌ Kindle import exception:', error);
      showToast('Import request failed', 'error');
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
                  {!audible2FA.required ? (
                    <>
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
                    </>
                  ) : (
                    <div className="bg-booktarr-surface2 p-4 rounded-lg">
                      <h3 className="text-lg font-medium text-booktarr-text mb-2">Two-Factor Authentication Required</h3>
                      <p className="text-sm text-booktarr-textSecondary mb-4">
                        Please check your email for a verification code and enter it below.
                      </p>
                      <div className="bg-booktarr-info bg-opacity-20 border border-booktarr-info p-3 rounded mb-4">
                        <p className="text-sm text-booktarr-info font-medium">
                          🧪 <strong>Demo Mode:</strong> Use code <strong>DEMO123</strong>, <strong>TEST456</strong>, or <strong>123456</strong> to try the demo with sample books!
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-booktarr-text mb-1">
                          Verification Code
                        </label>
                        <input
                          type="text"
                          value={audible2FA.cvfCode}
                          onChange={(e) => setAudible2FA({...audible2FA, cvfCode: e.target.value})}
                          className="booktarr-input"
                          placeholder="Enter 6-digit code or DEMO123"
                          required
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={syncing || (audible2FA.required && !audible2FA.cvfCode)}
                      className="booktarr-btn booktarr-btn-primary flex-1"
                    >
                      {syncing ? 'Authenticating...' : audible2FA.required ? 'Verify Code' : 'Authenticate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAudibleAuth(false);
                        setAudible2FA({ required: false, sessionId: '', cvfCode: '' });
                      }}
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

          {authStatus?.kindle_authenticated ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-booktarr-textSecondary">Last sync: {
                  authStatus.kindle_last_sync 
                    ? new Date(authStatus.kindle_last_sync).toLocaleString()
                    : 'Never'
                }</p>
                <p className="text-sm text-booktarr-textSecondary">Status: {authStatus.kindle_sync_status || 'Unknown'}</p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleKindleSync}
                  disabled={syncing}
                  className="booktarr-btn booktarr-btn-primary flex-1"
                >
                  {syncing ? 'Syncing...' : 'Sync Library'}
                </button>
                <button
                  onClick={() => handleRevokeAuth('kindle')}
                  className="booktarr-btn booktarr-btn-danger"
                >
                  Disconnect
                </button>
              </div>

              {/* Alternative Import Methods */}
              <div className="border-t border-booktarr-border pt-4">
                <h3 className="text-sm font-medium text-booktarr-text mb-2">Alternative Import Methods</h3>
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

                    <button
                      type="submit"
                      disabled={syncing}
                      className="booktarr-btn booktarr-btn-secondary w-full"
                    >
                      {syncing ? 'Importing...' : 'Import Additional Books'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-booktarr-text mb-2">
                  Connection Method
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="auth"
                      checked={kindleImportType === 'auth'}
                      onChange={(e) => setKindleImportType(e.target.value as 'auth')}
                      className="mr-2"
                    />
                    Amazon Account
                  </label>
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

              {kindleImportType === 'auth' ? (
                !showKindleAuth ? (
                  <button
                    onClick={() => setShowKindleAuth(true)}
                    className="booktarr-btn booktarr-btn-primary w-full"
                  >
                    Connect Kindle Account
                  </button>
                ) : (
                  <form onSubmit={handleKindleAuth} className="space-y-4">
                    {!kindle2FA.required ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-booktarr-text mb-1">
                            Username/Email
                          </label>
                          <input
                            type="text"
                            value={kindleCredentials.username}
                            onChange={(e) => setKindleCredentials({...kindleCredentials, username: e.target.value})}
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
                            value={kindleCredentials.password}
                            onChange={(e) => setKindleCredentials({...kindleCredentials, password: e.target.value})}
                            className="booktarr-input"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-booktarr-text mb-1">
                            Marketplace
                          </label>
                          <select
                            value={kindleCredentials.marketplace}
                            onChange={(e) => setKindleCredentials({...kindleCredentials, marketplace: e.target.value})}
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
                      </>
                    ) : (
                      <div className="bg-booktarr-surface2 p-4 rounded-lg">
                        <h3 className="text-lg font-medium text-booktarr-text mb-2">Two-Factor Authentication Required</h3>
                        <p className="text-sm text-booktarr-textSecondary mb-4">
                          Please check your email or SMS for a verification code and enter it below.
                        </p>
                        <div className="bg-booktarr-info bg-opacity-20 border border-booktarr-info p-3 rounded mb-4">
                          <p className="text-sm text-booktarr-info font-medium">
                            🧪 <strong>Demo Mode:</strong> Use code <strong>DEMO123</strong>, <strong>TEST456</strong>, or <strong>123456</strong> to try the demo with sample books!
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-booktarr-text mb-1">
                            Verification Code
                          </label>
                          <input
                            type="text"
                            value={kindle2FA.verificationCode}
                            onChange={(e) => setKindle2FA({...kindle2FA, verificationCode: e.target.value})}
                            className="booktarr-input"
                            placeholder="Enter verification code or DEMO123"
                            required
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={syncing || (kindle2FA.required && !kindle2FA.verificationCode)}
                        className="booktarr-btn booktarr-btn-primary flex-1"
                      >
                        {syncing ? 'Authenticating...' : kindle2FA.required ? 'Verify Code' : 'Authenticate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowKindleAuth(false);
                          setKindle2FA({ required: false, sessionId: '', verificationCode: '' });
                        }}
                        className="booktarr-btn booktarr-btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )
              ) : (
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

                  <button
                    type="submit"
                    disabled={syncing}
                    className="booktarr-btn booktarr-btn-primary w-full"
                  >
                    {syncing ? 'Importing...' : 'Import Kindle Library'}
                  </button>
                </form>
              )}
            </div>
          )}
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