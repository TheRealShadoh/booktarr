/**
 * Offline queue service for handling actions when offline
 * Queues operations and syncs when back online
 */

interface QueuedAction {
  id: string;
  type: 'ADD_BOOK' | 'REMOVE_BOOK' | 'UPDATE_BOOK' | 'UPDATE_SETTINGS' | 'SYNC_BOOKS';
  data: any;
  timestamp: number;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  retryCount: number;
  maxRetries: number;
}

interface QueueStats {
  totalQueued: number;
  pending: number;
  completed: number;
  failed: number;
}

class OfflineQueueService {
  private dbName = 'booktarr-offline-queue';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private listeners: Set<(action: QueuedAction) => void> = new Set();

  constructor() {
    this.initializeDB();
    this.setupNetworkListeners();
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create queue store
        if (!db.objectStoreNames.contains('queue')) {
          const queueStore = db.createObjectStore('queue', { keyPath: 'id' });
          queueStore.createIndex('timestamp', 'timestamp');
          queueStore.createIndex('type', 'type');
          queueStore.createIndex('retryCount', 'retryCount');
        }

        // Create completed actions store (for conflict resolution)
        if (!db.objectStoreNames.contains('completed')) {
          const completedStore = db.createObjectStore('completed', { keyPath: 'id' });
          completedStore.createIndex('timestamp', 'timestamp');
          completedStore.createIndex('type', 'type');
        }
      };
    });
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processPendingQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Queue an action for offline processing
  async queueAction(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    if (!this.db) {
      await this.initializeDB();
    }

    const queuedAction: QueuedAction = {
      ...action,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['queue'], 'readwrite');
      const store = transaction.objectStore('queue');
      const request = store.add(queuedAction);

      request.onsuccess = () => {
        this.notifyListeners(queuedAction);
        resolve(queuedAction.id);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Process pending queue when back online
  private async processPendingQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;

    try {
      const pendingActions = await this.getPendingActions();
      
      for (const action of pendingActions) {
        try {
          await this.executeAction(action);
          await this.markAsCompleted(action);
          await this.removeFromQueue(action.id);
        } catch (error) {
          console.error('Failed to execute queued action:', action, error);
          
          // Increment retry count
          action.retryCount++;
          
          if (action.retryCount >= action.maxRetries) {
            console.error('Max retries reached for action:', action);
            await this.markAsFailed(action);
            await this.removeFromQueue(action.id);
          } else {
            // Update retry count in queue
            await this.updateQueuedAction(action);
          }
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  // Execute a queued action
  private async executeAction(action: QueuedAction): Promise<any> {
    const requestInit: RequestInit = {
      method: action.method,
      headers: {
        'Content-Type': 'application/json',
        ...action.headers,
      },
    };

    if (action.method !== 'GET' && action.data) {
      requestInit.body = JSON.stringify(action.data);
    }

    const response = await fetch(action.url, requestInit);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Get all pending actions from queue
  private async getPendingActions(): Promise<QueuedAction[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['queue'], 'readonly');
      const store = transaction.objectStore('queue');
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => {
        const actions = request.result as QueuedAction[];
        // Sort by timestamp (FIFO)
        actions.sort((a, b) => a.timestamp - b.timestamp);
        resolve(actions);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Mark action as completed
  private async markAsCompleted(action: QueuedAction): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['completed'], 'readwrite');
      const store = transaction.objectStore('completed');
      
      const completedAction = {
        ...action,
        completedAt: Date.now(),
      };

      const request = store.add(completedAction);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Mark action as failed
  private async markAsFailed(action: QueuedAction): Promise<void> {
    // Could store failed actions for later analysis
    console.warn('Action failed after max retries:', action);
  }

  // Remove action from queue
  private async removeFromQueue(actionId: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['queue'], 'readwrite');
      const store = transaction.objectStore('queue');
      const request = store.delete(actionId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Update queued action (for retry count)
  private async updateQueuedAction(action: QueuedAction): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['queue'], 'readwrite');
      const store = transaction.objectStore('queue');
      const request = store.put(action);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get queue statistics
  async getQueueStats(): Promise<QueueStats> {
    if (!this.db) {
      return { totalQueued: 0, pending: 0, completed: 0, failed: 0 };
    }

    const [pending, completed] = await Promise.all([
      this.countRecords('queue'),
      this.countRecords('completed'),
    ]);

    return {
      totalQueued: pending + completed,
      pending,
      completed,
      failed: 0, // Could track failed actions separately
    };
  }

  private async countRecords(storeName: string): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear completed actions (cleanup)
  async clearCompleted(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['completed'], 'readwrite');
      const store = transaction.objectStore('completed');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Add listener for queue changes
  addListener(listener: (action: QueuedAction) => void): void {
    this.listeners.add(listener);
  }

  // Remove listener
  removeListener(listener: (action: QueuedAction) => void): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(action: QueuedAction): void {
    this.listeners.forEach(listener => {
      try {
        listener(action);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }

  private generateId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for common operations
  async queueBookAdd(book: any): Promise<string> {
    return this.queueAction({
      type: 'ADD_BOOK',
      data: book,
      url: '/api/library/add',
      method: 'POST',
      maxRetries: 3,
    });
  }

  async queueBookRemove(isbn: string): Promise<string> {
    return this.queueAction({
      type: 'REMOVE_BOOK',
      data: { isbn },
      url: `/api/library/${isbn}`,
      method: 'DELETE',
      maxRetries: 3,
    });
  }

  async queueSettingsUpdate(settings: any): Promise<string> {
    return this.queueAction({
      type: 'UPDATE_SETTINGS',
      data: settings,
      url: '/api/settings',
      method: 'PUT',
      maxRetries: 2,
    });
  }

  // Force sync (manual trigger)
  async forcSync(): Promise<void> {
    if (this.isOnline) {
      await this.processPendingQueue();
    }
  }

  // Check if we have pending actions
  async hasPendingActions(): Promise<boolean> {
    const stats = await this.getQueueStats();
    return stats.pending > 0;
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueueService();
export default offlineQueue;