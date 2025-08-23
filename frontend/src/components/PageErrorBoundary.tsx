/**
 * Page-level Error Boundary Component
 * Specialized error boundary for page-level components with navigation recovery
 */
import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { ErrorFallbackProps } from '../types';

interface PageErrorFallbackProps extends ErrorFallbackProps {
  pageName?: string;
  onNavigateBack?: () => void;
}

const PageErrorFallback: React.FC<PageErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  errorBoundaryName,
  timestamp,
  pageName = 'this page',
  onNavigateBack,
}) => {
  const handleRetry = () => {
    if (resetError) {
      resetError();
    }
  };

  const handleGoBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      window.history.back();
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-900 p-4">
      <div className="max-w-lg w-full bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        {/* Page Error Icon */}
        <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        
        {/* Error Title */}
        <h2 className="text-xl font-bold text-white mb-2">
          Unable to load {pageName}
        </h2>
        
        {/* Error Description */}
        <p className="text-gray-300 mb-4">
          We encountered an error while trying to load this page. The rest of the application should still work normally.
        </p>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded p-3 mb-4 text-left">
            <p className="text-red-200 text-sm break-words">{error.message}</p>
          </div>
        )}

        {/* Recovery Actions */}
        <div className="space-y-2">
          <button
            onClick={handleRetry}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={handleGoBack}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Go Back
            </button>
            
            <button
              onClick={handleGoHome}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Home
            </button>
          </div>
        </div>

        {/* Reload Option */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <button
            onClick={handleReload}
            className="text-gray-400 hover:text-gray-300 text-sm underline"
          >
            Reload the entire page
          </button>
        </div>
      </div>
    </div>
  );
};

interface PageErrorBoundaryProps {
  children: React.ReactNode;
  pageName?: string;
  onNavigateBack?: () => void;
}

const PageErrorBoundary: React.FC<PageErrorBoundaryProps> = ({
  children,
  pageName,
  onNavigateBack,
  ...props
}) => {
  return (
    <ErrorBoundary
      name={`PageErrorBoundary-${pageName || 'Unknown'}`}
      fallback={(errorProps) => (
        <PageErrorFallback
          {...errorProps}
          pageName={pageName}
          onNavigateBack={onNavigateBack}
        />
      )}
      {...props}
    >
      {children}
    </ErrorBoundary>
  );
};

export default PageErrorBoundary;