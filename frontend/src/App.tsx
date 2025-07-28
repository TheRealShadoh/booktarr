/**
 * Main App component with enhanced state management
 * Now uses Context API with optimistic updates, caching, and keyboard shortcuts
 */
import React, { useEffect } from 'react';
import BookList from './components/BookList';
import IndividualBooksPage from './components/IndividualBooksPage';
import SettingsPage from './components/SettingsPage';
import WantedPage from './components/WantedPage';
import CollectionsPage from './components/CollectionsPage';
import AdvancedSearchPage from './components/AdvancedSearchPage';
import RecommendationsPage from './components/RecommendationsPage';
import ReadingChallengesPage from './components/ReadingChallengesPage';
import ReadingTimelinePage from './components/ReadingTimelinePage';
import Toast from './components/Toast';
import MainLayout from './components/MainLayout';
import BookSearchPage from './components/BookSearchPage';
import BookDetailsPage from './components/BookDetailsPage';
import StatsDashboard from './components/StatsDashboard';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import OfflineIndicator from './components/OfflineIndicator';
import PWAUpdateNotification from './components/PWAUpdateNotification';
import SeriesManagement from './components/SeriesManagement';
import SeriesDetailsPage from './components/SeriesDetailsPage';
import LogsPage from './components/LogsPage';
import { AppProvider } from './context/AppContext';
import { useStateManager } from './hooks/useStateManager';
import './styles/tailwind.css';

// Inner App component that uses the context
const AppInner: React.FC = () => {
  const {
    state,
    setCurrentPage,
    showToast,
    clearToast,
    loadBooks,
    undo,
    redo,
    getPerformanceMetrics,
    cleanup
  } = useStateManager();

  const [selectedBookISBN, setSelectedBookISBN] = React.useState<string | null>(null);
  const [selectedSeriesName, setSelectedSeriesName] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>('');


  // Handle uncaught errors
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Global error:', error);
      showToast('An unexpected error occurred', 'error');
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event);
      showToast('An unexpected error occurred', 'error');
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [showToast]);

  // Performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      const metrics = getPerformanceMetrics();
      console.log('Performance metrics:', metrics);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [getPerformanceMetrics]);

  const handleBookClick = (book: any) => {
    console.log('Book clicked:', book);
    console.log('Book ISBN:', book.isbn);
    console.log('Book ISBN13:', book.isbn_13);
    console.log('Book ISBN10:', book.isbn_10);
    
    const isbn = book.isbn || book.isbn_13 || book.isbn_10;
    console.log('Using ISBN:', isbn);
    console.log('Setting selectedBookISBN to:', isbn);
    console.log('Setting currentPage to: book-details');
    
    setSelectedBookISBN(isbn);
    setCurrentPage('book-details');
    
    console.log('State updates dispatched');
  };

  const handleBackToLibrary = () => {
    setSelectedBookISBN(null);
    setCurrentPage('library');
  };

  const handleSeriesClick = (seriesName: string) => {
    console.log('Series clicked:', seriesName);
    setSelectedSeriesName(seriesName);
    setCurrentPage('series-details');
  };

  const renderCurrentPage = () => {
    console.log('Rendering page:', state.currentPage, 'selectedBookISBN:', selectedBookISBN);
    
    switch (state.currentPage) {
      case 'library':
        return (
          <BookList
            books={state.filteredBooks}
            loading={state.loading}
            error={state.error}
            onRefresh={loadBooks}
            onBookClick={handleBookClick}
          />
        );
      case 'book-details':
        return (
          <BookDetailsPage
            isbn={selectedBookISBN || undefined}
            onBack={handleBackToLibrary}
            onSeriesClick={handleSeriesClick}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            settings={state.settings}
            onUpdateSettings={async (settings) => {
              // This will be handled by the enhanced settings update in the SettingsPage itself
              // No need to return anything as the interface expects Promise<void>
            }}
            onValidateUrl={async (url) => {
              // Placeholder for URL validation
              return { valid: true, message: 'URL is valid' };
            }}
            loading={state.settingsLoading}
            error={state.error}
          />
        );
      case 'add':
        return <BookSearchPage onBookAdded={loadBooks} initialSearchQuery={searchQuery} />;
      case 'wanted':
        return (
          <WantedPage
            books={state.filteredBooks}
            loading={state.loading}
            error={state.error}
            onRefresh={loadBooks}
            onBookClick={handleBookClick}
          />
        );
      case 'collections':
        return (
          <CollectionsPage
            books={state.filteredBooks}
            loading={state.loading}
            error={state.error}
            onRefresh={loadBooks}
            onBookClick={handleBookClick}
          />
        );
      case 'advanced-search':
        return (
          <AdvancedSearchPage
            books={state.filteredBooks}
            loading={state.loading}
            error={state.error}
            onBookClick={handleBookClick}
          />
        );
      case 'analytics':
        return <StatsDashboard />;
      case 'recommendations':
        return (
          <RecommendationsPage
            books={state.filteredBooks}
            loading={state.loading}
            error={state.error}
            onBookClick={handleBookClick}
          />
        );
      case 'challenges':
        return (
          <ReadingChallengesPage
            books={state.filteredBooks}
            loading={state.loading}
            error={state.error}
          />
        );
      case 'series-management':
        return <SeriesManagement />;
      case 'series-details':
        return selectedSeriesName ? (
          <SeriesDetailsPage
            seriesName={selectedSeriesName}
            ownedBooks={Object.values(state.filteredBooks).flat()}
            onBack={() => {
              setSelectedSeriesName(null);
              setCurrentPage('library');
            }}
            onBookClick={handleBookClick}
          />
        ) : (
          <SeriesManagement />
        );
      case 'activity':
        return (
          <ReadingTimelinePage
            books={state.filteredBooks}
            loading={state.loading}
            error={state.error}
            onBookClick={handleBookClick}
          />
        );
      case 'logs':
        return <LogsPage />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen overflow-hidden">
      {/* PWA Components */}
      <OfflineIndicator />
      <PWAUpdateNotification />
      <PWAInstallPrompt />
      
      {/* Toast Notifications */}
      {state.toast && (
        <Toast
          message={state.toast.message}
          type={state.toast.type}
          onClose={clearToast}
        />
      )}


      <MainLayout
        currentPage={state.currentPage}
        onPageChange={setCurrentPage}
        books={Object.values(state.books).flat()}
        onFilterChange={(filteredBooks) => {
          // Convert filtered books back to series format
          const filteredSeries: any = {};
          filteredBooks.forEach(book => {
            const seriesName = book.series || 'Standalone';
            if (!filteredSeries[seriesName]) {
              filteredSeries[seriesName] = [];
            }
            filteredSeries[seriesName].push(book);
          });
          // This will be handled by the search functionality in the context
        }}
        onBookSelect={handleBookClick}
        onSearchAddBook={(query) => {
          setSearchQuery(query);
          setCurrentPage('add');
        }}
      >
        {renderCurrentPage()}
      </MainLayout>
    </div>
  );
};

// Main App component with Provider
const App: React.FC = () => {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
};

export default App;