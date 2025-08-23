/**
 * Backup and Restore component
 * Handles data backup, restore, and migration features
 */
import React, { useState, useRef } from 'react';
import { useStateManager } from '../hooks/useStateManager';
import { ExportService } from '../services/exportService';
import { Book } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface BackupData {
  exported: string;
  version: string;
  backup_type: string;
  library?: {
    totalBooks: number;
    books: Book[];
  };
  settings?: any;
}

const BackupRestore: React.FC = () => {
  const { 
    state, 
    showToast, 
    batchAddBooks,
    updateSettingsWithOptimizations,
    syncWithServer
  } = useStateManager();

  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [backupHistory, setBackupHistory] = useState<Array<{
    date: string;
    type: string;
    size: string;
    books: number;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate complete backup
  const handleCreateBackup = async (includeSettings: boolean = true) => {
    try {
      setLoading(true);
      
      const allBooks = Object.values(state.books).flat();
      
      if (includeSettings) {
        ExportService.exportCompleteBackup(allBooks, state.settings);
      } else {
        ExportService.exportToJSON(allBooks);
      }
      
      // Add to backup history (in a real app, this would be persisted)
      const newBackup = {
        date: new Date().toISOString(),
        type: includeSettings ? 'Complete' : 'Library Only',
        size: `${Math.round(JSON.stringify(allBooks).length / 1024)}KB`,
        books: allBooks.length
      };
      
      setBackupHistory(prev => [newBackup, ...prev.slice(0, 9)]); // Keep last 10
      
      showToast('Backup created successfully!', 'success');
    } catch (error) {
      showToast('Failed to create backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle file import
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setImportProgress(0);

      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let importedBooks: Book[] | Partial<Book>[] = [];

      if (fileExtension === 'json') {
        importedBooks = await ExportService.importFromJSON(file);
      } else if (fileExtension === 'csv') {
        const partialBooks = await ExportService.importFromCSV(file);
        // Convert partial books to full books with defaults
        importedBooks = partialBooks.map(book => ({
          isbn: book.isbn || '',
          title: book.title || '',
          authors: book.authors || [],
          series: book.series,
          series_position: book.series_position,
          publisher: book.publisher,
          published_date: book.published_date,
          page_count: book.page_count,
          language: book.language || 'en',
          thumbnail_url: book.thumbnail_url,
          description: book.description,
          categories: book.categories || [],
          pricing: [],
          metadata_source: 'imported' as any,
          added_date: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          metadata_enhanced: false,
          metadata_enhanced_date: undefined,
          metadata_sources_used: [],
          isbn10: book.isbn10,
          isbn13: book.isbn13
        }));
      } else {
        throw new Error('Unsupported file format. Please use JSON or CSV files.');
      }

      setImportProgress(50);

      // Filter out books that already exist
      const existingISBNs = new Set(Object.values(state.books).flat().map(book => book.isbn));
      const newBooks = importedBooks.filter(book => book.isbn && !existingISBNs.has(book.isbn)) as Book[];
      
      setImportProgress(75);

      if (newBooks.length === 0) {
        showToast('No new books to import (all books already exist)', 'warning');
        return;
      }

      // Import books in batches
      const batchSize = 10;
      let importedCount = 0;
      
      for (let i = 0; i < newBooks.length; i += batchSize) {
        const batch = newBooks.slice(i, i + batchSize);
        await batchAddBooks(batch);
        importedCount += batch.length;
        
        setImportProgress(75 + (importedCount / newBooks.length) * 25);
      }

      setImportProgress(100);
      showToast(`Successfully imported ${newBooks.length} books!`, 'success');

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Import error:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to import file', 
        'error'
      );
    } finally {
      setLoading(false);
      setImportProgress(0);
    }
  };

  // Restore from backup
  const handleRestoreBackup = async (replaceExisting: boolean = false) => {
    if (!fileInputRef.current) return;
    
    fileInputRef.current.accept = '.json';
    fileInputRef.current.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        setLoading(true);
        
        const backupData: BackupData = JSON.parse(await file.text());
        
        // Validate backup format
        if (!backupData.library?.books) {
          throw new Error('Invalid backup file format');
        }

        const { books } = backupData.library;
        
        if (replaceExisting) {
          // This would require an API endpoint to clear the library first
          showToast('Replace existing feature requires backend implementation', 'info');
        } else {
          // Add books that don't already exist
          const existingISBNs = new Set(Object.values(state.books).flat().map(book => book.isbn));
          const newBooks = books.filter(book => !existingISBNs.has(book.isbn));
          
          if (newBooks.length === 0) {
            showToast('No new books in backup to restore', 'warning');
            return;
          }

          await batchAddBooks(newBooks);
          showToast(`Restored ${newBooks.length} books from backup!`, 'success');
        }

        // Restore settings if available
        if (backupData.settings) {
          await updateSettingsWithOptimizations(backupData.settings);
          showToast('Settings restored from backup!', 'success');
        }

      } catch (error) {
        console.error('Restore error:', error);
        showToast('Failed to restore from backup', 'error');
      } finally {
        setLoading(false);
        fileInputRef.current!.value = '';
      }
    };
    
    fileInputRef.current.click();
  };

  // Auto-backup functionality
  const handleScheduleAutoBackup = () => {
    // This would typically involve setting up a scheduled task
    showToast('Auto-backup scheduling requires backend implementation', 'info');
  };

  // Migrate data from other sources
  const handleMigrateData = () => {
    showToast('Data migration wizard coming soon!', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-booktarr-text text-xl font-semibold">Backup & Restore</h2>
        <p className="text-booktarr-textSecondary text-sm mt-1">
          Protect your library data with backups and import books from other sources
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".json,.csv"
        onChange={handleFileImport}
      />

      {/* Backup Section */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h3 className="text-booktarr-text text-lg font-semibold">Create Backup</h3>
        </div>
        <div className="booktarr-card-body">
          <p className="text-booktarr-textSecondary text-sm mb-4">
            Create a backup of your library and settings. Backups are downloaded as JSON files.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleCreateBackup(true)}
              disabled={loading}
              className="booktarr-btn booktarr-btn-primary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Complete Backup
            </button>
            
            <button
              onClick={() => handleCreateBackup(false)}
              disabled={loading}
              className="booktarr-btn booktarr-btn-secondary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Library Only
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-booktarr-border">
            <button
              onClick={handleScheduleAutoBackup}
              disabled={loading}
              className="booktarr-btn booktarr-btn-secondary text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Schedule Auto-Backup
            </button>
          </div>
        </div>
      </div>

      {/* Import Section */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h3 className="text-booktarr-text text-lg font-semibold">Import Books</h3>
        </div>
        <div className="booktarr-card-body">
          <p className="text-booktarr-textSecondary text-sm mb-4">
            Import books from JSON or CSV files. Supported formats include Booktarr backups and custom exports.
          </p>

          {loading && importProgress > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-booktarr-textSecondary">Import Progress</span>
                <span className="text-booktarr-text">{importProgress}%</span>
              </div>
              <div className="w-full bg-booktarr-surface2 rounded-full h-2">
                <div 
                  className="bg-booktarr-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="booktarr-btn booktarr-btn-primary"
            >
              {loading ? (
                <div className="flex items-center">
                  <LoadingSpinner size="small" />
                  <span className="ml-2">Importing...</span>
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Import from File
                </>
              )}
            </button>
            
            <button
              onClick={handleMigrateData}
              disabled={loading}
              className="booktarr-btn booktarr-btn-secondary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Migrate Data
            </button>
          </div>

          <div className="mt-4 text-xs text-booktarr-textMuted">
            <p>Supported formats: JSON (Booktarr backups), CSV (custom exports)</p>
            <p>Duplicate books (same ISBN) will be skipped during import</p>
          </div>
        </div>
      </div>

      {/* Restore Section */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h3 className="text-booktarr-text text-lg font-semibold">Restore from Backup</h3>
        </div>
        <div className="booktarr-card-body">
          <p className="text-booktarr-textSecondary text-sm mb-4">
            Restore your library from a previous backup. You can add to existing data or replace it entirely.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleRestoreBackup(false)}
              disabled={loading}
              className="booktarr-btn booktarr-btn-primary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Add to Library
            </button>
            
            <button
              onClick={() => handleRestoreBackup(true)}
              disabled={loading}
              className="booktarr-btn border-red-500 text-red-400 hover:bg-red-900 hover:bg-opacity-20"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Replace Library
            </button>
          </div>

          <div className="mt-4 text-xs text-booktarr-textMuted">
            <p><strong>Add to Library:</strong> Merge backup with existing books</p>
            <p><strong>Replace Library:</strong> Remove all current books and restore from backup</p>
          </div>
        </div>
      </div>

      {/* Backup History */}
      {backupHistory.length > 0 && (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h3 className="text-booktarr-text text-lg font-semibold">Recent Backups</h3>
          </div>
          <div className="booktarr-card-body">
            <div className="space-y-2">
              {backupHistory.map((backup, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-booktarr-surface2 rounded">
                  <div>
                    <p className="text-booktarr-text text-sm font-medium">{backup.type}</p>
                    <p className="text-booktarr-textMuted text-xs">
                      {new Date(backup.date).toLocaleString()} • {backup.books} books • {backup.size}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400 text-xs">✓ Downloaded</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sync with Server */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h3 className="text-booktarr-text text-lg font-semibold">Server Sync</h3>
        </div>
        <div className="booktarr-card-body">
          <p className="text-booktarr-textSecondary text-sm mb-4">
            Synchronize your local data with the server to ensure consistency.
          </p>
          
          <button
            onClick={syncWithServer}
            disabled={loading}
            className="booktarr-btn booktarr-btn-primary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync with Server
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupRestore;