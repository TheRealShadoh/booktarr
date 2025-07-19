/**
 * Hook for optimistic updates to provide better UX
 * Immediately updates UI while API call is in progress
 */
import { useCallback, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Book } from '../types';
import { booktarrAPI } from '../services/api';

interface OptimisticUpdate {
  id: string;
  type: 'add' | 'remove' | 'update';
  data: any;
  timestamp: number;
  rollback: () => void;
}

export const useOptimisticUpdates = () => {
  const { state, dispatch, showToast, addBook, removeBook } = useAppContext();
  const pendingUpdates = useRef<Map<string, OptimisticUpdate>>(new Map());

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  /**
   * Optimistically add a book to the library
   */
  const optimisticAddBook = useCallback(async (book: Book, source?: string) => {
    const updateId = generateId();
    
    // Immediately add to UI
    addBook(book);
    
    // Store rollback function
    const rollback = () => {
      removeBook(book.isbn);
    };
    
    pendingUpdates.current.set(updateId, {
      id: updateId,
      type: 'add',
      data: book,
      timestamp: Date.now(),
      rollback
    });

    try {
      // Make API call
      const response = await fetch('/api/library/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isbn: book.isbn,
          source: source,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add book');
      }

      const result = await response.json();
      
      // Success - remove from pending updates
      pendingUpdates.current.delete(updateId);
      
      // Show appropriate success message
      if (result.already_exists) {
        showToast(`"${book.title}" is already in your library`, 'info');
      } else {
        showToast(`"${book.title}" added to library successfully!`, 'success');
      }
      
      return result;
    } catch (error) {
      // Rollback the optimistic update
      rollback();
      pendingUpdates.current.delete(updateId);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to add book';
      showToast(`Failed to add "${book.title}": ${errorMessage}`, 'error');
      throw error;
    }
  }, [addBook, removeBook, showToast]);

  /**
   * Optimistically remove a book from the library
   */
  const optimisticRemoveBook = useCallback(async (isbn: string, bookTitle: string) => {
    const updateId = generateId();
    
    // Find the book before removing it
    let removedBook: Book | null = null;
    let fromSeries = '';
    
    Object.entries(state.books).forEach(([seriesName, books]) => {
      const book = books.find(b => b.isbn === isbn);
      if (book) {
        removedBook = book;
        fromSeries = seriesName;
      }
    });
    
    if (!removedBook) {
      showToast('Book not found in library', 'error');
      return;
    }
    
    // Immediately remove from UI
    removeBook(isbn);
    
    // Store rollback function
    const rollback = () => {
      addBook(removedBook!);
    };
    
    pendingUpdates.current.set(updateId, {
      id: updateId,
      type: 'remove',
      data: { isbn, book: removedBook, fromSeries },
      timestamp: Date.now(),
      rollback
    });

    try {
      // Make API call
      const response = await fetch(`/api/library/${isbn}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to remove book');
      }

      // Success - remove from pending updates
      pendingUpdates.current.delete(updateId);
      showToast(`"${bookTitle}" removed from library`, 'success');
      
    } catch (error) {
      // Rollback the optimistic update
      rollback();
      pendingUpdates.current.delete(updateId);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove book';
      showToast(`Failed to remove "${bookTitle}": ${errorMessage}`, 'error');
      throw error;
    }
  }, [state.books, addBook, removeBook, showToast]);

  /**
   * Optimistically update settings
   */
  const optimisticUpdateSettings = useCallback(async (settingsUpdate: any) => {
    const updateId = generateId();
    const originalSettings = { ...state.settings };
    
    // Immediately update UI
    dispatch({ type: 'SET_SETTINGS', payload: { ...state.settings, ...settingsUpdate } });
    
    // Store rollback function
    const rollback = () => {
      dispatch({ type: 'SET_SETTINGS', payload: originalSettings });
    };
    
    pendingUpdates.current.set(updateId, {
      id: updateId,
      type: 'update',
      data: { original: originalSettings, update: settingsUpdate },
      timestamp: Date.now(),
      rollback
    });

    try {
      // Make API call
      const response = await booktarrAPI.updateSettings(settingsUpdate);
      
      // Success - remove from pending updates and update with server response
      pendingUpdates.current.delete(updateId);
      dispatch({ type: 'SET_SETTINGS', payload: response.settings });
      showToast('Settings updated successfully!', 'success');
      
      return response;
    } catch (error) {
      // Rollback the optimistic update
      rollback();
      pendingUpdates.current.delete(updateId);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
      showToast(`Failed to update settings: ${errorMessage}`, 'error');
      throw error;
    }
  }, [state.settings, dispatch, showToast]);

  /**
   * Rollback all pending updates (useful for offline scenarios)
   */
  const rollbackAllPending = useCallback(() => {
    pendingUpdates.current.forEach(update => {
      update.rollback();
    });
    pendingUpdates.current.clear();
    showToast('All pending changes have been rolled back', 'warning');
  }, [showToast]);

  /**
   * Get information about pending updates
   */
  const getPendingUpdates = useCallback(() => {
    return Array.from(pendingUpdates.current.values());
  }, []);

  /**
   * Check if there are any pending updates
   */
  const hasPendingUpdates = useCallback(() => {
    return pendingUpdates.current.size > 0;
  }, []);

  /**
   * Clean up old pending updates (older than 30 seconds)
   */
  const cleanupOldUpdates = useCallback(() => {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds
    
    pendingUpdates.current.forEach((update, id) => {
      if (now - update.timestamp > maxAge) {
        update.rollback();
        pendingUpdates.current.delete(id);
      }
    });
  }, []);

  return {
    optimisticAddBook,
    optimisticRemoveBook,
    optimisticUpdateSettings,
    rollbackAllPending,
    getPendingUpdates,
    hasPendingUpdates,
    cleanupOldUpdates,
  };
};

export default useOptimisticUpdates;