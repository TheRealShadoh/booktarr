/**
 * PWA Installation Prompt Component
 * Shows install prompt and handles PWA installation
 */
import React, { useState, useEffect } from 'react';
import { useServiceWorker } from '../hooks/useServiceWorker';

interface PWAInstallPromptProps {
  onClose?: () => void;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onClose }) => {
  const { isInstallPromptAvailable, isInstalled, showInstallPrompt } = useServiceWorker();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const hasBeenDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
    setDismissed(hasBeenDismissed);
    
    // Show prompt if available and not dismissed
    if (isInstallPromptAvailable && !hasBeenDismissed && !isInstalled) {
      // Delay showing the prompt to not interrupt user experience
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 30000); // Show after 30 seconds
      
      return () => clearTimeout(timer);
    }
  }, [isInstallPromptAvailable, isInstalled]);

  const handleInstall = () => {
    showInstallPrompt();
    handleClose();
  };

  const handleClose = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
    onClose?.();
  };

  const handleLater = () => {
    setShowPrompt(false);
    // Don't permanently dismiss, just hide for this session
  };

  if (!showPrompt || dismissed || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-booktarr-surface border border-booktarr-border rounded-lg shadow-lg p-4">
        <div className="flex items-start space-x-3">
          {/* App Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-booktarr-accent rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <h3 className="text-booktarr-text font-semibold text-sm mb-1">
              Install Booktarr
            </h3>
            <p className="text-booktarr-textSecondary text-xs mb-3">
              Install Booktarr on your device for quick access and offline functionality.
            </p>
            
            {/* Benefits */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center space-x-2 text-xs text-booktarr-textSecondary">
                <svg className="w-3 h-3 text-booktarr-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Works offline</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-booktarr-textSecondary">
                <svg className="w-3 h-3 text-booktarr-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Quick access from home screen</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-booktarr-textSecondary">
                <svg className="w-3 h-3 text-booktarr-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>No browser address bar</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={handleInstall}
                className="flex-1 bg-booktarr-accent text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-booktarr-accent-hover transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleLater}
                className="px-3 py-2 text-booktarr-textSecondary text-xs font-medium hover:text-booktarr-text transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          
          {/* Close Button */}
          <button
            onClick={handleClose}
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

export default PWAInstallPrompt;