/**
 * Comprehensive Error Boundary Component
 * Provides production-level error handling and recovery for React components
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorBoundaryState, ErrorBoundaryProps } from '../types';

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
      timestamp: undefined,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorId = ErrorBoundary.generateErrorId();
    const timestamp = new Date();
    
    return {
      hasError: true,
      error,
      errorId,
      timestamp,
    };
  }

  private static generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    this.logError(error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.error('Error Boundary Name:', this.props.name || 'Unknown');
      console.groupEnd();
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.name || 'Unknown',
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    if (process.env.NODE_ENV === 'production') {
      console.error('Error captured by ErrorBoundary:', errorDetails);
    }

    try {
      const existingErrors = JSON.parse(sessionStorage.getItem('booktarr_errors') || '[]');
      existingErrors.push(errorDetails);
      const recentErrors = existingErrors.slice(-10);
      sessionStorage.setItem('booktarr_errors', JSON.stringify(recentErrors));
    } catch (e) {
      console.warn('Failed to store error in session storage:', e);
    }
  };

  private resetError = () => {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
      timestamp: undefined,
    });
  };

  private handleRetry = () => {
    this.resetError();
    this.resetTimeoutId = window.setTimeout(() => {
      this.forceUpdate();
    }, 100);
  };

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo, timestamp } = this.state;
      const { fallback: CustomFallback, name } = this.props;

      if (CustomFallback) {
        return (
          <CustomFallback
            error={error}
            errorInfo={errorInfo}
            resetError={this.resetError}
            errorBoundaryName={name}
            timestamp={timestamp}
          />
        );
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            
            <h1 className="text-2xl font-bold text-white mb-2">
              Oops! Something went wrong
            </h1>
            
            <p className="text-gray-300 mb-6">
              We're sorry, but something unexpected happened. The application encountered an error and needs to recover.
            </p>

            {process.env.NODE_ENV === 'development' && name && (
              <div className="bg-gray-700 rounded p-3 mb-4 text-sm text-left">
                <p className="text-yellow-400 font-semibold mb-1">Development Info:</p>
                <p className="text-gray-300">Error Boundary: {name}</p>
                {timestamp && (
                  <p className="text-gray-300">Time: {timestamp.toLocaleString()}</p>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded p-3 mb-4 text-left">
                <p className="text-red-400 font-semibold text-sm mb-1">Error Details:</p>
                <p className="text-red-200 text-sm break-words">{error.message}</p>
              </div>
            )}

            <div className="space-y-2 mb-6">
              <button
                onClick={this.handleRetry}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Reload Page
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Go Home
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700">
              <p className="text-gray-500 text-sm">
                If this problem persists, please contact support or report this error.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;