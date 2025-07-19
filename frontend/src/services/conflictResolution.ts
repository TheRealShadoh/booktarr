/**
 * Conflict resolution service for handling data conflicts during sync
 * Provides strategies for merging conflicting data
 */

interface ConflictData<T> {
  local: T;
  remote: T;
  lastSync: number;
  timestamp: number;
}

interface ConflictResolution<T> {
  resolved: T;
  strategy: 'local' | 'remote' | 'merge' | 'manual';
  conflicts: string[];
}

type ConflictStrategy = 'newest-wins' | 'local-wins' | 'remote-wins' | 'merge' | 'manual';

class ConflictResolutionService {
  
  // Resolve book conflicts
  resolveBookConflict(
    conflict: ConflictData<any>, 
    strategy: ConflictStrategy = 'newest-wins'
  ): ConflictResolution<any> {
    
    switch (strategy) {
      case 'newest-wins':
        return this.resolveByNewest(conflict);
      
      case 'local-wins':
        return {
          resolved: conflict.local,
          strategy: 'local',
          conflicts: this.findBookDifferences(conflict.local, conflict.remote)
        };
      
      case 'remote-wins':
        return {
          resolved: conflict.remote,
          strategy: 'remote',
          conflicts: this.findBookDifferences(conflict.local, conflict.remote)
        };
      
      case 'merge':
        return this.mergeBooks(conflict);
      
      case 'manual':
        return {
          resolved: conflict.local, // Keep local until manual resolution
          strategy: 'manual',
          conflicts: this.findBookDifferences(conflict.local, conflict.remote)
        };
      
      default:
        return this.resolveByNewest(conflict);
    }
  }

  // Resolve settings conflicts
  resolveSettingsConflict(
    conflict: ConflictData<any>,
    strategy: ConflictStrategy = 'local-wins'
  ): ConflictResolution<any> {
    
    switch (strategy) {
      case 'local-wins':
        return {
          resolved: conflict.local,
          strategy: 'local',
          conflicts: this.findSettingsDifferences(conflict.local, conflict.remote)
        };
      
      case 'remote-wins':
        return {
          resolved: conflict.remote,
          strategy: 'remote',
          conflicts: this.findSettingsDifferences(conflict.local, conflict.remote)
        };
      
      case 'merge':
        return this.mergeSettings(conflict);
      
      case 'newest-wins':
        return this.resolveByNewest(conflict);
      
      default:
        return {
          resolved: conflict.local, // Default to local for settings
          strategy: 'local',
          conflicts: this.findSettingsDifferences(conflict.local, conflict.remote)
        };
    }
  }

  // Resolve by timestamp (newest wins)
  private resolveByNewest<T>(conflict: ConflictData<T>): ConflictResolution<T> {
    const localTimestamp = this.extractTimestamp(conflict.local);
    const remoteTimestamp = this.extractTimestamp(conflict.remote);
    
    if (localTimestamp > remoteTimestamp) {
      return {
        resolved: conflict.local,
        strategy: 'local',
        conflicts: []
      };
    } else {
      return {
        resolved: conflict.remote,
        strategy: 'remote',
        conflicts: []
      };
    }
  }

  // Merge book data intelligently
  private mergeBooks(conflict: ConflictData<any>): ConflictResolution<any> {
    const merged = { ...conflict.remote }; // Start with remote as base
    const conflicts: string[] = [];

    // Fields where local should win (user modifications)
    const localWinsFields = ['series', 'series_position', 'metadata_enhanced'];
    
    // Fields where newest should win (dynamic data)
    const newestWinsFields = ['thumbnail_url', 'description', 'categories', 'pricing'];
    
    // Fields where we merge arrays
    const mergeArrayFields = ['authors', 'categories'];

    localWinsFields.forEach(field => {
      if (conflict.local[field] !== undefined && conflict.local[field] !== conflict.remote[field]) {
        merged[field] = conflict.local[field];
        if (conflict.remote[field] !== undefined) {
          conflicts.push(`${field}: local '${conflict.local[field]}' vs remote '${conflict.remote[field]}'`);
        }
      }
    });

    newestWinsFields.forEach(field => {
      const localTimestamp = this.extractTimestamp(conflict.local);
      const remoteTimestamp = this.extractTimestamp(conflict.remote);
      
      if (localTimestamp > remoteTimestamp && conflict.local[field] !== undefined) {
        merged[field] = conflict.local[field];
      }
    });

    mergeArrayFields.forEach(field => {
      if (conflict.local[field] && conflict.remote[field]) {
        // Merge arrays, removing duplicates
        const localArray = Array.isArray(conflict.local[field]) ? conflict.local[field] : [conflict.local[field]];
        const remoteArray = Array.isArray(conflict.remote[field]) ? conflict.remote[field] : [conflict.remote[field]];
        
        const combined = [...remoteArray, ...localArray];
        merged[field] = combined.filter((item, index) => combined.indexOf(item) === index);
      }
    });

    // Always use the latest timestamp
    merged.last_updated = Math.max(
      this.extractTimestamp(conflict.local),
      this.extractTimestamp(conflict.remote)
    );

    return {
      resolved: merged,
      strategy: 'merge',
      conflicts
    };
  }

