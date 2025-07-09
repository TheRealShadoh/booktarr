/**
 * Error message component with retry functionality
 */
import React from 'react';
import { ErrorMessageProps, APIError } from '../types';

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onRetry }) => {
  const getErrorMessage = (err: string | APIError): string => {
    if (typeof err === 'string') {
      return err;
    }
    return err.message || 'An unexpected error occurred';
  };

  const getErrorDetails = (err: string | APIError): string | undefined => {
    if (typeof err === 'string') {
      return undefined;
    }
    return err.detail;
  };

  const getStatusCode = (err: string | APIError): number | undefined => {
    if (typeof err === 'string') {
      return undefined;
    }
    return err.status;
  };

  const errorMessage = getErrorMessage(error);
  const errorDetails = getErrorDetails(error);
  const statusCode = getStatusCode(error);

  return (
    <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 max-w-md mx-auto">
      <div className="flex items-center space-x-2 mb-2">
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <h3 className="text-red-400 font-semibold">Error</h3>
        {statusCode && (
          <span className="text-red-300 text-sm bg-red-800/50 px-2 py-1 rounded">
            {statusCode}
          </span>
        )}
      </div>
      
      <p className="text-red-200 mb-3">{errorMessage}</p>
      
      {errorDetails && (
        <details className="text-red-300 text-sm mb-3">
          <summary className="cursor-pointer hover:text-red-200">
            Show details
          </summary>
          <pre className="mt-2 p-2 bg-red-950/50 rounded text-xs overflow-auto">
            {errorDetails}
          </pre>
        </details>
      )}
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors text-sm font-medium"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;