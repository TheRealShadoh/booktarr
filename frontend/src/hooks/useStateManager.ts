/**
 * Combined state management hook that integrates all state management features
 * Provides a single interface for all state operations with offline support
 */
import { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useOptimisticUpdates } from './useOptimisticUpdates';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { clientCache } from '../services/cache';
import { offlineSync } from '../services/offlineSync';
import { offlineQueue } from '../services/offlineQueue';
import { Book } from '../types';

export const useStateManager = () => {
  const appContext = useAppContext();
  const optimisticUpdates = useOptimisticUpdates();
  const keyboardShortcuts = useKeyboardShortcuts();
  
  // Offline state
  const [offlineInfo, setOfflineInfo] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);

  // Enhanced book operations with caching, optimistic updates, and offline support
  const addBookWithOptimizations = useCallback(async (book: Book, source?: string) => {
    try {
      // Cache the book data
      await clientCache.setBook(book.isbn, book);
      
      // Queue for offline if needed, otherwise execute optimistically
      if (!navigator.onLine) {
        await offlineSync.queueBookOperation('add', book);
        // Still do optimistic update for immediate UI feedback
        appContext.addBook(book);
        appContext.showToast('Book queued for addition when online', 'info');
        return { book, success: true };
      }
      
      // Perform optimistic update when online
      const result = await optimisticUpdates.optimisticAddBook(book, source);
      
      // Update cache with server response if different
      if (result.book) {
        await clientCache.setBook(book.isbn, result.book);
      }
      
      return result;
    } catch (error) {
      // If online operation fails, queue for offline retry
      if (navigator.onLine) {
        try {
          await offlineSync.queueBookOperation('add', book);
          appContext.showToast('Book queued for retry when connection is stable', 'warning');
        } catch (queueError) {
          await clientCache.deleteBook(book.isbn);
          throw error;
        }
      } else {
        await clientCache.deleteBook(book.isbn);
      }
      throw error;
    }
  }, [optimisticUpdates, appContext]);

  const removeBookWithOptimizations = useCallback(async (isbn: string, title: string) => {
    try {
      // Queue for offline if needed
      if (!navigator.onLine) {
        await offlineSync.queueBookOperation('remove', { isbn });
        // Still do optimistic update for immediate UI feedback
        appContext.removeBook(isbn);
        appContext.showToast('Book removal queued for when online', 'info');
        return;
      }
      
      // Perform optimistic update when online
      await optimisticUpdates.optimisticRemoveBook(isbn, title);
      
      // Remove from cache
      await clientCache.deleteBook(isbn);
    } catch (error) {
      // If online operation fails, queue for offline retry
      if (navigator.onLine) {
        try {
          await offlineSync.queueBookOperation('remove', { isbn });
          appContext.showToast('Book removal queued for retry when connection is stable', 'warning');
        } catch (queueError) {
          // Book will be restored by optimistic update rollback
          throw error;
        }
      }
      throw error;
    }
  }, [optimisticUpdates, appContext]);

  // Enhanced search with caching
  const searchWithCaching = useCallback(async (query: string): Promise<any[]> => {
    if (!query.trim()) {
      return [];
    }

    // Check cache first
    const cachedResults = await clientCache.getSearchResults(query);
    if (cachedResults) {
      return cachedResults;
    }

    try {
      // Perform search
      const response = await fetch(`/api/search/books?query=${encodeURIComponent(query)}&max_results=20`);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache results
      await clientCache.setSearchResults(query, data.results);
      
      return data.results;
    } catch (error) {
      appContext.showToast('Search failed', 'error');
      throw error;
    }
  }, [appContext]);

  // Enhanced settings update with optimistic updates
  const updateSettingsWithOptimizations = useCallback(async (settings: any) => {
    return optimisticUpdates.optimisticUpdateSettings(settings);
  }, [optimisticUpdates]);

  // Cache management
  const getCacheInfo = useCallback(async () => {
    return clientCache.getCacheInfo();
  }, []);

  const clearCache = useCallback(async (type?: string) => {
    if (type) {
      await clientCache.clearPrefix(type);
    } else {
      await clientCache.clearAll();
    }
    appContext.showToast('Cache cleared successfully', 'success');
  }, [appContext]);

  // Batch operations for better performance
  const batchAddBooks = useCallback(async (books: Book[]) => {
    const results = [];
    
    for (const book of books) {
      try {
        const result = await addBookWithOptimizations(book);
        results.push({ success: true, book, result });
      } catch (error) {
        results.push({ success: false, book, error });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (successCount > 0) {
      appContext.showToast(`Added ${successCount} books successfully`, 'success');
    }
    if (failCount > 0) {
      appContext.showToast(`Failed to add ${failCount} books`, 'error');
    }
    
    return results;
  }, [addBookWithOptimizations, appContext]);

  // Preload commonly used data
  const preloadData = useCallback(async () => {
    try {
      // Preload books data
      await appContext.loadBooks();
      
      // Preload settings
      await appContext.loadSettings();
      
      // Preload cache info
      await getCacheInfo();
      
      appContext.showToast('Data preloaded successfully', 'success');
    } catch (error) {
      console.error('Failed to preload data:', error);
    }
  }, [appContext, getCacheInfo]);

  // Sync state with server
  const syncWithServer = useCallback(async () => {
    try {
      appContext.setLoading(true);
      
      // Reload books from server
      await appContext.loadBooks();
      
      // Reload settings from server
      await appContext.loadSettings();
      
      // Clear cache to ensure fresh data
      await clientCache.clearAll();
      
      appContext.showToast('Synced with server successfully', 'success');
    } catch (error) {
      appContext.showToast('Failed to sync with server', 'error');
    } finally {
      appContext.setLoading(false);
    }
  }, [appContext]);

  // Export data for backup
  const exportData = useCallback(async () => {
    try {
      const data = {
        books: appContext.state.books,
        settings: appContext.state.settings,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `booktarr-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      appContext.showToast('Data exported successfully', 'success');
    } catch (error) {
      appContext.showToast('Failed to export data', 'error');
    }
  }, [appContext]);

  // Performance monitoring
  const getPerformanceMetrics = useCallback(() => {
    const cacheStats = clientCache.getStats();
    const pendingUpdates = optimisticUpdates.getPendingUpdates();
    
    return {
      cache: cacheStats,
      pendingUpdates: pendingUpdates.length,
      historySize: appContext.state.history.length,
      memoryUsage: (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null
    };
  }, [optimisticUpdates, appContext]);

  // Cleanup function for old data
  const cleanup = useCallback(async () => {
    // Clean up old cache entries
    await clientCache.cleanup();
    
    // Clean up old optimistic updates
    optimisticUpdates.cleanupOldUpdates();
    
    // Limit history size
    if (appContext.state.history.length > 50) {
      appContext.dispatch({ type: 'RESET_HISTORY' });
    }
  }, [optimisticUpdates, appContext]);

  // Offline functionality
  const startOfflineSync = useCallback(async () => {
    try {
      const result = await offlineSync.startSync();
      appContext.showToast(`Sync completed: ${result.syncedItems} items synced`, 'success');
      return result;
    } catch (error) {
      appContext.showToast('Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
      throw error;
    }
  }, [appContext]);

  const getOfflineInfo = useCallback(async () => {
    return await offlineSync.getOfflineModeInfo();
  }, []);

  const getQueueStats = useCallback(async () => {
    return await offlineQueue.getQueueStats();
  }, []);

  // Auto-cleanup on mount and periodically (disabled in test environments)
  useEffect(() => {
    cleanup();

    // Only enable periodic cleanup if not in test environment
    const isTestEnvironment = navigator.webdriver || (window as any).Cypress;

    if (!isTestEnvironment) {
      const interval = setInterval(cleanup, 5 * 60 * 1000); // Every 5 minutes
      return () => clearInterval(interval);
    }
  }, [cleanup]);

  // Setup offline sync listeners
  useEffect(() => {
    const handleSyncStatus = (status: any) => setSyncStatus(status);
    
    offlineSync.addSyncListener(handleSyncStatus);
    
    // Update offline info periodically
    const updateOfflineInfo = async () => {
      try {
        const info = await getOfflineInfo();
        setOfflineInfo(info);
      } catch (error) {
        console.error('Failed to update offline info:', error);
      }
    };
    
    updateOfflineInfo();

    // Only enable periodic updates if not in test environment
    const isTestEnvironment = navigator.webdriver || (window as any).Cypress;

    if (!isTestEnvironment) {
      const infoInterval = setInterval(updateOfflineInfo, 30000); // Every 30 seconds

      return () => {
        offlineSync.removeSyncListener(handleSyncStatus);
        clearInterval(infoInterval);
      };
    } else {
      return () => {
        offlineSync.removeSyncListener(handleSyncStatus);
      };
    }
  }, [getOfflineInfo]);

  return {
    // Core app context
    ...appContext,
    
    // Enhanced operations
    addBookWithOptimizations,
    removeBookWithOptimizations,
    searchWithCaching,
    updateSettingsWithOptimizations,
    
    // Batch operations
    batchAddBooks,
    
    // Cache management
    getCacheInfo,
    clearCache,
    
    // Data operations
    preloadData,
    syncWithServer,
    exportData,
    
    // Monitoring
    getPerformanceMetrics,
    
    // Optimistic updates
    ...optimisticUpdates,
    
    // Keyboard shortcuts
    ...keyboardShortcuts,
    
    // Cleanup
    cleanup,
    
    // Offline functionality
    startOfflineSync,
    getOfflineInfo,
    getQueueStats,
    offlineInfo,
    syncStatus,
  };
};

export default useStateManager;