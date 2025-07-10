/**
 * Scan History Service
 * Tracks and manages barcode scanning history using IndexedDB
 */

interface ScanHistoryEntry {
  id: string;
  isbn: string;
  timestamp: number;
  method: 'camera' | 'manual';
  batchId?: string;
  bookTitle?: string;
  bookAuthors?: string[];
  success: boolean;
  error?: string;
}

interface ScanStats {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  uniqueISBNs: number;
  batchScans: number;
  cameraScans: number;
  manualScans: number;
  lastScanDate: number | null;
  mostScannedISBN: string | null;
  averageScansPerDay: number;
}

interface ScanSession {
  id: string;
  startTime: number;
  endTime?: number;
  totalScans: number;
  successfulScans: number;
  method: 'single' | 'batch';
  isbns: string[];
}

class ScanHistoryService {
  private dbName = 'booktarr-scan-history';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

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

        // Scan history store
        if (!db.objectStoreNames.contains('scanHistory')) {
          const historyStore = db.createObjectStore('scanHistory', { keyPath: 'id' });
          historyStore.createIndex('isbn', 'isbn', { unique: false });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
          historyStore.createIndex('method', 'method', { unique: false });
          historyStore.createIndex('batchId', 'batchId', { unique: false });
          historyStore.createIndex('success', 'success', { unique: false });
        }

