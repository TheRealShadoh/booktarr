/**
 * Enhanced SeriesGroup component with TypeScript and improved styling
 */
import React, { useState } from 'react';
import BookCard from './BookCard';
import { SeriesGroupProps } from '../types';

const SeriesGroup: React.FC<SeriesGroupProps> = ({ 
  seriesName, 
  books, 
  expanded = true,
  onToggle 
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  
  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggle?.(seriesName);
  };

  const sortedBooks = [...books].sort((a, b) => {
    // Sort by series position first, then by title
    if (a.series_position && b.series_position) {
      return a.series_position - b.series_position;
    }
    if (a.series_position && !b.series_position) return -1;
    if (!a.series_position && b.series_position) return 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="mb-6 bg-gray-900 rounded-lg overflow-hidden shadow-lg">
      <div 
        onClick={toggleExpanded}
        className="bg-gray-800 p-4 cursor-pointer hover:bg-gray-700 transition-colors duration-200 border-b border-gray-600"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl text-white font-bold flex items-center">
            <span 
              className="mr-3 text-purple-400 transition-transform duration-200 text-sm"
              style={{
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
              }}
            >
              ▶
            </span>
            {seriesName}
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400 bg-gray-700 px-2 py-1 rounded">
              {books.length} book{books.length !== 1 ? 's' : ''}
            </span>
            {books.some(book => book.series_position) && (
              <span className="text-xs text-purple-300 bg-purple-900/30 px-2 py-1 rounded">
                Series
              </span>
            )}
          </div>
        </div>
        
        {/* Quick preview of first few books when collapsed */}
        {!isExpanded && books.length > 0 && (
          <div className="mt-2 flex items-center space-x-2 text-sm text-gray-400">
            <span>Books:</span>
            <span className="truncate">
              {sortedBooks.slice(0, 3).map(book => book.title).join(', ')}
              {books.length > 3 && ` +${books.length - 3} more`}
            </span>
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className="p-4 space-y-3 bg-gray-900">
          {sortedBooks.map(book => (
            <BookCard key={book.isbn} book={book} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SeriesGroup;