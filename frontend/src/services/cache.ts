/**
 * Client-side caching service for better performance
 * Implements IndexedDB for persistent storage and in-memory cache for speed
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  memoryUsage: number;
}

class ClientCacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private dbName = 'booktarr-cache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    memoryUsage: 0
  };

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains('search')) {
          db.createObjectStore('search', { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains('api')) {
          db.createObjectStore('api', { keyPath: 'key' });
        }
      };
    });
  }

  private generateKey(prefix: string, key: string): string {
    return `${prefix}:${key}`;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private updateStats(hit: boolean): void {
    if (hit) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    this.stats.size = this.memoryCache.size;
    this.stats.memoryUsage = JSON.stringify(Array.from(this.memoryCache.values())).length;
  }

  /**
   * Set a value in cache with TTL
   */
  async set<T>(prefix: string, key: string, data: T, ttl: number = 3600000): Promise<void> {
    const cacheKey = this.generateKey(prefix, key);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key: cacheKey
    };

    // Set in memory cache
    this.memoryCache.set(cacheKey, entry);

    // Set in IndexedDB for persistence
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([prefix], 'readwrite');
        const store = transaction.objectStore(prefix);
        const request = store.put(entry);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    this.updateStats(false);
  }

  /**
   * Get a value from cache
   */
  async get<T>(prefix: string, key: string): Promise<T | null> {
    const cacheKey = this.generateKey(prefix, key);

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry) {
      if (!this.isExpired(memoryEntry)) {
        this.updateStats(true);
        return memoryEntry.data;
      } else {
        this.memoryCache.delete(cacheKey);
      }
    }

    // Check IndexedDB
    if (this.db) {
      const entry = await this.getFromDB<T>(prefix, cacheKey);
      if (entry) {
        if (!this.isExpired(entry)) {
          // Put back in memory cache
          this.memoryCache.set(cacheKey, entry);
          this.updateStats(true);
          return entry.data;
        } else {
          // Remove expired entry
          this.deleteFromDB(prefix, cacheKey);
        }
      }
    }

    this.updateStats(false);
    return null;
  }

  private async getFromDB<T>(prefix: string, key: string): Promise<CacheEntry<T> | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([prefix], 'readonly');
      const store = transaction.objectStore(prefix);
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromDB(prefix: string, key: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([prefix], 'readwrite');
      const store = transaction.objectStore(prefix);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a specific key from cache
   */
  async delete(prefix: string, key: string): Promise<void> {
    const cacheKey = this.generateKey(prefix, key);
    
    this.memoryCache.delete(cacheKey);
    await this.deleteFromDB(prefix, cacheKey);
  }

  /**
   * Clear all cache for a specific prefix
   */
  async clearPrefix(prefix: string): Promise<void> {
    // Clear memory cache
    const keysToDelete = Array.from(this.memoryCache.keys()).filter(key => key.startsWith(prefix));
    keysToDelete.forEach(key => this.memoryCache.delete(key));

    // Clear IndexedDB
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([prefix], 'readwrite');
        const store = transaction.objectStore(prefix);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.db) {
      const prefixes = ['books', 'search', 'api'];
      await Promise.all(prefixes.map(prefix => this.clearPrefix(prefix)));
    }
    
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      memoryUsage: 0
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<void> {
    // Clean memory cache
    const keysToDelete: string[] = [];
    
    this.memoryCache.forEach((entry, key) => {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.memoryCache.delete(key));

    // Clean IndexedDB (this is more complex, so we'll implement it later if needed)
  }

  /**
   * Book-specific cache methods
   */
  async getBook(isbn: string) {
    return this.get<any>('books', isbn);
  }

  async setBook(isbn: string, book: any, ttl: number = 3600000) {
    return this.set('books', isbn, book, ttl);
  }

  async deleteBook(isbn: string) {
    return this.delete('books', isbn);
  }

  /**
   * Search-specific cache methods
   */
  async getSearchResults(query: string) {
    return this.get<any>('search', query);
  }

  async setSearchResults(query: string, results: any, ttl: number = 1800000) {
    return this.set('search', query, results, ttl);
  }

  async deleteSearchResults(query: string) {
    return this.delete('search', query);
  }

  /**
   * API response cache methods
   */
  async getApiResponse(url: string) {
    return this.get<any>('api', url);
  }

  async setApiResponse(url: string, response: any, ttl: number = 900000) {
    return this.set('api', url, response, ttl);
  }

  async deleteApiResponse(url: string) {
    return this.delete('api', url);
  }

  /**
   * Preload commonly used data
   */
  async preloadData(): Promise<void> {
    // This can be called to preload frequently accessed data
    // Implementation depends on usage patterns
  }

  /**
   * Get cache size and usage information
   */
  async getCacheInfo(): Promise<{
    memorySize: number;
    memoryEntries: number;
    estimatedSize: number;
    hitRate: number;
  }> {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      memorySize: this.stats.memoryUsage,
      memoryEntries: this.stats.size,
      estimatedSize: this.stats.memoryUsage,
      hitRate
    };
  }
}

// Create singleton instance
export const clientCache = new ClientCacheService();

// Export types for use in other files
export type { CacheEntry, CacheStats };