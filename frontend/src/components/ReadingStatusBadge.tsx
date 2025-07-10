/**
 * Reading Status Badge Component
 * Shows the current reading status of a book with appropriate styling
 */
import React from 'react';
import { ReadingStatus } from '../types';

interface ReadingStatusBadgeProps {
  status: ReadingStatus;
  className?: string;
  showIcon?: boolean;
}

const ReadingStatusBadge: React.FC<ReadingStatusBadgeProps> = ({ 
  status, 
  className = '',
  showIcon = true 
}) => {
  const getStatusConfig = (status: ReadingStatus) => {
    switch (status) {
      case ReadingStatus.UNREAD:
        return {
          label: 'Unread',
          icon: '📚',
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          textColor: 'text-gray-700 dark:text-gray-300',
          borderColor: 'border-gray-300 dark:border-gray-600'
        };
      case ReadingStatus.READING:
        return {
          label: 'Reading',
          icon: '📖',
          bgColor: 'bg-blue-100 dark:bg-blue-900',
          textColor: 'text-blue-700 dark:text-blue-300',
          borderColor: 'border-blue-300 dark:border-blue-600'
        };
      case ReadingStatus.READ:
        return {
          label: 'Read',
          icon: '✅',
          bgColor: 'bg-green-100 dark:bg-green-900',
          textColor: 'text-green-700 dark:text-green-300',
          borderColor: 'border-green-300 dark:border-green-600'
        };
      case ReadingStatus.WISHLIST:
        return {
          label: 'Wishlist',
          icon: '⭐',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900',
          textColor: 'text-yellow-700 dark:text-yellow-300',
          borderColor: 'border-yellow-300 dark:border-yellow-600'
        };
      case ReadingStatus.DNF:
        return {
          label: 'Did Not Finish',
          icon: '⏹️',
          bgColor: 'bg-red-100 dark:bg-red-900',
          textColor: 'text-red-700 dark:text-red-300',
          borderColor: 'border-red-300 dark:border-red-600'
        };
      default:
        return {
          label: 'Unknown',
          icon: '❓',
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          textColor: 'text-gray-700 dark:text-gray-300',
          borderColor: 'border-gray-300 dark:border-gray-600'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`
        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
        border ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${className}
      `}
    >
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </span>
  );
};

export default ReadingStatusBadge;