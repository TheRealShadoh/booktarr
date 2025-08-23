/**
 * Main App component with enhanced state management and comprehensive error boundaries
 * Now uses Context API with optimistic updates, caching, keyboard shortcuts, and production-level error handling
 */
import React, { useEffect, useCallback, useMemo } from 'react';
import BookList from './components/BookList';
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
import ReleaseCalendarPage from './components/ReleaseCalendarPage';
import ErrorBoundary from './components/ErrorBoundary';
import PageErrorBoundary from './components/PageErrorBoundary';
import ComponentErrorBoundary from './components/ComponentErrorBoundary';
import ErrorBoundaryTestPage from './components/ErrorBoundaryTestPage';
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
    getPerformanceMetrics
  } = useStateManager();

  const [selectedBookISBN, setSelectedBookISBN] = React.useState<string | null>(null);
  const [selectedSeriesName, setSelectedSeriesName] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>('');


  // Handle uncaught errors
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Global error:', error);
      // Check if error was already handled by error boundary
      if (!(error.error as any)?.handledByErrorBoundary) {
        showToast('An unexpected error occurred. Please try refreshing the page.', 'error');
      }
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event);
      
      // More specific error messages based on rejection reason
      let errorMessage = 'An unexpected error occurred.';
      
      if (event.reason?.message) {
        if (event.reason.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (event.reason.message.includes('API')) {
          errorMessage = 'API error. Please try again in a moment.';
        }
      }
      
      showToast(errorMessage, 'error');
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [showToast]);

  // Error reporting helper
  const reportError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.group('🚨 Error Boundary Report');
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Current Page:', state.currentPage);
    console.error('Timestamp:', new Date().toISOString());
    console.groupEnd();
    
    // Mark error as handled to prevent global error handler from showing toast
    (error as any).handledByErrorBoundary = true;
    
    // Show user-friendly toast
    showToast('A component error was recovered. If this continues, please refresh the page.', 'warning');
  }, [state.currentPage, showToast]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement || 
          (event.target as HTMLElement)?.contentEditable === 'true') {
        return;
      }

      // Check for Ctrl/Cmd key combinations
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      if (isCtrlOrCmd) {
        switch (event.key.toLowerCase()) {
          case 'l':
            event.preventDefault();
            setCurrentPage('library');
            break;
          case 's':
            event.preventDefault();
            setCurrentPage('settings');
            break;
          case 'n':
            event.preventDefault();
            setCurrentPage('add');
            break;
          case 'f':
            event.preventDefault();
            // Focus search input if available
            const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
            }
            break;
          case 'z':
            if (!event.shiftKey) {
              event.preventDefault();
              undo();
            }
            break;
          case 'y':
            event.preventDefault();
            redo();
            break;
          case 'e':
            // Ctrl+E for Error Boundary Test Page (development only)
            if (process.env.NODE_ENV === 'development') {
              event.preventDefault();
              setCurrentPage('error-boundary-test');
            }
            break;
        }
      }

      // Handle escape key to close modals or go back
      if (event.key === 'Escape') {
        if (state.currentPage === 'book-details' || state.currentPage === 'series-details') {
          setCurrentPage('library');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setCurrentPage, undo, redo, state.currentPage]);

  // Performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      const metrics = getPerformanceMetrics();
      console.log('Performance metrics:', metrics);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [getPerformanceMetrics]);

  const handleBookClick = useCallback((book: any) => {
    const isbn = book.isbn || book.isbn_13 || book.isbn_10;
    setSelectedBookISBN(isbn);
    setCurrentPage('book-details');
  }, [setCurrentPage]);

  const handleBackToLibrary = useCallback(() => {
    setSelectedBookISBN(null);
    setCurrentPage('library');
  }, [setCurrentPage]);

  const handleSeriesClick = useCallback((seriesName: string) => {
    setSelectedSeriesName(seriesName);
    setCurrentPage('series-details');
  }, [setCurrentPage]);

  const renderCurrentPage = useMemo(() => {
    
    switch (state.currentPage) {
      case 'library':
        return (
          <PageErrorBoundary 
            pageName="Book Library" 
            onNavigateBack={() => setCurrentPage('library')}
          >
            <BookList
              books={state.filteredBooks}
              loading={state.loading}
              error={state.error}
              onRefresh={loadBooks}
              onBookClick={handleBookClick}
            />
          </PageErrorBoundary>
        );
      case 'book-details':
        return (
          <PageErrorBoundary 
            pageName="Book Details" 
            onNavigateBack={handleBackToLibrary}
          >
            <BookDetailsPage
              isbn={selectedBookISBN || undefined}
              onBack={handleBackToLibrary}
              onSeriesClick={handleSeriesClick}
            />
          </PageErrorBoundary>
        );
      case 'settings':
        return (
          <PageErrorBoundary 
            pageName="Settings" 
            onNavigateBack={() => setCurrentPage('library')}
          >
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
          </PageErrorBoundary>
        );
      case 'add':
        return (
          <PageErrorBoundary 
            pageName="Add Book" 
            onNavigateBack={() => setCurrentPage('library')}
          >
            <BookSearchPage onBookAdded={loadBooks} initialSearchQuery={searchQuery} />
          </PageErrorBoundary>
        );
      case 'wanted':
        return (
          <PageErrorBoundary 
            pageName="Wanted Books" 
            onNavigateBack={() => setCurrentPage('library')}
          >
            <WantedPage
              books={state.filteredBooks}
              loading={state.loading}
              error={state.error}
              onRefresh={loadBooks}
              onBookClick={handleBookClick}
            />
          </PageErrorBoundary>
        );
      case 'collections':
        return (
          <PageErrorBoundary 
            pageName="Collections" 
            onNavigateBack={() => setCurrentPage('library')}
          >
            <CollectionsPage
              books={state.filteredBooks}
              loading={state.loading}
              error={state.error}
              onRefresh={loadBooks}
              onBookClick={handleBookClick}
            />
          </PageErrorBoundary>
        );
      case 'advanced-search':
        return (
          <PageErrorBoundary 
            pageName="Advanced Search" 
            onNavigateBack={() => setCurrentPage('library')}
          >
            <AdvancedSearchPage
              books={state.filteredBooks}
              loading={state.loading}
              error={state.error}
              onBookClick={handleBookClick}
            />
          </PageErrorBoundary>
        );
      case 'analytics':
        return (
          <PageErrorBoundary 
            pageName="Analytics Dashboard" 
            onNavigateBack={() => setCurrentPage('library')}
          >
            <StatsDashboard />
          </PageErrorBoundary>
        );
      case 'recommendations':
        return (
          <PageErrorBoundary 
            pageName="Recommendations" 
            onNavigateBack={() => setCurrentPage('library')}
          >
            <RecommendationsPage
              books={state.filteredBooks}
              loading={state.loading}
              error={state.error}
              onBookClick={handleBookClick}
            />
          </PageErrorBoundary>
        );
      case 'challenges':
        return (
          <PageErrorBoundary 
            pageName="Reading Challenges" 
            onNavigateBack={() => setCurrentPage('library')}
          >
            <ReadingChallengesPage
              books={state.filteredBooks}
              loading={state.loading}
              error={state.error}
            />
          </PageErrorBoundary>
        );
      case 'series-management':
        return (
          <PageErrorBoundary 
            pageName="Series Management" 
            onNavigateBack={() => setCurrentPage('library')}
          >
            <SeriesManagement />
          </PageErrorBoundary>
        );
      case 'series-details':
        return selectedSeriesName ? (
          <PageErrorBoundary 
            pageName="Series Details" 
            onNavigateBack={() => {
              setSelectedSeriesName(null);
              setCurrentPage('library');
            }}
          >
            <SeriesDetailsPage
              seriesName={selectedSeriesName}
              ownedBooks={Object.values(state.filteredBooks).flat()}
              onBack={() => {
                setSelectedSeriesName(null);
                setCurrentPage('library');
              }}
              onBookClick={handleBookClick}
            />
          </PageErrorBoundary>
        ) : (
          <PageErrorBoundary 
            pageName="Series Management" 
            onNavigateBack={() => setCurrentPage('library')}
          >
            <SeriesManagement />
          </PageErrorBoundary>
        );
      case 'activity':
        return (
          <PageErrorBoundary 
            pageName="Reading Activity" 
            onNavigateBack={() => setCurrentPage('library')}
          >
            <ReadingTimelinePage
              books={state.filteredBooks}
              loading={state.loading}
              error={state.error}
              onBookClick={handleBookClick}
            />
          </PageErrorBoundary>
        );
      case 'logs':
        return (
          <PageErrorBoundary 
            pageName="System Logs" 
            onNavigateBack={() => setCurrentPage('library')}
          >
            <LogsPage />
          </PageErrorBoundary>
        );
      case 'release-calendar':
        return (
          <PageErrorBoundary 
            pageName="Release Calendar" 
            onNavigateBack={() => setCurrentPage('library')}
          >
            <ReleaseCalendarPage
              books={Object.values(state.filteredBooks).flat()}
              loading={state.loading}
              error={state.error}
            />
          </PageErrorBoundary>
        );
      case 'error-boundary-test':
        return (
          <PageErrorBoundary 
            pageName="Error Boundary Test" 
            onNavigateBack={() => setCurrentPage('library')}
          >
            <ErrorBoundaryTestPage />
          </PageErrorBoundary>
        );
      default:
        // Fallback to library for unknown pages
        console.warn(`Unknown page: ${state.currentPage}, redirecting to library`);
        return (
          <PageErrorBoundary 
            pageName="Book Library" 
            onNavigateBack={() => setCurrentPage('library')}
          >
            <BookList
              books={state.filteredBooks}
              loading={state.loading}
              error={state.error}
              onRefresh={loadBooks}
              onBookClick={handleBookClick}
            />
          </PageErrorBoundary>
        );
    }
  }, [state.currentPage, state.filteredBooks, state.loading, state.error, state.settings, state.settingsLoading, selectedBookISBN, selectedSeriesName, handleBookClick, handleBackToLibrary, handleSeriesClick, loadBooks, searchQuery, setCurrentPage]);

  return (
    <div className="h-screen overflow-hidden">
      {/* PWA Components with Error Boundaries */}
      <ComponentErrorBoundary componentName="Offline Indicator" showMinimal={true}>
        <OfflineIndicator />
      </ComponentErrorBoundary>
      
      <ComponentErrorBoundary componentName="PWA Update Notification" showMinimal={true}>
        <PWAUpdateNotification />
      </ComponentErrorBoundary>
      
      <ComponentErrorBoundary componentName="PWA Install Prompt" showMinimal={true}>
        <PWAInstallPrompt />
      </ComponentErrorBoundary>
      
      {/* Toast Notifications with Error Boundary */}
      {state.toast && (
        <ComponentErrorBoundary componentName="Toast Notification" showMinimal={true}>
          <Toast
            message={state.toast.message}
            type={state.toast.type}
            onClose={clearToast}
          />
        </ComponentErrorBoundary>
      )}

      {/* Main Layout with Error Boundary */}
      <ErrorBoundary 
        name="MainLayout" 
        onError={reportError}
      >
        <MainLayout
          currentPage={state.currentPage}
          onPageChange={setCurrentPage}
          books={Object.values(state.books).flat()}
          onFilterChange={useCallback((filteredBooks) => {
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
          }, [])}
          onBookSelect={handleBookClick}
          onSearchAddBook={useCallback((query) => {
            setSearchQuery(query);
            setCurrentPage('add');
          }, [setCurrentPage])}
        >
          {renderCurrentPage}
        </MainLayout>
      </ErrorBoundary>
    </div>
  );
};

// Memoize the inner component to prevent unnecessary re-renders
const AppInnerMemoized = React.memo(AppInner);

// Main App component with Provider and Top-level Error Boundary
const App: React.FC = () => {
  return (
    <ErrorBoundary 
      name="App" 
      onError={(error, errorInfo) => {
        // Top-level error logging
        console.error('🚨 CRITICAL: Top-level app error:', error);
        console.error('Component Stack:', errorInfo.componentStack);
        
        // Store critical error for potential bug reporting
        try {
          const criticalError = {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            level: 'CRITICAL'
          };
          
          localStorage.setItem('booktarr_critical_error', JSON.stringify(criticalError));
        } catch (e) {
          console.warn('Failed to store critical error:', e);
        }
      }}
    >
      <AppProvider>
        <AppInnerMemoized />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
