/**
 * PWA Update Notification Component
 * Notifies users when a new version is available
 */
import React, { useState, useEffect } from 'react';
import { useServiceWorker } from '../hooks/useServiceWorker';

const PWAUpdateNotification: React.FC = () => {
  const { isUpdateAvailable, update } = useServiceWorker();
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (isUpdateAvailable) {
      setShowNotification(true);
    }
  }, [isUpdateAvailable]);

  const handleUpdate = () => {
    update();
    setShowNotification(false);
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  if (!showNotification) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm">
      <div className="bg-booktarr-surface border border-booktarr-border rounded-lg shadow-lg p-4">
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-booktarr-info rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <h3 className="text-booktarr-text font-semibold text-sm mb-1">
              Update Available
            </h3>
            <p className="text-booktarr-textSecondary text-xs mb-3">
              A new version of Booktarr is available. Update now to get the latest features and improvements.
            </p>
            
            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={handleUpdate}
                className="bg-booktarr-info text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-booktarr-info-hover transition-colors"
              >
                Update Now
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-booktarr-textSecondary text-xs font-medium hover:text-booktarr-text transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          
          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-booktarr-textMuted hover:text-booktarr-text transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdateNotification;