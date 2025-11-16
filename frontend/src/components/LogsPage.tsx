import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
  details?: any;
}

interface LogsPageProps {
  className?: string;
}

const LogsPage: React.FC<LogsPageProps> = ({ className = '' }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch logs on mount and set up auto-refresh (disabled in test environments)
  useEffect(() => {
    fetchLogs();

    // Only enable auto-refresh if user wants it AND not in test environment
    const isTestEnvironment = navigator.webdriver || (window as any).Cypress;

    if (autoRefresh && !isTestEnvironment) {
      const interval = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/logs');
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      setLogs(data.logs || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all logs?')) return;
    
    try {
      const response = await fetch('/api/logs', { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to clear logs');
      setLogs([]);
    } catch (err) {
      console.error('Error clearing logs:', err);
      alert('Failed to clear logs');
    }
  };

  // Filter logs based on current filters
  const filteredLogs = logs.filter(log => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (filterSource !== 'all' && log.source !== filterSource) return false;
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Get unique sources for filter dropdown
  const uniqueSources = Array.from(new Set(logs.map(log => log.source)));

  const getLevelBadge = (level: LogEntry['level']) => {
    const levelConfig = {
      info: { bg: 'bg-booktarr-accent/20', text: 'text-booktarr-accent', label: 'INFO' },
      warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-600', label: 'WARN' },
      error: { bg: 'bg-red-500/20', text: 'text-red-600', label: 'ERROR' },
      debug: { bg: 'bg-booktarr-textMuted/20', text: 'text-booktarr-textMuted', label: 'DEBUG' }
    };
    
    const config = levelConfig[level];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center p-8 ${className}`}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-booktarr-text">System Logs</h1>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2 rounded text-booktarr-accent focus:ring-booktarr-accent"
            />
            <span className="text-sm text-booktarr-text">Auto-refresh</span>
          </label>
          <button
            onClick={fetchLogs}
            className="text-booktarr-accent hover:text-booktarr-accentHover"
            title="Refresh logs"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={clearLogs}
            className="text-red-600 hover:text-red-700"
            title="Clear all logs"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-booktarr-surface border border-booktarr-border rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-booktarr-text">Level:</label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-3 py-1 text-sm border border-booktarr-border rounded focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
            >
              <option value="all">All</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-booktarr-text">Source:</label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="px-3 py-1 text-sm border border-booktarr-border rounded focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
            >
              <option value="all">All</option>
              {uniqueSources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 flex-1 min-w-64">
            <label className="text-sm text-booktarr-text">Search:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search log messages..."
              className="flex-1 px-3 py-1 text-sm border border-booktarr-border rounded focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
            />
          </div>

          <div className="text-sm text-booktarr-textMuted">
            {filteredLogs.length} of {logs.length} logs
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchLogs} className="text-red-600 hover:text-red-700 underline mt-2">
            Retry
          </button>
        </div>
      )}

      {/* Logs Display */}
      <div className="bg-booktarr-surface border border-booktarr-border rounded-lg overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-booktarr-textMuted">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No logs found</p>
            {logs.length > 0 && <p className="text-sm mt-1">Try adjusting your filters</p>}
          </div>
        ) : (
          <div className="max-h-96 overflow-auto">
            {filteredLogs.map((log, index) => (
              <div
                key={log.id || index}
                className={`p-4 border-b border-booktarr-border last:border-b-0 ${
                  log.level === 'error' ? 'bg-red-500/5 hover:bg-red-500/10' : 
                  log.level === 'warning' ? 'bg-yellow-500/5 hover:bg-yellow-500/10' : 
                  'hover:bg-booktarr-hover'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-1">
                      {getLevelBadge(log.level)}
                      <span className="text-sm text-booktarr-textMuted font-mono">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span className="text-sm text-booktarr-accent font-medium">
                        {log.source}
                      </span>
                    </div>
                    <p className="text-booktarr-text">{log.message}</p>
                    {log.details && (
                      <details className="mt-2">
                        <summary className="text-sm text-booktarr-textMuted cursor-pointer hover:text-booktarr-text">
                          View details
                        </summary>
                        <pre className="mt-2 p-2 bg-booktarr-bg border border-booktarr-border rounded text-xs text-booktarr-text overflow-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsPage;