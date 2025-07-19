/**
 * Loading spinner component with different sizes and messages
 */
import React from 'react';
import { LoadingSpinnerProps } from '../types';

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  message = 'Loading...' 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
  };

  const containerClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-2 ${containerClasses[size]}`} data-testid="loading-spinner">
      <div className={`animate-spin rounded-full border-2 border-purple-200 border-t-purple-500 ${sizeClasses[size]}`} />
      {message && (
        <p className="text-gray-400 font-medium">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;