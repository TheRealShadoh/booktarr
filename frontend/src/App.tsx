/**
 * Main App component with TypeScript and enhanced functionality
 */
import React, { useState, useEffect } from 'react';
import BookList from './components/BookList';
import IndividualBooksPage from './components/IndividualBooksPage';
import SearchBar from './components/SearchBar';
import SettingsPage from './components/SettingsPage';
import SeriesPage from './components/SeriesPage';
import AuthorsPage from './components/AuthorsPage';
import LoadingSpinner from './components/LoadingSpinner';
import Toast from './components/Toast';
import MainLayout from './components/MainLayout';
import MetadataEnhancementPage from './components/MetadataEnhancementPage';
import { booktarrAPI } from './services/api';
import { 
  BooksBySeriesMap, 
  Settings, 
  SettingsUpdateRequest,
  UrlValidationResponse
} from './types';
import './styles/tailwind.css';

type CurrentPage = 'library' | 'settings' | 'series' | 'authors' | 'wanted' | 'activity' | 'logs' | 'enhancement';

interface AppState {
  books: BooksBySeriesMap;
  filteredBooks: BooksBySeriesMap;
  settings: Settings;
  loading: boolean;
  settingsLoading: boolean;
  error: string | null;
  currentPage: CurrentPage;
}

function App() {
  console.log('App component mounting...');
  const [state, setState] = useState<AppState>({
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
    loading: true,
    settingsLoading: false,
    error: null,
    currentPage: 'library',
  });

  // Add error boundary functionality
  const [hasError, setHasError] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  
  // Handle uncaught errors
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Global error:', error);
      setHasError(true);
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event);
      setHasError(true);
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    console.log('App useEffect - calling loadInitialData');
    loadInitialData();
  }, []);
  
  // Debug useEffect to track state changes
  useEffect(() => {
    console.log('App state changed:', {
      loading: state.loading,
      error: state.error,
      booksCount: Object.keys(state.books).length,
      currentPage: state.currentPage
    });
  }, [state.loading, state.error, state.books, state.currentPage]);

  // Render error boundary UI if there's a critical error
  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
          <p className="text-gray-300 mb-4">The application encountered an error.</p>
          <button
            onClick={() => {
              setHasError(false);
              window.location.reload();
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  const loadInitialData = async () => {
    try {
      console.log('Loading initial data...');
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Load settings first - this should always work
      let settingsData: Settings;
      try {
        settingsData = await booktarrAPI.getSettings();
        console.log('Settings loaded:', settingsData);
      } catch (settingsError) {
        console.error('Failed to load settings:', settingsError);
        // Use default settings if API fails
        settingsData = {
          skoolib_url: undefined,
          google_books_api_key: undefined,
          open_library_api_key: undefined,
          cache_ttl: 3600,
          enable_price_lookup: true,
          default_language: 'en',
        };
      }
      
      // Try to load books, but don't fail if it doesn't work
      let booksData = { series: {}, total_books: 0, total_series: 0, last_sync: new Date().toISOString() };
      try {
        booksData = await booktarrAPI.getBooks();
        console.log('Books loaded:', booksData);
      } catch (booksError) {
        console.error('Failed to load books:', booksError);
        // Continue with empty books data - user can try refresh later
      }

      setState(prev => ({
        ...prev,
        settings: settingsData,
        books: booksData.series || {},
        filteredBooks: booksData.series || {},
        loading: false,
        error: null, // Clear any previous errors since we recovered
      }));
      
      console.log('Initial data loaded successfully');
    } catch (error) {
      console.error('Critical failure loading initial data:', error);
      // Even if everything fails, we should still render the UI
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Unable to connect to server. Settings and refresh options are still available.',
        // Ensure we have some basic settings so the UI can render
        settings: {
          skoolib_url: undefined,
          google_books_api_key: undefined,
          open_library_api_key: undefined,
          cache_ttl: 3600,
          enable_price_lookup: true,
          default_language: 'en',
        },
        books: {},
        filteredBooks: {},
      }));
    }
  };

  const loadBooks = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const data = await booktarrAPI.getBooks();
      setState(prev => ({
        ...prev,
        books: data.series,
        filteredBooks: data.series,
        loading: false,
      }));
      
      setToast({ message: 'Library refreshed successfully!', type: 'success' });
    } catch (error) {
      console.error('Failed to load books:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load books';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  };

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, filteredBooks: prev.books }));
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

    setState(prev => ({ ...prev, filteredBooks: filtered }));
  };

  const handleUpdateSettings = async (settingsData: SettingsUpdateRequest): Promise<void> => {
    try {
      setState(prev => ({ ...prev, settingsLoading: true }));
      
      const response = await booktarrAPI.updateSettings(settingsData);
      
      setState(prev => ({
        ...prev,
        settings: response.settings,
        settingsLoading: false,
      }));
      
      setToast({ message: 'Settings updated successfully!', type: 'success' });
    } catch (error) {
      setState(prev => ({ ...prev, settingsLoading: false }));
      console.error('Failed to update settings:', error);
      throw error;
    }
  };

  const handleValidateUrl = async (url: string): Promise<UrlValidationResponse> => {
    try {
      return await booktarrAPI.validateUrl({ url });
    } catch (error) {
      console.error('Failed to validate URL:', error);
      throw error;
    }
  };

  const setCurrentPage = (page: CurrentPage) => {
    setState(prev => ({ ...prev, currentPage: page }));
  };

  const renderCurrentPage = () => {
    switch (state.currentPage) {
      case 'library':
        return (
          <IndividualBooksPage
            books={state.filteredBooks}
            loading={state.loading}
            error={state.error}
            onRefresh={loadBooks}
          />
        );
      case 'series':
        return (
          <SeriesPage
            books={state.filteredBooks}
            loading={state.loading}
            error={state.error}
            onRefresh={loadBooks}
          />
        );
      case 'authors':
        return (
          <AuthorsPage
            books={state.filteredBooks}
            loading={state.loading}
            error={state.error}
            onRefresh={loadBooks}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            settings={state.settings}
            onUpdateSettings={handleUpdateSettings}
            onValidateUrl={handleValidateUrl}
            loading={state.settingsLoading}
            error={state.error}
          />
        );
      case 'enhancement':
        return <MetadataEnhancementPage />;
      case 'wanted':
      case 'activity':
      case 'logs':
        return (
          <div className="flex flex-col justify-center items-center h-64 space-y-4">
            <div className="text-center">
              <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-booktarr-text text-xl font-semibold mb-2">{state.currentPage.charAt(0).toUpperCase() + state.currentPage.slice(1)}</h3>
              <p className="text-booktarr-textSecondary text-sm max-w-md">
                This page is coming soon. Stay tuned for updates!
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen overflow-hidden">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <MainLayout
        currentPage={state.currentPage}
        onPageChange={setCurrentPage}
        books={Object.values(state.books).flat()}
        onFilterChange={(filteredBooks) => {
          // Convert filtered books back to series format
          const filteredSeries: BooksBySeriesMap = {};
          filteredBooks.forEach(book => {
            const seriesName = book.series || 'Standalone';
            if (!filteredSeries[seriesName]) {
              filteredSeries[seriesName] = [];
            }
            filteredSeries[seriesName].push(book);
          });
          setState(prev => ({ ...prev, filteredBooks: filteredSeries }));
        }}
      >
        {renderCurrentPage()}
      </MainLayout>
    </div>
  );
}

export default App;