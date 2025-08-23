/**
 * Component-level Error Boundary Component
 * Lightweight error boundary for individual components with minimal UI disruption
 */
import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { ErrorFallbackProps } from '../types';

interface ComponentErrorFallbackProps extends ErrorFallbackProps {
  componentName?: string;
  showMinimal?: boolean;
  onHideComponent?: () => void;
}

const ComponentErrorFallback: React.FC<ComponentErrorFallbackProps> = ({
  error,
  resetError,
  errorBoundaryName,
  componentName = 'component',
  showMinimal = true,
  onHideComponent,
}) => {
  const handleRetry = () => {
    if (resetError) {
      resetError();
    }
  };

  const handleHide = () => {
    if (onHideComponent) {
      onHideComponent();
    }
  };

  // Minimal fallback for non-critical components
  if (showMinimal) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-gray-300 text-sm font-medium">
            Unable to load {componentName}
          </span>
        </div>
        
        <div className="flex justify-center space-x-2">
          <button
            onClick={handleRetry}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
          >
            Retry
          </button>
          
          {onHideComponent && (
            <button
              onClick={handleHide}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
            >
              Hide
            </button>
          )}
        </div>
      </div>
    );
  }

  // Detailed fallback for critical components
  return (
    <div className="bg-red-900/10 border border-red-500/30 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <h3 className="text-red-400 font-semibold">Component Error</h3>
      </div>
      
      <p className="text-red-200 text-sm mb-3">
        The {componentName} component encountered an error and cannot be displayed.
      </p>

      {error && (
        <div className="bg-red-950/50 border border-red-500/50 rounded p-2 mb-3">
          <p className="text-red-300 text-xs break-words">{error.message}</p>
        </div>
      )}
      
      <div className="flex space-x-2">
        <button
          onClick={handleRetry}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          Try Again
        </button>
        
        {onHideComponent && (
          <button
            onClick={handleHide}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
          >
            Hide Component
          </button>
        )}
      </div>
    </div>
  );
};

interface ComponentErrorBoundaryProps {
  children: React.ReactNode;
  componentName?: string;
  showMinimal?: boolean;
  onHideComponent?: () => void;
  fallbackComponent?: React.ComponentType<any>;
}

const ComponentErrorBoundary: React.FC<ComponentErrorBoundaryProps> = ({
  children,
  componentName,
  showMinimal = true,
  onHideComponent,
  fallbackComponent: CustomFallback,
  ...props
}) => {
  return (
    <ErrorBoundary
      name={`ComponentErrorBoundary-${componentName || 'Unknown'}`}
      fallback={CustomFallback || ((errorProps) => (
        <ComponentErrorFallback
          {...errorProps}
          componentName={componentName}
          showMinimal={showMinimal}
          onHideComponent={onHideComponent}
        />
      ))}
      isolate={true}
      {...props}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ComponentErrorBoundary;