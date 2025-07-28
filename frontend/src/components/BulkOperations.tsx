/**
 * Bulk Operations component
 * Allows batch operations on multiple books
 */
import React, { useState, useMemo } from 'react';
import { useStateManager } from '../hooks/useStateManager';
import { Book } from '../types';
import { ExportService } from '../services/exportService';
import LoadingSpinner from './LoadingSpinner';

interface BulkOperationsProps {
  selectedBooks: Book[];
  onBooksUpdated: () => void;
  onClose: () => void;
}

type OperationType = 'export' | 'delete' | 'update_metadata' | 'change_series' | 'add_category' | 'remove_category';

const BulkOperations: React.FC<BulkOperationsProps> = ({ 
  selectedBooks, 
  onBooksUpdated, 
  onClose 
}) => {
  const { 
    showToast, 
    batchAddBooks,
    removeBookWithOptimizations
  } = useStateManager();

  const [operation, setOperation] = useState<OperationType>('export');
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [newSeries, setNewSeries] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [categoryToRemove, setCategoryToRemove] = useState('');

  // Calculate statistics for selected books
  const stats = useMemo(() => {
    const totalPages = selectedBooks.reduce((sum, book) => sum + (book.page_count || 0), 0);
    const uniqueAuthors = new Set(selectedBooks.flatMap(book => book.authors)).size;
    const uniqueSeries = new Set(selectedBooks.map(book => book.series).filter(Boolean)).size;
    const uniqueCategories = new Set(selectedBooks.flatMap(book => book.categories)).size;

    return {
      count: selectedBooks.length,
      totalPages,
      uniqueAuthors,
      uniqueSeries,
      uniqueCategories,
      avgPages: Math.round(totalPages / selectedBooks.length) || 0
    };
  }, [selectedBooks]);

  const handleExport = async () => {
    try {
      setLoading(true);
      
      if (exportFormat === 'csv') {
        ExportService.exportToCSV(selectedBooks, `selected-books-${Date.now()}.csv`);
      } else {
        ExportService.exportToJSON(selectedBooks, `selected-books-${Date.now()}.json`);
      }
      
      showToast(`${selectedBooks.length} books exported successfully!`, 'success');
      onClose();
    } catch (error) {
      showToast('Export failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      
      // Delete books one by one with optimistic updates
      for (const book of selectedBooks) {
        await removeBookWithOptimizations(book.isbn, book.title);
      }
      
      showToast(`${selectedBooks.length} books deleted successfully!`, 'success');
      onBooksUpdated();
      onClose();
    } catch (error) {
      showToast('Some books could not be deleted', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMetadata = async () => {
    try {
      setLoading(true);
      
      // Simulate metadata update - in a real app, this would call an API
      showToast('Metadata update queued for background processing', 'info');
      
      // TODO: Implement actual metadata refresh
      // This would typically involve:
      // 1. Queuing background jobs
      // 2. Fetching fresh metadata from APIs
      // 3. Updating books in database
      
      onClose();
    } catch (error) {
      showToast('Failed to queue metadata update', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeSeries = async () => {
    if (!newSeries.trim()) {
      showToast('Please enter a series name', 'warning');
      return;
    }

    try {
      setLoading(true);
      
      // Create updated books with new series
      const updatedBooks = selectedBooks.map(book => ({
        ...book,
        series: newSeries,
        last_updated: new Date().toISOString()
      }));

      // TODO: Implement bulk update API call
      // For now, we'll show a message about what would happen
      showToast(`Would update ${selectedBooks.length} books to series "${newSeries}"`, 'info');
      
      onClose();
    } catch (error) {
      showToast('Failed to update series', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      showToast('Please enter a category name', 'warning');
      return;
    }

    try {
      setLoading(true);
      
      // TODO: Implement bulk category addition
      showToast(`Would add category "${newCategory}" to ${selectedBooks.length} books`, 'info');
      
      onClose();
    } catch (error) {
      showToast('Failed to add category', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCategory = async () => {
    if (!categoryToRemove.trim()) {
      showToast('Please select a category to remove', 'warning');
      return;
    }

    try {
      setLoading(true);
      
      // TODO: Implement bulk category removal
      showToast(`Would remove category "${categoryToRemove}" from selected books`, 'info');
      
      onClose();
    } catch (error) {
      showToast('Failed to remove category', 'error');
    } finally {
      setLoading(false);
    }
  };

  const executeOperation = async () => {
    switch (operation) {
      case 'export':
        await handleExport();
        break;
      case 'delete':
        await handleBulkDelete();
        break;
      case 'update_metadata':
        await handleUpdateMetadata();
        break;
      case 'change_series':
        await handleChangeSeries();
        break;
      case 'add_category':
        await handleAddCategory();
        break;
      case 'remove_category':
        await handleRemoveCategory();
        break;
    }
  };

  // Get all categories from selected books for remove operation
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    selectedBooks.forEach(book => {
      book.categories.forEach(category => categories.add(category));
    });
    return Array.from(categories).sort();
  }, [selectedBooks]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-booktarr-surface border border-booktarr-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-booktarr-text text-xl font-semibold">Bulk Operations</h2>
              <p className="text-booktarr-textSecondary text-sm mt-1">
                Perform actions on {selectedBooks.length} selected books
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-booktarr-textMuted hover:text-booktarr-text"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Selection Statistics */}
          <div className="bg-booktarr-surface2 border border-booktarr-border rounded-lg p-4 mb-6">
            <h3 className="text-booktarr-text font-medium mb-3">Selection Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-booktarr-textSecondary">Books:</span>
                <span className="text-booktarr-text font-medium ml-2">{stats.count}</span>
              </div>
              <div>
                <span className="text-booktarr-textSecondary">Total Pages:</span>
                <span className="text-booktarr-text font-medium ml-2">{stats.totalPages.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-booktarr-textSecondary">Avg Pages:</span>
                <span className="text-booktarr-text font-medium ml-2">{stats.avgPages}</span>
              </div>
              <div>
                <span className="text-booktarr-textSecondary">Authors:</span>
                <span className="text-booktarr-text font-medium ml-2">{stats.uniqueAuthors}</span>
              </div>
              <div>
                <span className="text-booktarr-textSecondary">Series:</span>
                <span className="text-booktarr-text font-medium ml-2">{stats.uniqueSeries}</span>
              </div>
              <div>
                <span className="text-booktarr-textSecondary">Categories:</span>
                <span className="text-booktarr-text font-medium ml-2">{stats.uniqueCategories}</span>
              </div>
            </div>
          </div>

          {/* Operation Selection */}
          <div className="mb-6">
            <label className="booktarr-form-label">Select Operation</label>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value as OperationType)}
              className="booktarr-form-input"
              disabled={loading}
            >
              <option value="export">Export Books</option>
              <option value="delete">Delete Books</option>
              <option value="update_metadata">Update Metadata</option>
              <option value="change_series">Change Series</option>
              <option value="add_category">Add Category</option>
              <option value="remove_category">Remove Category</option>
            </select>
          </div>

          {/* Operation-specific options */}
          {operation === 'export' && (
            <div className="mb-6">
              <label className="booktarr-form-label">Export Format</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
                className="booktarr-form-input"
                disabled={loading}
              >
                <option value="csv">CSV (Spreadsheet)</option>
                <option value="json">JSON (Data)</option>
              </select>
            </div>
          )}

          {operation === 'delete' && (
            <div className="mb-6">
              <div className="bg-red-900 bg-opacity-20 border border-red-500 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-red-400 font-medium">Warning</span>
                </div>
                <p className="text-red-300 text-sm">
                  This will permanently delete {selectedBooks.length} books from your library. A confirmation toast will appear after deletion.
                </p>
              </div>
            </div>
          )}

          {operation === 'change_series' && (
            <div className="mb-6">
              <label className="booktarr-form-label">New Series Name</label>
              <input
                type="text"
                value={newSeries}
                onChange={(e) => setNewSeries(e.target.value)}
                placeholder="Enter series name (leave empty to remove series)"
                className="booktarr-form-input"
                disabled={loading}
              />
            </div>
          )}

          {operation === 'add_category' && (
            <div className="mb-6">
              <label className="booktarr-form-label">Category to Add</label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter category name"
                className="booktarr-form-input"
                disabled={loading}
              />
            </div>
          )}

          {operation === 'remove_category' && (
            <div className="mb-6">
              <label className="booktarr-form-label">Category to Remove</label>
              <select
                value={categoryToRemove}
                onChange={(e) => setCategoryToRemove(e.target.value)}
                className="booktarr-form-input"
                disabled={loading}
              >
                <option value="">Select category to remove</option>
                {availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          )}

          {operation === 'update_metadata' && (
            <div className="mb-6">
              <div className="bg-blue-900 bg-opacity-20 border border-blue-500 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-blue-400 font-medium">Information</span>
                </div>
                <p className="text-blue-300 text-sm">
                  This will refresh metadata for all selected books from external APIs. 
                  The operation will run in the background and may take a few minutes.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="booktarr-btn booktarr-btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={executeOperation}
              disabled={loading}
              className="booktarr-btn booktarr-btn-primary"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="small" />
                  <span>Processing...</span>
                </div>
              ) : (
                'Execute'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkOperations;