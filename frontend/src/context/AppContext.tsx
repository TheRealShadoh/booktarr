/**
 * Global application context for state management
 * Provides centralized state management with Context API
 */
import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { BooksBySeriesMap, Settings, Book } from '../types';
import { booktarrAPI } from '../services/api';

// Types
export type CurrentPage = 'library' | 'settings' | 'series' | 'authors' | 'wanted' | 'activity' | 'logs' | 'enhancement' | 'add' | 'stats' | 'backup' | 'import' | 'collections' | 'advanced-search' | 'bulk-edit' | 'analytics' | 'book-details';

export interface AppState {
  // Core data
  books: BooksBySeriesMap;
  filteredBooks: BooksBySeriesMap;
  settings: Settings;
  
  // UI state
  currentPage: CurrentPage;
  loading: boolean;
  settingsLoading: boolean;
  error: string | null;
  
  // Toast notifications
  toast: {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    id: string;
  } | null;
  
  // Search state
  searchQuery: string;
  searchLoading: boolean;
  searchResults: any[];
  
  // Cache information
  cacheStats: any;
  
  // Undo/Redo
  history: AppState[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

// Action types
export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SETTINGS_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_PAGE'; payload: CurrentPage }
  | { type: 'SET_BOOKS'; payload: BooksBySeriesMap }
  | { type: 'SET_FILTERED_BOOKS'; payload: BooksBySeriesMap }
  | { type: 'SET_SETTINGS'; payload: Settings }
  | { type: 'ADD_BOOK'; payload: Book }
  | { type: 'REMOVE_BOOK'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SEARCH_LOADING'; payload: boolean }
  | { type: 'SET_SEARCH_RESULTS'; payload: any[] }
  | { type: 'SET_TOAST'; payload: AppState['toast'] }
  | { type: 'CLEAR_TOAST' }
  | { type: 'SET_CACHE_STATS'; payload: any }
  | { type: 'PUSH_HISTORY'; payload: Partial<AppState> }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET_HISTORY' };

// Initial state
const initialState: AppState = {
  books: {},
  filteredBooks: {},
  settings: {
    skoolib_url: undefined,
    google_books_api_key: undefined,
    open_library_api_key: undefined,
    cache_ttl: 3600,
    enable_price_lookup: true,
    default_language: 'en',
  },
  currentPage: 'library',
  loading: true,
  settingsLoading: false,
  error: null,
  toast: null,
  searchQuery: '',
  searchLoading: false,
  searchResults: [],
  cacheStats: null,
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_SETTINGS_LOADING':
      return { ...state, settingsLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    
    case 'SET_BOOKS':
      return { 
        ...state, 
        books: action.payload,
        filteredBooks: state.searchQuery ? state.filteredBooks : action.payload
      };
    
    case 'SET_FILTERED_BOOKS':
      return { ...state, filteredBooks: action.payload };
    
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    
    case 'ADD_BOOK': {
      const book = action.payload;
      const seriesName = book.series || 'Standalone';
      const newBooks = { ...state.books };
      
      if (!newBooks[seriesName]) {
        newBooks[seriesName] = [];
      }
      
      // Check if book already exists
      const existingBookIndex = newBooks[seriesName].findIndex(b => b.isbn === book.isbn);
      if (existingBookIndex === -1) {
        newBooks[seriesName].push(book);
        // Sort by series position if available
        newBooks[seriesName].sort((a, b) => (a.series_position || 0) - (b.series_position || 0));
      }
      
      return {
        ...state,
        books: newBooks,
        filteredBooks: state.searchQuery ? state.filteredBooks : newBooks
      };
    }
    
    case 'REMOVE_BOOK': {
      const isbn = action.payload;
      const newBooks = { ...state.books };
      
      // Find and remove the book
      Object.keys(newBooks).forEach(seriesName => {
        newBooks[seriesName] = newBooks[seriesName].filter(book => book.isbn !== isbn);
        // Remove empty series
        if (newBooks[seriesName].length === 0) {
          delete newBooks[seriesName];
        }
      });
      
      return {
        ...state,
        books: newBooks,
        filteredBooks: state.searchQuery ? state.filteredBooks : newBooks
      };
    }
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_SEARCH_LOADING':
      return { ...state, searchLoading: action.payload };
    
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload };
    
    case 'SET_TOAST':
      return { ...state, toast: action.payload };
    
    case 'CLEAR_TOAST':
      return { ...state, toast: null };
    
    case 'SET_CACHE_STATS':
      return { ...state, cacheStats: action.payload };
    
    case 'PUSH_HISTORY': {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({ ...state, ...action.payload });
      
      // Limit history size
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      return {
        ...state,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        canUndo: true,
        canRedo: false
      };
    }
    
    case 'UNDO': {
      if (state.historyIndex > 0) {
        const prevState = state.history[state.historyIndex - 1];
        return {
          ...state,
          ...prevState,
          historyIndex: state.historyIndex - 1,
          canUndo: state.historyIndex > 1,
          canRedo: true
        };
      }
      return state;
    }
    
    case 'REDO': {
      if (state.historyIndex < state.history.length - 1) {
        const nextState = state.history[state.historyIndex + 1];
        return {
          ...state,
          ...nextState,
          historyIndex: state.historyIndex + 1,
          canUndo: true,
          canRedo: state.historyIndex < state.history.length - 2
        };
      }
      return state;
    }
    
    case 'RESET_HISTORY':
      return {
        ...state,
        history: [],
        historyIndex: -1,
        canUndo: false,
        canRedo: false
      };
    
    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Convenience methods
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentPage: (page: CurrentPage) => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  clearToast: () => void;
  
  // Data methods
  loadBooks: () => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  addBook: (book: Book) => void;
  removeBook: (isbn: string) => void;
  
  // Search methods
  setSearchQuery: (query: string) => void;
  performSearch: (query: string) => void;
  
  // History methods
  undo: () => void;
  redo: () => void;
  pushHistory: (changes: Partial<AppState>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Convenience methods
  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const setCurrentPage = (page: CurrentPage) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Date.now().toString();
    dispatch({ type: 'SET_TOAST', payload: { message, type, id } });
    
    // Auto-clear toast after 5 seconds
    setTimeout(() => {
      dispatch({ type: 'CLEAR_TOAST' });
    }, 5000);
  };

  const clearToast = () => {
    dispatch({ type: 'CLEAR_TOAST' });
  };

  // Data methods
  const loadBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await booktarrAPI.getBooks();
      dispatch({ type: 'SET_BOOKS', payload: data.series });
      
      showToast('Library loaded successfully!', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load books';
      setError(errorMessage);
      showToast(`Failed to load library: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      dispatch({ type: 'SET_SETTINGS_LOADING', payload: true });
      
      const settings = await booktarrAPI.getSettings();
      dispatch({ type: 'SET_SETTINGS', payload: settings });
    } catch (error) {
      console.error('Failed to load settings:', error);
      showToast('Failed to load settings', 'error');
    } finally {
      dispatch({ type: 'SET_SETTINGS_LOADING', payload: false });
    }
  };

  const updateSettings = async (settingsUpdate: Partial<Settings>) => {
    try {
      dispatch({ type: 'SET_SETTINGS_LOADING', payload: true });
      
      const response = await booktarrAPI.updateSettings(settingsUpdate);
      dispatch({ type: 'SET_SETTINGS', payload: response.settings });
      
      showToast('Settings updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to update settings:', error);
      showToast('Failed to update settings', 'error');
      throw error;
    } finally {
      dispatch({ type: 'SET_SETTINGS_LOADING', payload: false });
    }
  };

  const addBook = (book: Book) => {
    // Push to history before making changes
    pushHistory({ books: state.books });
    dispatch({ type: 'ADD_BOOK', payload: book });
  };

  const removeBook = (isbn: string) => {
    // Push to history before making changes
    pushHistory({ books: state.books });
    dispatch({ type: 'REMOVE_BOOK', payload: isbn });
  };

  // Search methods
  const setSearchQuery = (query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  };

  const performSearch = (query: string) => {
    if (!query.trim()) {
      dispatch({ type: 'SET_FILTERED_BOOKS', payload: state.books });
      return;
    }

    const filtered: BooksBySeriesMap = {};
    const queryLower = query.toLowerCase();

    Object.entries(state.books).forEach(([seriesName, books]) => {
      const matchingBooks = books.filter(book => 
        book.title.toLowerCase().includes(queryLower) ||
        book.authors.some(author => author.toLowerCase().includes(queryLower)) ||
        (book.series && book.series.toLowerCase().includes(queryLower)) ||
        book.isbn.includes(query) ||
        book.categories.some(category => category.toLowerCase().includes(queryLower))
      );
      
      if (matchingBooks.length > 0) {
        filtered[seriesName] = matchingBooks;
      }
    });

    dispatch({ type: 'SET_FILTERED_BOOKS', payload: filtered });
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  };

  // History methods
  const undo = () => {
    dispatch({ type: 'UNDO' });
  };

  const redo = () => {
    dispatch({ type: 'REDO' });
  };

  const pushHistory = (changes: Partial<AppState>) => {
    dispatch({ type: 'PUSH_HISTORY', payload: changes });
  };

  // Initialize data on mount
  useEffect(() => {
    const initializeApp = async () => {
      await Promise.all([loadBooks(), loadSettings()]);
    };
    
    initializeApp();
  }, []);

  // Context value
  const contextValue: AppContextType = {
    state,
    dispatch,
    
    // Convenience methods
    setLoading,
    setError,
    setCurrentPage,
    showToast,
    clearToast,
    
    // Data methods
    loadBooks,
    loadSettings,
    updateSettings,
    addBook,
    removeBook,
    
    // Search methods
    setSearchQuery,
    performSearch,
    
    // History methods
    undo,
    redo,
    pushHistory,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Export context for advanced usage
export { AppContext };