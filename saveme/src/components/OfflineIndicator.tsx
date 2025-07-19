/**
 * Offline Indicator Component
 * Shows when the app is offline and provides offline status
 */
import React from 'react';
import { useServiceWorker } from '../hooks/useServiceWorker';

const OfflineIndicator: React.FC = () => {
  const { isOffline } = useServiceWorker();

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-booktarr-warning text-booktarr-bg">
      <div className="flex items-center justify-center py-2 px-4">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">
            You're offline - Some features may be limited
          </span>
        </div>
      </div>
    </div>
  );
};

export default OfflineIndicator;