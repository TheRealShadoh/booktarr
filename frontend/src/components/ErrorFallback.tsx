/**
 * Default Error Fallback UI Component
 * Professional error display with recovery options
 */
import React from 'react';
import { ErrorFallbackProps, ErrorRecoveryAction } from '../types';

interface ExtendedErrorFallbackProps extends ErrorFallbackProps {
  recoveryActions?: ErrorRecoveryAction[];
  showDetails?: boolean;
}

const ErrorFallback: React.FC<ExtendedErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  errorBoundaryName,
  timestamp,
  recoveryActions = [],
  showDetails = false,
}) => {
  const [showDetailedError, setShowDetailedError] = React.useState(showDetails);
  const [copied, setCopied] = React.useState(false);

  const isDevelopment = process.env.NODE_ENV === 'development';

  const copyErrorToClipboard = async () => {
    if (!error) return;
    
    const errorText = `BookTarr Error Report
    
Error: ${error.message}
Error Boundary: ${errorBoundaryName || 'Unknown'}
Timestamp: ${timestamp?.toISOString() || new Date().toISOString()}
URL: ${window.location.href}

Stack Trace:
${error.stack}

Component Stack:
${errorInfo?.componentStack || 'Not available'}`;

    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const getErrorIcon = () => (
    <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  );

  const getActionButtonClass = (variant: ErrorRecoveryAction['variant']) => {
    const baseClass = 'px-4 py-2 rounded-lg font-medium transition-colors duration-200 ';
    
    switch (variant) {
      case 'primary':
        return baseClass + 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900';
      case 'secondary':
        return baseClass + 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900';
      case 'danger':
        return baseClass + 'bg-red-600 hover:bg-red-700 text-white focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900';
      default:
        return baseClass + 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        {/* Error Icon */}
        {getErrorIcon()}
        
        {/* Error Title */}
        <h1 className="text-2xl font-bold text-white mb-2">
          Oops! Something went wrong
        </h1>
        
        {/* Error Description */}
        <p className="text-gray-300 mb-6">
          We're sorry, but something unexpected happened. The application encountered an error and needs to recover.
        </p>

        {/* Error Boundary Info (Development) */}
        {isDevelopment && errorBoundaryName && (
          <div className="bg-gray-700 rounded p-3 mb-4 text-sm text-left">
            <p className="text-yellow-400 font-semibold mb-1">Development Info:</p>
            <p className="text-gray-300">Error Boundary: {errorBoundaryName}</p>
            {timestamp && (
              <p className="text-gray-300">Time: {timestamp.toLocaleString()}</p>
            )}
          </div>
        )}

        {/* Error Message (if available) */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded p-3 mb-4 text-left">
            <p className="text-red-400 font-semibold text-sm mb-1">Error Details:</p>
            <p className="text-red-200 text-sm break-words">{error.message}</p>
          </div>
        )}

        {/* Recovery Actions */}
        {recoveryActions.length > 0 && (
          <div className="space-y-2 mb-6">
            {recoveryActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={`w-full ${getActionButtonClass(action.variant)}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Error Details Toggle (Development/Debug) */}
        {(isDevelopment || showDetails) && error && (
          <div className="border-t border-gray-700 pt-4">
            <button
              onClick={() => setShowDetailedError(!showDetailedError)}
              className="text-gray-400 hover:text-gray-300 text-sm mb-2 flex items-center mx-auto"
            >
              <svg
                className={`w-4 h-4 mr-1 transform transition-transform ${
                  showDetailedError ? 'rotate-90' : ''
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {showDetailedError ? 'Hide' : 'Show'} Technical Details
            </button>

            {showDetailedError && (
              <div className="bg-gray-700 rounded p-3 text-left">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300 text-sm font-semibold">Technical Information</span>
                  <button
                    onClick={copyErrorToClipboard}
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-gray-400">Message:</span>
                    <pre className="text-gray-200 mt-1 p-2 bg-gray-800 rounded overflow-auto">
                      {error.message}
                    </pre>
                  </div>
                  
                  {error.stack && (
                    <div>
                      <span className="text-gray-400">Stack Trace:</span>
                      <pre className="text-gray-200 mt-1 p-2 bg-gray-800 rounded overflow-auto max-h-32">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  
                  {errorInfo?.componentStack && (
                    <div>
                      <span className="text-gray-400">Component Stack:</span>
                      <pre className="text-gray-200 mt-1 p-2 bg-gray-800 rounded overflow-auto max-h-32">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-gray-500 text-sm">
            If this problem persists, please contact support or report this error.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;