        // Scan sessions store
        if (!db.objectStoreNames.contains('scanSessions')) {
          const sessionsStore = db.createObjectStore('scanSessions', { keyPath: 'id' });
          sessionsStore.createIndex('startTime', 'startTime', { unique: false });
          sessionsStore.createIndex('method', 'method', { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  // Record a scan
  async recordScan(
    isbn: string,
    method: 'camera' | 'manual',
    success: boolean,
    error?: string,
    batchId?: string,
    bookTitle?: string,
    bookAuthors?: string[]
  ): Promise<string> {
    const db = await this.ensureDB();
    const entry: ScanHistoryEntry = {
      id: this.generateId(),
      isbn,
      timestamp: Date.now(),
      method,
      batchId,
      bookTitle,
      bookAuthors,
      success,
      error,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['scanHistory'], 'readwrite');
      const store = transaction.objectStore('scanHistory');
      const request = store.add(entry);

      request.onsuccess = () => resolve(entry.id);
      request.onerror = () => reject(request.error);
    });
  }

  // Start a scan session
  async startScanSession(method: 'single' | 'batch'): Promise<string> {
    const db = await this.ensureDB();
    const session: ScanSession = {
      id: this.generateId(),
      startTime: Date.now(),
      totalScans: 0,
      successfulScans: 0,
      method,
      isbns: [],
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['scanSessions'], 'readwrite');
      const store = transaction.objectStore('scanSessions');
      const request = store.add(session);

      request.onsuccess = () => resolve(session.id);
      request.onerror = () => reject(request.error);
    });
  }

  // Update scan session
  async updateScanSession(
    sessionId: string,
    updates: Partial<ScanSession>
  ): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['scanSessions'], 'readwrite');
      const store = transaction.objectStore('scanSessions');
      const getRequest = store.get(sessionId);

      getRequest.onsuccess = () => {
        const session = getRequest.result;
        if (session) {
          const updatedSession = { ...session, ...updates };
          const putRequest = store.put(updatedSession);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Session not found'));
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // End scan session
  async endScanSession(sessionId: string): Promise<void> {
    await this.updateScanSession(sessionId, {
      endTime: Date.now(),
    });
  }

  // Get scan history
  async getScanHistory(
    limit: number = 100,
    offset: number = 0
  ): Promise<ScanHistoryEntry[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['scanHistory'], 'readonly');
      const store = transaction.objectStore('scanHistory');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // Newest first

      const results: ScanHistoryEntry[] = [];
      let currentOffset = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && results.length < limit) {
          if (currentOffset >= offset) {
            results.push(cursor.value);
          }
          currentOffset++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Get scan statistics
  async getScanStats(): Promise<ScanStats> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['scanHistory'], 'readonly');
      const store = transaction.objectStore('scanHistory');
      const request = store.getAll();

      request.onsuccess = () => {
        const entries: ScanHistoryEntry[] = request.result;
        
        const stats: ScanStats = {
          totalScans: entries.length,
          successfulScans: entries.filter(e => e.success).length,
          failedScans: entries.filter(e => !e.success).length,
          uniqueISBNs: new Set(entries.map(e => e.isbn)).size,
          batchScans: entries.filter(e => e.batchId).length,
          cameraScans: entries.filter(e => e.method === 'camera').length,
          manualScans: entries.filter(e => e.method === 'manual').length,
          lastScanDate: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : null,
          mostScannedISBN: this.getMostScannedISBN(entries),
          averageScansPerDay: this.calculateAverageScansPerDay(entries),
        };

        resolve(stats);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Get recent scan sessions
  async getRecentSessions(limit: number = 10): Promise<ScanSession[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['scanSessions'], 'readonly');
      const store = transaction.objectStore('scanSessions');
      const index = store.index('startTime');
      const request = index.openCursor(null, 'prev');

      const results: ScanSession[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Search scan history
  async searchHistory(query: string): Promise<ScanHistoryEntry[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['scanHistory'], 'readonly');
      const store = transaction.objectStore('scanHistory');
      const request = store.getAll();

      request.onsuccess = () => {
        const entries: ScanHistoryEntry[] = request.result;
        const lowerQuery = query.toLowerCase();
        
        const filtered = entries.filter(entry => 
          entry.isbn.includes(query) ||
          (entry.bookTitle && entry.bookTitle.toLowerCase().includes(lowerQuery)) ||
          (entry.bookAuthors && entry.bookAuthors.some(author => 
            author.toLowerCase().includes(lowerQuery)
          ))
        );

        // Sort by timestamp, newest first
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        
        resolve(filtered);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Clear history
  async clearHistory(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['scanHistory', 'scanSessions'], 'readwrite');
      
      const historyStore = transaction.objectStore('scanHistory');
      const sessionsStore = transaction.objectStore('scanSessions');
      
      const historyRequest = historyStore.clear();
      const sessionsRequest = sessionsStore.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Get scans by batch ID
  async getBatchScans(batchId: string): Promise<ScanHistoryEntry[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['scanHistory'], 'readonly');
      const store = transaction.objectStore('scanHistory');
      const index = store.index('batchId');
      const request = index.getAll(batchId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Export history as JSON
  async exportHistory(): Promise<string> {
    const history = await this.getScanHistory(1000); // Get all
    const sessions = await this.getRecentSessions(100);
    const stats = await this.getScanStats();

    const exportData = {
      exportDate: new Date().toISOString(),
      stats,
      history,
      sessions,
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Helper methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getMostScannedISBN(entries: ScanHistoryEntry[]): string | null {
    if (entries.length === 0) return null;

    const isbnCounts = entries.reduce((acc, entry) => {
      acc[entry.isbn] = (acc[entry.isbn] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostScanned = Object.entries(isbnCounts).reduce((max, [isbn, count]) => 
      count > max.count ? { isbn, count } : max, 
      { isbn: '', count: 0 }
    );

    return mostScanned.isbn || null;
  }

  private calculateAverageScansPerDay(entries: ScanHistoryEntry[]): number {
    if (entries.length === 0) return 0;

    const timestamps = entries.map(e => e.timestamp);
    const earliest = Math.min(...timestamps);
    const latest = Math.max(...timestamps);
    const daysDiff = Math.max(1, (latest - earliest) / (24 * 60 * 60 * 1000));

    return entries.length / daysDiff;
  }
}

// Export singleton instance
export const scanHistory = new ScanHistoryService();
export default scanHistory;

// Export types
export type { ScanHistoryEntry, ScanStats, ScanSession };