/**
 * Main App component with React Router and comprehensive error boundaries
 * Now uses proper URL-based routing with React Router DOM
 */
import React, { useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
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

// Router-aware App component that uses URL-based navigation
const AppInner: React.FC = () => {
  const {
    state,
    showToast,
    clearToast,
    loadBooks,
    undo,
    redo,
    getPerformanceMetrics
  } = useStateManager();

  const navigate = useNavigate();
  const location = useLocation();
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
    console.error('Current Page:', location.pathname);
    console.error('Timestamp:', new Date().toISOString());
    console.groupEnd();
    
    // Mark error as handled to prevent global error handler from showing toast
    (error as any).handledByErrorBoundary = true;
    
    // Show user-friendly toast
    showToast('A component error was recovered. If this continues, please refresh the page.', 'warning');
  }, [location.pathname, showToast]);

  // Global keyboard shortcuts with React Router navigation
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
            navigate('/');
            break;
          case 's':
            event.preventDefault();
            navigate('/settings');
            break;
          case 'n':
            event.preventDefault();
            navigate('/add');
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
              navigate('/error-boundary-test');
            }
            break;
        }
      }

      // Handle escape key to close modals or go back
      if (event.key === 'Escape') {
        if (location.pathname.includes('/book/') || location.pathname.includes('/series/')) {
          navigate('/');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, undo, redo, location.pathname]);

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
    navigate(`/book/${isbn}`);
  }, [navigate]);

  const handleBackToLibrary = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleSeriesClick = useCallback((seriesName: string) => {
    navigate(`/series/${encodeURIComponent(seriesName)}`);
  }, [navigate]);

  // Get current page from URL for MainLayout
  const getCurrentPage = useCallback(() => {
    const path = location.pathname;
    if (path === '/') return 'library';
    if (path === '/settings') return 'settings';
    if (path === '/add') return 'add';
    if (path === '/series') return 'series-management';
    if (path === '/analytics') return 'analytics';
    if (path === '/wanted') return 'wanted';
    if (path === '/collections') return 'collections';
    if (path === '/advanced-search') return 'advanced-search';
    if (path === '/recommendations') return 'recommendations';
    if (path === '/challenges') return 'challenges';
    if (path === '/activity') return 'activity';
    if (path === '/logs') return 'logs';
    if (path === '/release-calendar') return 'release-calendar';
    if (path.startsWith('/book/')) return 'book-details';
    if (path.startsWith('/series/')) return 'series-details';
    if (path === '/error-boundary-test') return 'error-boundary-test';
    return 'library';
  }, [location.pathname]);

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

      {/* Main Layout with Routes */}
      <ErrorBoundary 
        name="MainLayout" 
        onError={reportError}
      >
        <MainLayout
          currentPage={getCurrentPage()}
          onPageChange={(page) => {
            // Map page names to routes
            switch (page) {
              case 'library': navigate('/'); break;
              case 'settings': navigate('/settings'); break;
              case 'add': navigate('/add'); break;
              case 'series-management': navigate('/series'); break;
              case 'analytics': navigate('/analytics'); break;
              case 'wanted': navigate('/wanted'); break;
              case 'collections': navigate('/collections'); break;
              case 'advanced-search': navigate('/advanced-search'); break;
              case 'recommendations': navigate('/recommendations'); break;
              case 'challenges': navigate('/challenges'); break;
              case 'activity': navigate('/activity'); break;
              case 'logs': navigate('/logs'); break;
              case 'release-calendar': navigate('/release-calendar'); break;
              default: navigate('/'); break;
            }
          }}
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
            navigate('/add');
          }, [navigate])}
        >
          <Routes>
            <Route path="/" element={
              <PageErrorBoundary 
                pageName="Book Library" 
                onNavigateBack={() => navigate('/')}
              >
                <BookList
                  books={state.filteredBooks}
                  loading={state.loading}
                  error={state.error}
                  onRefresh={loadBooks}
                  onBookClick={handleBookClick}
                />
              </PageErrorBoundary>
            } />
            
            <Route path="/book/:isbn" element={
              <PageErrorBoundary 
                pageName="Book Details" 
                onNavigateBack={() => navigate('/')}
              >
                <BookDetailsPageWrapper 
                  onBack={handleBackToLibrary}
                  onSeriesClick={handleSeriesClick}
                />
              </PageErrorBoundary>
            } />
            
            <Route path="/settings" element={
              <PageErrorBoundary 
                pageName="Settings" 
                onNavigateBack={() => navigate('/')}
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
            } />
            
            <Route path="/add" element={
              <PageErrorBoundary 
                pageName="Add Book" 
                onNavigateBack={() => navigate('/')}
              >
                <BookSearchPage onBookAdded={loadBooks} initialSearchQuery={searchQuery} />
              </PageErrorBoundary>
            } />
            
            <Route path="/wanted" element={
              <PageErrorBoundary 
                pageName="Wanted Books" 
                onNavigateBack={() => navigate('/')}
              >
                <WantedPage
                  books={state.filteredBooks}
                  loading={state.loading}
                  error={state.error}
                  onRefresh={loadBooks}
                  onBookClick={handleBookClick}
                />
              </PageErrorBoundary>
            } />
            
            <Route path="/collections" element={
              <PageErrorBoundary 
                pageName="Collections" 
                onNavigateBack={() => navigate('/')}
              >
                <CollectionsPage
                  books={state.filteredBooks}
                  loading={state.loading}
                  error={state.error}
                  onRefresh={loadBooks}
                  onBookClick={handleBookClick}
                />
              </PageErrorBoundary>
            } />
            
            <Route path="/advanced-search" element={
              <PageErrorBoundary 
                pageName="Advanced Search" 
                onNavigateBack={() => navigate('/')}
              >
                <AdvancedSearchPage
                  books={state.filteredBooks}
                  loading={state.loading}
                  error={state.error}
                  onBookClick={handleBookClick}
                />
              </PageErrorBoundary>
            } />
            
            <Route path="/analytics" element={
              <PageErrorBoundary 
                pageName="Analytics Dashboard" 
                onNavigateBack={() => navigate('/')}
              >
                <StatsDashboard />
              </PageErrorBoundary>
            } />
            
            <Route path="/recommendations" element={
              <PageErrorBoundary 
                pageName="Recommendations" 
                onNavigateBack={() => navigate('/')}
              >
                <RecommendationsPage
                  books={state.filteredBooks}
                  loading={state.loading}
                  error={state.error}
                  onBookClick={handleBookClick}
                />
              </PageErrorBoundary>
            } />
            
            <Route path="/challenges" element={
              <PageErrorBoundary 
                pageName="Reading Challenges" 
                onNavigateBack={() => navigate('/')}
              >
                <ReadingChallengesPage
                  books={state.filteredBooks}
                  loading={state.loading}
                  error={state.error}
                />
              </PageErrorBoundary>
            } />
            
            <Route path="/series" element={
              <PageErrorBoundary 
                pageName="Series Management" 
                onNavigateBack={() => navigate('/')}
              >
                <SeriesManagement />
              </PageErrorBoundary>
            } />
            
            <Route path="/series/:seriesName" element={
              <PageErrorBoundary 
                pageName="Series Details" 
                onNavigateBack={() => navigate('/series')}
              >
                <SeriesDetailsPageWrapper 
                  onBack={() => navigate('/series')}
                  onBookClick={handleBookClick}
                  ownedBooks={Object.values(state.filteredBooks).flat()}
                />
              </PageErrorBoundary>
            } />
            
            <Route path="/activity" element={
              <PageErrorBoundary 
                pageName="Reading Activity" 
                onNavigateBack={() => navigate('/')}
              >
                <ReadingTimelinePage
                  books={state.filteredBooks}
                  loading={state.loading}
                  error={state.error}
                  onBookClick={handleBookClick}
                />
              </PageErrorBoundary>
            } />
            
            <Route path="/logs" element={
              <PageErrorBoundary 
                pageName="System Logs" 
                onNavigateBack={() => navigate('/')}
              >
                <LogsPage />
              </PageErrorBoundary>
            } />
            
            <Route path="/release-calendar" element={
              <PageErrorBoundary 
                pageName="Release Calendar" 
                onNavigateBack={() => navigate('/')}
              >
                <ReleaseCalendarPage
                  books={Object.values(state.filteredBooks).flat()}
                  loading={state.loading}
                  error={state.error}
                />
              </PageErrorBoundary>
            } />
            
            {process.env.NODE_ENV === 'development' && (
              <Route path="/error-boundary-test" element={
                <PageErrorBoundary 
                  pageName="Error Boundary Test" 
                  onNavigateBack={() => navigate('/')}
                >
                  <ErrorBoundaryTestPage />
                </PageErrorBoundary>
              } />
            )}
            
            {/* Redirect unknown routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainLayout>
      </ErrorBoundary>
    </div>
  );
};

// Wrapper components to handle URL parameters
const BookDetailsPageWrapper: React.FC<{
  onBack: () => void;
  onSeriesClick: (seriesName: string) => void;
}> = ({ onBack, onSeriesClick }) => {
  const { isbn } = useParams<{ isbn: string }>();
  return (
    <BookDetailsPage
      isbn={isbn}
      onBack={onBack}
      onSeriesClick={onSeriesClick}
    />
  );
};

const SeriesDetailsPageWrapper: React.FC<{
  onBack: () => void;
  onBookClick: (book: any) => void;
  ownedBooks: any[];
}> = ({ onBack, onBookClick, ownedBooks }) => {
  const { seriesName } = useParams<{ seriesName: string }>();
  return seriesName ? (
    <SeriesDetailsPage
      seriesName={decodeURIComponent(seriesName)}
      ownedBooks={ownedBooks}
      onBack={onBack}
      onBookClick={onBookClick}
    />
  ) : null;
};

// Main App component with BrowserRouter, Provider and Top-level Error Boundary
const App: React.FC = () => {
  return (
    <BrowserRouter>
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
          <AppInner />
        </AppProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;