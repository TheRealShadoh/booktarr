/**
 * Reading Progress Bar Component
 * Shows reading progress with percentage and page information
 */
import React from 'react';

interface ReadingProgressBarProps {
  currentPage?: number;
  totalPages?: number;
  percentage?: number;
  className?: string;
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const ReadingProgressBar: React.FC<ReadingProgressBarProps> = ({
  currentPage,
  totalPages,
  percentage,
  className = '',
  showText = true,
  size = 'medium'
}) => {
  // Calculate percentage if not provided but pages are available
  const calculatedPercentage = percentage || 
    (currentPage && totalPages && totalPages > 0 ? 
      Math.min(100, Math.max(0, (currentPage / totalPages) * 100)) : 0);

  const sizeClasses = {
    small: 'h-1',
    medium: 'h-2',
    large: 'h-3'
  };

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  // Don't render if no progress data
  if (calculatedPercentage === 0 && !currentPage) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      {showText && (
        <div className={`flex justify-between items-center mb-1 ${textSizeClasses[size]} text-gray-600 dark:text-gray-400`}>
          <span>
            {currentPage && totalPages ? (
              `Page ${currentPage} of ${totalPages}`
            ) : (
              'Reading Progress'
            )}
          </span>
          <span>{Math.round(calculatedPercentage)}%</span>
        </div>
      )}
      
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`bg-gradient-to-r from-booktarr-accent to-purple-600 ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, calculatedPercentage))}%` }}
        />
      </div>
      
      {showText && calculatedPercentage > 0 && calculatedPercentage < 100 && (
        <div className={`mt-1 ${textSizeClasses[size]} text-gray-500 dark:text-gray-500 text-center`}>
          {calculatedPercentage < 10 ? 'Just started' :
           calculatedPercentage < 30 ? 'Getting into it' :
           calculatedPercentage < 60 ? 'Making progress' :
           calculatedPercentage < 90 ? 'Almost there!' :
           'Nearly finished!'}
        </div>
      )}
    </div>
  );
};

export default ReadingProgressBar;