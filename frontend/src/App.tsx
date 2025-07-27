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
import { AppProvider } from './context/AppContext';
import { useStateManager } from './hooks/useStateManager';
import './styles/tailwind.css';

// Inner App component that uses the context
const AppInner: React.FC = () => {
  const {
    state,
    setCurrentPage,
    showToast,
    loadBooks,
    undo,
    redo,
    getPerformanceMetrics,
    cleanup
  } = useStateManager();

  const [selectedBookISBN, setSelectedBookISBN] = React.useState<string | null>(null);


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
        return <BookSearchPage onBookAdded={loadBooks} />;
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
        return (
          <div className="flex flex-col justify-center items-center h-64 space-y-4">
            <div className="text-center">
              <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-booktarr-text text-xl font-semibold mb-2">
                {state.currentPage.charAt(0).toUpperCase() + state.currentPage.slice(1)}
              </h3>
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
      {/* PWA Components */}
      <OfflineIndicator />
      <PWAUpdateNotification />
      <PWAInstallPrompt />
      
      {/* Toast Notifications */}
      {state.toast && (
        <Toast
          message={state.toast.message}
          type={state.toast.type}
          onClose={() => {
            // Toast will be cleared automatically
          }}
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