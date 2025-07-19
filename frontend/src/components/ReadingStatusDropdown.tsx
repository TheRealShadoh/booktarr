/**
 * Reading Status Dropdown Component
 * Allows users to change the reading status of a book
 */
import React, { useState, useRef, useEffect } from 'react';
import { ReadingStatus } from '../types';
import ReadingStatusBadge from './ReadingStatusBadge';

interface ReadingStatusDropdownProps {
  currentStatus: ReadingStatus;
  onStatusChange: (status: ReadingStatus) => void;
  disabled?: boolean;
  className?: string;
}

const ReadingStatusDropdown: React.FC<ReadingStatusDropdownProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const statusOptions = [
    ReadingStatus.UNREAD,
    ReadingStatus.READING,
    ReadingStatus.READ,
    ReadingStatus.WISHLIST,
    ReadingStatus.DNF
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusSelect = (status: ReadingStatus) => {
    onStatusChange(status);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className={`
          flex items-center justify-between w-full px-3 py-2 
          bg-white dark:bg-gray-800 
          border border-gray-300 dark:border-gray-600 
          rounded-lg shadow-sm 
          hover:bg-gray-50 dark:hover:bg-gray-700 
          focus:outline-none focus:ring-2 focus:ring-booktarr-accent focus:border-transparent
          transition-colors duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <ReadingStatusBadge status={currentStatus} className="mr-2" />
        
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {statusOptions.map((status) => (
            <button
              key={status}
              type="button"
              className={`
                w-full px-3 py-2 text-left 
                hover:bg-gray-50 dark:hover:bg-gray-700 
                focus:bg-gray-50 dark:focus:bg-gray-700 
                focus:outline-none
                transition-colors duration-150
                ${status === currentStatus ? 'bg-booktarr-accent bg-opacity-10' : ''}
                first:rounded-t-lg last:rounded-b-lg
              `}
              onClick={() => handleStatusSelect(status)}
              role="option"
              aria-selected={status === currentStatus}
            >
              <ReadingStatusBadge status={status} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReadingStatusDropdown;