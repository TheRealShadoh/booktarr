/**
 * Service Worker management hook
 * Handles registration, updates, and messaging
 */
import { useEffect, useCallback, useState } from 'react';
import { useAppContext } from '../context/AppContext';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isWaiting: boolean;
  isUpdateAvailable: boolean;
  isOffline: boolean;
  isInstallPromptAvailable: boolean;
  isInstalled: boolean;
}

export const useServiceWorker = () => {
  const { showToast } = useAppContext();
  
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isWaiting: false,
    isUpdateAvailable: false,
    isOffline: !navigator.onLine,
    isInstallPromptAvailable: false,
    isInstalled: false,
  });

  // Register service worker
  const register = useCallback(async () => {
    if (!state.isSupported) {
      console.log('Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      setState(prev => ({ ...prev, isRegistered: true }));
      
      // Check for waiting service worker
      if (registration.waiting) {
        setState(prev => ({ ...prev, isWaiting: true, isUpdateAvailable: true }));
      }

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState(prev => ({ ...prev, isUpdateAvailable: true, isWaiting: true }));
              showToast('New version available! Refresh to update.', 'info');
            }
          });
        }
      });

      console.log('Service Worker registered:', registration);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      showToast('Failed to register service worker', 'error');
    }
  }, [state.isSupported, showToast]);

  // Update service worker
  const update = useCallback(() => {
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({
      type: 'SKIP_WAITING'
    });
    
    // Reload the page to get the new service worker
    window.location.reload();
  }, []);

  // Show install prompt
  const showInstallPrompt = useCallback(() => {
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_INSTALL_PROMPT'
    });
  }, []);

  // Handle service worker messages
  useEffect(() => {
    if (!state.isSupported) return;

    const handleMessage = (event: MessageEvent) => {
      const { type } = event.data;
      
      switch (type) {
        case 'INSTALL_PROMPT_AVAILABLE':
          setState(prev => ({ ...prev, isInstallPromptAvailable: true }));
          showToast('Booktarr can be installed on your device!', 'info');
          break;
          
        case 'APP_INSTALLED':
          setState(prev => ({ ...prev, isInstalled: true, isInstallPromptAvailable: false }));
          showToast('Booktarr has been installed successfully!', 'success');
          break;
          
        case 'NETWORK_STATUS_CHANGE':
          setState(prev => ({ ...prev, isOffline: !event.data.online }));
          showToast(
            event.data.online ? 'Back online!' : 'You are offline', 
            event.data.online ? 'success' : 'warning'
          );
          break;
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [state.isSupported, showToast]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOffline: false }));
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOffline: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-register on mount
  useEffect(() => {
    if (state.isSupported && process.env.NODE_ENV === 'production') {
      register();
    }
  }, [state.isSupported, register]);

  // Register background sync
  const registerBackgroundSync = useCallback(async (tag: string) => {
    if (!state.isSupported || !('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      // Check if background sync is supported
      if ('sync' in registration) {
        await (registration as any).sync.register(tag);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Background sync registration failed:', error);
      return false;
    }
  }, [state.isSupported]);

  // Cache management
  const clearCaches = useCallback(async () => {
    if (!state.isSupported) return;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      showToast('Cache cleared successfully', 'success');
    } catch (error) {
      console.error('Cache clearing failed:', error);
      showToast('Failed to clear cache', 'error');
    }
  }, [state.isSupported, showToast]);

  // Get cache size
  const getCacheSize = useCallback(async () => {
    if (!state.isSupported) return 0;

    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Cache size calculation failed:', error);
      return 0;
    }
  }, [state.isSupported]);

  return {
    ...state,
    register,
    update,
    showInstallPrompt,
    registerBackgroundSync,
    clearCaches,
    getCacheSize,
  };
};

export default useServiceWorker;