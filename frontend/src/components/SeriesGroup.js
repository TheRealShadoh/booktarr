import React, { useState } from 'react';
import BookCard from './BookCard';

const SeriesGroup = ({ series }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="mb-6 bg-sonarr-darker rounded-lg overflow-hidden">
      <div 
        onClick={toggleExpanded}
        className="bg-sonarr-darker p-4 cursor-pointer hover:bg-gray-900 transition-colors duration-200 border-b border-gray-700"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl text-white font-bold flex items-center">
            <span className="mr-3 text-sonarr-accent transition-transform duration-200" style={{
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
            }}>
              ▶
            </span>
            {series.series_name}
          </h2>
          <span className="text-sm text-gray-400 bg-gray-800 px-2 py-1 rounded">
            {series.books.length} book{series.books.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 space-y-3 bg-gray-900">
          {series.books.map(book => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SeriesGroup;