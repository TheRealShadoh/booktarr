/**
 * Enhanced offline capability indicator component
 * Shows network status, offline functionality, and sync status
 */
import React, { useState, useEffect } from 'react';
import { useServiceWorker } from '../hooks/useServiceWorker';
import { isTouchDevice } from '../hooks/useSwipeGestures';

interface OfflineIndicatorProps {
  className?: string;
  showOfflineFeatures?: boolean;
  position?: 'top-banner' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = "",
  showOfflineFeatures = true,
  position = 'top-banner'
}) => {
  const { isOffline } = useServiceWorker();
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine
  });
  const [showDetails, setShowDetails] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<number>(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Position classes
  const positionClasses = {
    'top-banner': 'top-0 left-0 right-0',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  // Monitor network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      const status: NetworkStatus = {
        isOnline: navigator.onLine
      };

      // Add connection quality info if available
      if ('connection' in navigator && (navigator as any).connection) {
        const connection = (navigator as any).connection;
        status.effectiveType = connection.effectiveType;
        status.downlink = connection.downlink;
        status.rtt = connection.rtt;
      }

      setNetworkStatus(status);

      // Update last sync time when coming back online
      if (status.isOnline && !networkStatus.isOnline) {
        setLastSync(new Date());
      }
    };

    // Initial check
    updateNetworkStatus();

    // Listen for network changes
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Listen for connection changes if supported
    if ('connection' in navigator && (navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      
      if ('connection' in navigator && (navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, [networkStatus.isOnline]);

  // Simulate offline queue count (would come from actual offline storage)
  useEffect(() => {
    const checkOfflineQueue = () => {
      // In real implementation, this would check IndexedDB or localStorage
      // for pending actions that need to be synced
      const stored = localStorage.getItem('offline_actions');
      if (stored) {
        try {
          const actions = JSON.parse(stored);
          setOfflineQueue(Array.isArray(actions) ? actions.length : 0);
        } catch {
          setOfflineQueue(0);
        }
      }
    };

    checkOfflineQueue();

    // Only enable periodic checks if not in a test environment
    const isTestEnvironment = navigator.webdriver || (window as any).Cypress;

    if (!isTestEnvironment) {
      // Check periodically
      const interval = setInterval(checkOfflineQueue, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  // Get connection quality color
  const getConnectionQuality = () => {
    if (!networkStatus.isOnline || isOffline) return { color: 'text-red-500', label: 'Offline' };
    
    if (networkStatus.effectiveType) {
      switch (networkStatus.effectiveType) {
        case 'slow-2g':
        case '2g':
          return { color: 'text-red-400', label: 'Slow' };
        case '3g':
          return { color: 'text-yellow-400', label: 'Fair' };
        case '4g':
          return { color: 'text-green-400', label: 'Good' };
        default:
          return { color: 'text-green-500', label: 'Excellent' };
      }
    }
    
    return { color: 'text-green-500', label: 'Online' };
  };

  const connectionQuality = getConnectionQuality();
  const showOfflineIndicator = isOffline || !networkStatus.isOnline;

  // Banner style (original behavior)
  if (position === 'top-banner' && showOfflineIndicator) {
    return (
      <div className={`fixed top-0 left-0 right-0 z-50 bg-booktarr-warning text-booktarr-bg ${className}`}>
        <div className="flex items-center justify-center py-2 px-4">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">
              You're offline - Some features may be limited
            </span>
            {offlineQueue > 0 && (
              <span className="text-xs opacity-75">
                ({offlineQueue} actions pending)
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Corner indicator style (mobile-enhanced)
  if (position !== 'top-banner' && (showOfflineIndicator || showOfflineFeatures)) {
    // Don't show corner indicator on desktop unless explicitly requested
    if (!isTouchDevice() && !showOfflineFeatures && !showOfflineIndicator) {
      return null;
    }

    return (
      <div className={`fixed z-50 ${positionClasses[position]} ${className}`}>
        {/* Main indicator */}
        <div
          className={`
            flex items-center space-x-2 px-3 py-2 rounded-full 
            bg-booktarr-surface border border-booktarr-border shadow-lg
            transition-all duration-300 ease-in-out cursor-pointer touch-target
            ${showDetails ? 'rounded-2xl' : ''}
            ${showOfflineIndicator ? 'bg-red-50 border-red-200 dark:bg-red-900 dark:border-red-700' : ''}
          `}
          onClick={() => setShowDetails(!showDetails)}
        >
          {/* Connection status icon */}
          <div className={`w-2 h-2 rounded-full ${connectionQuality.color.replace('text-', 'bg-')}`}>
            {showOfflineIndicator && (
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            )}
          </div>

          {/* Status text */}
          <span className={`text-sm font-medium ${connectionQuality.color}`}>
            {connectionQuality.label}
          </span>

          {/* Offline queue indicator */}
          {showOfflineIndicator && offlineQueue > 0 && (
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-booktarr-textMuted rounded-full"></div>
              <span className="text-xs text-booktarr-textMuted">
                {offlineQueue}
              </span>
            </div>
          )}

          {/* Expand arrow */}
          <svg 
            className={`w-4 h-4 text-booktarr-textMuted transition-transform duration-200 ${
              showDetails ? 'rotate-180' : ''
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Expanded details */}
        {showDetails && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-booktarr-surface border border-booktarr-border rounded-xl shadow-lg p-4 min-w-64">
            <div className="space-y-3">
              {/* Connection details */}
              <div>
                <h4 className="text-sm font-semibold text-booktarr-text mb-2">Network Status</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-booktarr-textSecondary">Status:</span>
                    <span className={connectionQuality.color}>{connectionQuality.label}</span>
                  </div>
                  
                  {networkStatus.isOnline && networkStatus.effectiveType && (
                    <div className="flex justify-between">
                      <span className="text-booktarr-textSecondary">Type:</span>
                      <span className="text-booktarr-text">{networkStatus.effectiveType.toUpperCase()}</span>
                    </div>
                  )}
                  
                  {networkStatus.isOnline && networkStatus.downlink && (
                    <div className="flex justify-between">
                      <span className="text-booktarr-textSecondary">Speed:</span>
                      <span className="text-booktarr-text">{networkStatus.downlink} Mbps</span>
                    </div>
                  )}
                  
                  {networkStatus.isOnline && networkStatus.rtt && (
                    <div className="flex justify-between">
                      <span className="text-booktarr-textSecondary">Latency:</span>
                      <span className="text-booktarr-text">{networkStatus.rtt}ms</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Offline features */}
              {showOfflineIndicator && (
                <div>
                  <h4 className="text-sm font-semibold text-booktarr-text mb-2">Offline Mode</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs text-booktarr-textSecondary">Browse your library</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs text-booktarr-textSecondary">Update reading progress</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs text-booktarr-textSecondary">
                        {offlineQueue} actions waiting to sync
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Last sync info */}
              {lastSync && (
                <div>
                  <h4 className="text-sm font-semibold text-booktarr-text mb-1">Last Sync</h4>
                  <span className="text-xs text-booktarr-textSecondary">
                    {lastSync.toLocaleTimeString()}
                  </span>
                </div>
              )}

              {/* Manual sync button */}
              {networkStatus.isOnline && !isOffline && offlineQueue > 0 && (
                <button
                  onClick={() => {
                    // In real implementation, trigger sync here
                    setOfflineQueue(0);
                    setLastSync(new Date());
                    setShowDetails(false);
                  }}
                  className="w-full py-2 px-3 bg-booktarr-accent text-white text-sm font-medium rounded-lg hover:bg-booktarr-accent-dark transition-colors"
                >
                  Sync Now ({offlineQueue})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default OfflineIndicator;