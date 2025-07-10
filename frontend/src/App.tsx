/**
 * Main App component with enhanced state management
 * Now uses Context API with optimistic updates, caching, and keyboard shortcuts
 */
import React, { useEffect } from 'react';
import IndividualBooksPage from './components/IndividualBooksPage';
import SettingsPage from './components/SettingsPage';
import SeriesPage from './components/SeriesPage';
import AuthorsPage from './components/AuthorsPage';
import Toast from './components/Toast';
import MainLayout from './components/MainLayout';
import MetadataEnhancementPage from './components/MetadataEnhancementPage';
import BookSearchPage from './components/BookSearchPage';
import StatsDashboard from './components/StatsDashboard';
import BackupRestore from './components/BackupRestore';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import OfflineIndicator from './components/OfflineIndicator';
import PWAUpdateNotification from './components/PWAUpdateNotification';
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
      case 'enhancement':
        return <MetadataEnhancementPage />;
      case 'add':
        return <BookSearchPage onBookAdded={loadBooks} />;
      case 'stats':
        return <StatsDashboard />;
      case 'backup':
        return <BackupRestore />;
      case 'wanted':
      case 'activity':
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

      {/* Undo/Redo Notification */}
      {(state.canUndo || state.canRedo) && (
        <div className="fixed bottom-4 right-4 z-50 bg-booktarr-surface border border-booktarr-border rounded-lg p-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <span className="text-booktarr-textSecondary text-sm">
              {state.canUndo && state.canRedo ? 'Undo/Redo available' : state.canUndo ? 'Undo available' : 'Redo available'}
            </span>
            <div className="flex space-x-1">
              {state.canUndo && (
                <button
                  onClick={undo}
                  className="p-1 text-booktarr-textMuted hover:text-booktarr-text transition-colors"
                  title="Undo (Ctrl+Z)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
              )}
              {state.canRedo && (
                <button
                  onClick={redo}
                  className="p-1 text-booktarr-textMuted hover:text-booktarr-text transition-colors"
                  title="Redo (Ctrl+Y)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
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