  // Merge settings data
  private mergeSettings(conflict: ConflictData<any>): ConflictResolution<any> {
    const merged = { ...conflict.remote }; // Start with remote
    const conflicts: string[] = [];

    // Settings where local should always win (user preferences)
    const localWinsSettings = [
      'cache_ttl',
      'enable_price_lookup',
      'default_language',
      'view_mode',
      'books_per_page'
    ];

    // Settings where we need to be careful (API keys, URLs)
    const sensitiveSettings = [
      'skoolib_url',
      'google_books_api_key',
      'open_library_api_key'
    ];

    localWinsSettings.forEach(setting => {
      if (conflict.local[setting] !== undefined) {
        if (conflict.local[setting] !== conflict.remote[setting]) {
          conflicts.push(`${setting}: keeping local '${conflict.local[setting]}'`);
        }
        merged[setting] = conflict.local[setting];
      }
    });

    sensitiveSettings.forEach(setting => {
      // For sensitive settings, prefer non-empty values
      if (conflict.local[setting] && !conflict.remote[setting]) {
        merged[setting] = conflict.local[setting];
      } else if (!conflict.local[setting] && conflict.remote[setting]) {
        merged[setting] = conflict.remote[setting];
      } else if (conflict.local[setting] && conflict.remote[setting] && 
                 conflict.local[setting] !== conflict.remote[setting]) {
        // Both have values - prefer local
        merged[setting] = conflict.local[setting];
        conflicts.push(`${setting}: local value preferred over remote`);
      }
    });

    return {
      resolved: merged,
      strategy: 'merge',
      conflicts
    };
  }

  // Find differences between books
  private findBookDifferences(local: any, remote: any): string[] {
    const differences: string[] = [];
    const fieldsToCheck = [
      'title', 'authors', 'series', 'series_position', 
      'publisher', 'published_date', 'page_count', 
      'description', 'categories', 'thumbnail_url'
    ];

    fieldsToCheck.forEach(field => {
      if (this.isDifferent(local[field], remote[field])) {
        differences.push(`${field}: '${local[field]}' vs '${remote[field]}'`);
      }
    });

    return differences;
  }

  // Find differences between settings
  private findSettingsDifferences(local: any, remote: any): string[] {
    const differences: string[] = [];
    const allKeys = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]);

    allKeys.forEach(key => {
      if (this.isDifferent(local[key], remote[key])) {
        differences.push(`${key}: '${local[key]}' vs '${remote[key]}'`);
      }
    });

    return differences;
  }

  // Check if two values are different
  private isDifferent(a: any, b: any): boolean {
    if (a === b) return false;
    if (a == null || b == null) return a !== b;
    
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return true;
      return a.some((item, index) => this.isDifferent(item, b[index]));
    }
    
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) !== JSON.stringify(b);
    }
    
    return String(a) !== String(b);
  }

  // Extract timestamp from object
  private extractTimestamp(obj: any): number {
    if (obj.last_updated) {
      return typeof obj.last_updated === 'string' 
        ? new Date(obj.last_updated).getTime()
        : obj.last_updated;
    }
    if (obj.updated_at) {
      return typeof obj.updated_at === 'string'
        ? new Date(obj.updated_at).getTime()
        : obj.updated_at;
    }
    if (obj.timestamp) {
      return obj.timestamp;
    }
    return 0;
  }

  // Create conflict report
  createConflictReport(conflicts: ConflictResolution<any>[]): string {
    if (conflicts.length === 0) {
      return 'No conflicts detected during sync.';
    }

    let report = `Sync completed with ${conflicts.length} conflicts resolved:\n\n`;
    
    conflicts.forEach((conflict, index) => {
      report += `${index + 1}. Strategy: ${conflict.strategy}\n`;
      if (conflict.conflicts.length > 0) {
        report += `   Conflicts:\n`;
        conflict.conflicts.forEach(conflictDesc => {
          report += `   - ${conflictDesc}\n`;
        });
      }
      report += '\n';
    });

    return report;
  }

  // Get recommended strategy based on conflict type
  getRecommendedStrategy(conflictType: 'book' | 'settings', userPreference?: ConflictStrategy): ConflictStrategy {
    if (userPreference) return userPreference;
    
    switch (conflictType) {
      case 'book':
        return 'merge'; // Usually best for book data
      case 'settings':
        return 'local-wins'; // User preferences should stay local
      default:
        return 'newest-wins';
    }
  }
}

// Export singleton instance
export const conflictResolver = new ConflictResolutionService();
export default conflictResolver;