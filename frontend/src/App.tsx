/**
 * Main App component with TypeScript and enhanced functionality
 */
import React, { useState, useEffect } from 'react';
import BookList from './components/BookList';
import SearchBar from './components/SearchBar';
import SettingsPage from './components/SettingsPage';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import Toast from './components/Toast';
import { booktarrAPI } from './services/api';
import { 
  BooksBySeriesMap, 
  Settings, 
  SettingsUpdateRequest,
  UrlValidationResponse,
  APIError 
} from './types';
import './styles/tailwind.css';

type CurrentPage = 'library' | 'settings';

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
  const [state, setState] = useState<AppState>({
    books: {},
    filteredBooks: {},
    settings: {
      skoolib_url: undefined,
      google_books_api_key: undefined,
      cache_ttl: 3600,
      enable_price_lookup: true,
      default_language: 'en',
    },
    loading: true,
    settingsLoading: false,
    error: null,
    currentPage: 'library',
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Load settings and books in parallel
      const [settingsData, booksData] = await Promise.all([
        booktarrAPI.getSettings(),
        booktarrAPI.getTestBooks()
      ]);

      setState(prev => ({
        ...prev,
        settings: settingsData,
        books: booksData.series,
        filteredBooks: booksData.series,
        loading: false,
      }));
    } catch (error) {
      console.error('Failed to load initial data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  };

  const loadBooks = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const data = await booktarrAPI.getTestBooks();
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
          <BookList
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
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <header className="bg-gray-800 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-white">
              📚 Booktarr
            </h1>
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage('library')}
                  className={`px-4 py-2 rounded transition-colors ${
                    state.currentPage === 'library'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Library
                </button>
                <button
                  onClick={() => setCurrentPage('settings')}
                  className={`px-4 py-2 rounded transition-colors ${
                    state.currentPage === 'settings'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Settings
                </button>
              </nav>
              {state.currentPage === 'library' && (
                <button
                  onClick={loadBooks}
                  disabled={state.loading}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-600 transition-colors"
                >
                  {state.loading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="small" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    'Refresh'
                  )}
                </button>
              )}
            </div>
          </div>
          
          {state.currentPage === 'library' && (
            <SearchBar onSearch={handleSearch} />
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {renderCurrentPage()}
      </main>

      <footer className="bg-gray-800 mt-12 py-4">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>Booktarr - Your personal book library management system</p>
        </div>
      </footer>
    </div>
  );
}

export default App;