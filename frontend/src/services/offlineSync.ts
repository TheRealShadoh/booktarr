/**
 * Offline sync service for managing data synchronization
 * Integrates offline queue, conflict resolution, and cache management
 */

import { offlineQueue } from './offlineQueue';
import { conflictResolver } from './conflictResolution';
import { clientCache } from './cache';
import { booktarrAPI } from './api';

interface SyncStatus {
  isRunning: boolean;
  progress: number;
  currentOperation: string;
  totalOperations: number;
  completedOperations: number;
  errors: string[];
  conflicts: any[];
  startedAt: number;
  estimatedCompletion?: number;
}

interface SyncResult {
  success: boolean;
  syncedItems: number;
  conflicts: number;
  errors: string[];
  duration: number;
}

interface OfflineModeInfo {
  isOffline: boolean;
  lastSync: number;
  pendingActions: number;
  dataAge: number;
  estimatedDataFreshness: number;
}

class OfflineSyncService {
  private syncStatus: SyncStatus = {
    isRunning: false,
    progress: 0,
    currentOperation: '',
    totalOperations: 0,
    completedOperations: 0,
    errors: [],
    conflicts: [],
    startedAt: 0,
  };

  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private lastSyncTimestamp = 0;
  private isOnline = navigator.onLine;

  constructor() {
    this.setupNetworkListeners();
    this.loadLastSyncTimestamp();
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleOnlineSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private async loadLastSyncTimestamp(): Promise<void> {
    try {
      const cached = await clientCache.get('last-sync-timestamp', 'general');
      if (cached && typeof cached === 'string') {
        this.lastSyncTimestamp = parseInt(cached);
      }
    } catch (error) {
      console.warn('Failed to load last sync timestamp:', error);
    }
  }

  private async saveLastSyncTimestamp(): Promise<void> {
    try {
      this.lastSyncTimestamp = Date.now();
      await clientCache.set('last-sync-timestamp', this.lastSyncTimestamp.toString(), 'general');
    } catch (error) {
      console.warn('Failed to save last sync timestamp:', error);
    }
  }

  // Start a full sync operation
  async startSync(force: boolean = false): Promise<SyncResult> {
    if (this.syncStatus.isRunning && !force) {
      throw new Error('Sync already in progress');
    }

    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    this.syncStatus = {
      isRunning: true,
      progress: 0,
      currentOperation: 'Initializing sync...',
      totalOperations: 5, // Queue, Books, Settings, Cache cleanup, Finalize
      completedOperations: 0,
      errors: [],
      conflicts: [],
      startedAt: Date.now(),
    };

    this.notifyListeners();

    try {
      const result = await this.performSync();
      
      this.syncStatus.isRunning = false;
      this.syncStatus.progress = 100;
      this.syncStatus.currentOperation = 'Sync completed';
      
      this.notifyListeners();
      
      return result;
    } catch (error) {
      this.syncStatus.isRunning = false;
      this.syncStatus.errors.push(error instanceof Error ? error.message : 'Unknown error');
      this.notifyListeners();
      
      throw error;
    }
  }

  private async performSync(): Promise<SyncResult> {
    const startTime = Date.now();
    let syncedItems = 0;
    let conflicts = 0;

    // Step 1: Process offline queue
    this.updateProgress(1, 'Processing offline actions...');
    await this.processOfflineQueue();

    // Step 2: Sync books
    this.updateProgress(2, 'Syncing books...');
    const booksSyncResult = await this.syncBooks();
    syncedItems += booksSyncResult.synced;
    conflicts += booksSyncResult.conflicts;

    // Step 3: Sync settings
    this.updateProgress(3, 'Syncing settings...');
    const settingsSyncResult = await this.syncSettings();
    if (settingsSyncResult.conflicts > 0) {
      conflicts += settingsSyncResult.conflicts;
    }

    // Step 4: Update cache
    this.updateProgress(4, 'Updating cache...');
    await this.updateCache();

    // Step 5: Finalize
    this.updateProgress(5, 'Finalizing sync...');
    await this.saveLastSyncTimestamp();

    const duration = Date.now() - startTime;

    return {
      success: true,
      syncedItems,
      conflicts,
      errors: this.syncStatus.errors,
      duration,
    };
  }

  private async processOfflineQueue(): Promise<void> {
    try {
      await offlineQueue.forcSync();
    } catch (error) {
      this.syncStatus.errors.push('Failed to process offline queue: ' + error);
    }
  }

  private async syncBooks(): Promise<{ synced: number; conflicts: number }> {
    try {
      // Get local books
      const localBooks = await clientCache.get('books', 'general');
      
      // Get remote books
      const remoteResponse = await booktarrAPI.getBooks();
      const remoteBooks = remoteResponse.series;

      if (!localBooks) {
        // No local data, just cache remote
        await clientCache.set('books', JSON.stringify(remoteBooks), 'general');
        return { synced: Object.keys(remoteBooks).length, conflicts: 0 };
      }

      // Parse local books if it's a string
      const parsedLocalBooks = typeof localBooks === 'string' ? JSON.parse(localBooks) : localBooks;

      // Compare and resolve conflicts
      const { merged, conflicts } = await this.mergeBooks(parsedLocalBooks, remoteBooks);
      
      // Update cache with merged data
      await clientCache.set('books', JSON.stringify(merged), 'general');

      return { 
        synced: Object.keys(merged).length, 
        conflicts: conflicts.length 
      };
    } catch (error) {
      this.syncStatus.errors.push('Books sync failed: ' + error);
      return { synced: 0, conflicts: 0 };
    }
  }

  private async syncSettings(): Promise<{ conflicts: number }> {
    try {
      // Get local settings
      const localSettings = await clientCache.get('settings', 'general');
      
      // Get remote settings
      const remoteSettings = await booktarrAPI.getSettings();

      if (!localSettings) {
        await clientCache.set('settings', JSON.stringify(remoteSettings), 'general');
        return { conflicts: 0 };
      }

      // Parse local settings if it's a string
      const parsedLocalSettings = typeof localSettings === 'string' ? JSON.parse(localSettings) : localSettings;

      // Resolve conflicts
      const conflictData = {
        local: parsedLocalSettings,
        remote: remoteSettings,
        lastSync: this.lastSyncTimestamp,
        timestamp: Date.now(),
      };

      const resolution = conflictResolver.resolveSettingsConflict(conflictData, 'merge');
      
      if (resolution.conflicts.length > 0) {
        this.syncStatus.conflicts.push({
          type: 'settings',
          resolution: resolution,
        });
      }

      // Update both local cache and remote if needed
      await clientCache.set('settings', JSON.stringify(resolution.resolved), 'general');
      
      if (resolution.strategy === 'local' || resolution.strategy === 'merge') {
        try {
          await booktarrAPI.updateSettings(resolution.resolved);
        } catch (error) {
          this.syncStatus.errors.push('Failed to update remote settings: ' + error);
        }
      }

      return { conflicts: resolution.conflicts.length };
    } catch (error) {
      this.syncStatus.errors.push('Settings sync failed: ' + error);
      return { conflicts: 0 };
    }
  }

  private async mergeBooks(local: any, remote: any): Promise<{ merged: any; conflicts: any[] }> {
    const merged = { ...remote };
    const conflicts: any[] = [];

    // Simple merge strategy for now - could be enhanced
    Object.keys(local).forEach(seriesName => {
      if (!merged[seriesName]) {
        merged[seriesName] = local[seriesName];
      } else {
        // Merge books in series
        const localBooks = local[seriesName];
        const remoteBooks = merged[seriesName];
        const mergedBooks = [...remoteBooks];

        localBooks.forEach((localBook: any) => {
          const remoteBookIndex = remoteBooks.findIndex((b: any) => b.isbn === localBook.isbn);
          
          if (remoteBookIndex === -1) {
            // Local book not in remote, add it
            mergedBooks.push(localBook);
          } else {
            // Book exists in both, resolve conflict
            const conflictData = {
              local: localBook,
              remote: remoteBooks[remoteBookIndex],
              lastSync: this.lastSyncTimestamp,
              timestamp: Date.now(),
            };

            const resolution = conflictResolver.resolveBookConflict(conflictData, 'merge');
            
            if (resolution.conflicts.length > 0) {
              conflicts.push({
                type: 'book',
                isbn: localBook.isbn,
                title: localBook.title,
                resolution: resolution,
              });
            }

            mergedBooks[remoteBookIndex] = resolution.resolved;
          }
        });

        merged[seriesName] = mergedBooks;
      }
    });

    return { merged, conflicts };
  }

  private async updateCache(): Promise<void> {
    try {
      // Clean up old cache entries
      await clientCache.cleanup();
      
      // Update cache timestamps
      await clientCache.set('cache-updated', Date.now().toString(), 'general');
    } catch (error) {
      this.syncStatus.errors.push('Cache update failed: ' + error);
    }
  }

  private updateProgress(step: number, operation: string): void {
    this.syncStatus.completedOperations = step;
    this.syncStatus.progress = Math.round((step / this.syncStatus.totalOperations) * 100);
    this.syncStatus.currentOperation = operation;
    
    // Estimate completion time
    const elapsed = Date.now() - this.syncStatus.startedAt;
    const avgTimePerStep = elapsed / step;
    const remainingSteps = this.syncStatus.totalOperations - step;
    this.syncStatus.estimatedCompletion = Date.now() + (remainingSteps * avgTimePerStep);
    
    this.notifyListeners();
  }

  private async handleOnlineSync(): Promise<void> {
    // Auto-sync when coming back online if we have pending actions
    if (await offlineQueue.hasPendingActions()) {
      try {
        await this.startSync();
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }
  }

  // Get current offline mode information
  async getOfflineModeInfo(): Promise<OfflineModeInfo> {
    const stats = await offlineQueue.getQueueStats();
    const cacheAge = await this.getCacheAge();
    
    return {
      isOffline: !this.isOnline,
      lastSync: this.lastSyncTimestamp,
      pendingActions: stats.pending,
      dataAge: cacheAge,
      estimatedDataFreshness: Math.max(0, 100 - (cacheAge / (24 * 60 * 60 * 1000)) * 100), // Freshness percentage
    };
  }

  private async getCacheAge(): Promise<number> {
    try {
      const cacheUpdated = await clientCache.get('cache-updated', 'general');
      if (cacheUpdated && typeof cacheUpdated === 'string') {
        return Date.now() - parseInt(cacheUpdated);
      }
    } catch (error) {
      // Ignore cache errors
    }
    return Date.now() - this.lastSyncTimestamp;
  }

  // Queue operations for offline execution
  async queueBookOperation(operation: 'add' | 'remove' | 'update', data: any): Promise<void> {
    if (this.isOnline) {
      // Execute immediately if online
      try {
        switch (operation) {
          case 'add':
            // Add book via API
            const addResponse = await fetch('/api/books', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            if (!addResponse.ok) {
              throw new Error(`Failed to add book: ${addResponse.statusText}`);
            }
            break;
          case 'remove':
            // Remove book via API
            const removeResponse = await fetch(`/api/books/${data.isbn}`, {
              method: 'DELETE',
            });
            if (!removeResponse.ok) {
              throw new Error(`Failed to remove book: ${removeResponse.statusText}`);
            }
            break;
          case 'update':
            // Update book via API
            const updateResponse = await fetch(`/api/books/${data.isbn}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data.updates || data),
            });
            if (!updateResponse.ok) {
              throw new Error(`Failed to update book: ${updateResponse.statusText}`);
            }
            break;
        }
      } catch (error) {
        // If immediate execution fails, queue it
        await this.queueForOffline(operation, data);
        throw error;
      }
    } else {
      // Queue for offline execution
      await this.queueForOffline(operation, data);
    }
  }

  private async queueForOffline(operation: string, data: any): Promise<void> {
    switch (operation) {
      case 'add':
        await offlineQueue.queueBookAdd(data);
        break;
      case 'remove':
        await offlineQueue.queueBookRemove(data.isbn);
        break;
      default:
        throw new Error(`Unsupported offline operation: ${operation}`);
    }
  }

  // Listeners for sync status
  addSyncListener(listener: (status: SyncStatus) => void): void {
    this.listeners.add(listener);
  }

  removeSyncListener(listener: (status: SyncStatus) => void): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.syncStatus });
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  // Get current sync status
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Check if sync is needed
  async isSyncNeeded(): Promise<boolean> {
    const info = await this.getOfflineModeInfo();
    return info.pendingActions > 0 || info.dataAge > 60 * 60 * 1000; // 1 hour
  }
}

// Export singleton instance
export const offlineSync = new OfflineSyncService();
export default offlineSync;