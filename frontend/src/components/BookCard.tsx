/**
 * Enhanced BookCard component with TypeScript and improved styling
 */
import React from 'react';
import { BookCardProps } from '../types';

const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  const defaultCover = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDEwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzc0MTUxIi8+CjxyZWN0IHg9IjIwIiB5PSI0MCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjQiIGZpbGw9IiM2Mzc0OEEiLz4KPHJlY3QgeD0iMjAiIHk9IjUwIiB3aWR0aD0iNDAiIGhlaWdodD0iNCIgZmlsbD0iIzYzNzQ4QSIvPgo8L3N2Zz4K';

  const handleClick = () => {
    onClick?.(book);
  };

  const formatAuthors = (authors: string[]): string => {
    if (authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return authors.join(' & ');
    return `${authors[0]} & ${authors.length - 1} others`;
  };

  const formatPrice = (price: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  return (
    <div 
      className={`bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors duration-200 ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <img 
            src={book.thumbnail_url || defaultCover} 
            alt={book.title}
            className="w-24 h-36 object-cover rounded shadow-lg"
            onError={(e) => {
              e.currentTarget.src = defaultCover;
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg mb-1 truncate" title={book.title}>
            {book.title}
          </h3>
          <p className="text-gray-400 text-sm mb-2" title={book.authors.join(', ')}>
            {formatAuthors(book.authors)}
          </p>
          
          {book.series && (
            <div className="mb-2">
              <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                {book.series}
                {book.series_position && ` #${book.series_position}`}
              </span>
            </div>
          )}
          
          {book.categories && book.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {book.categories.slice(0, 3).map(category => (
                <span 
                  key={category} 
                  className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded"
                >
                  {category}
                </span>
              ))}
              {book.categories.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{book.categories.length - 3} more
                </span>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between mt-2">
            {book.pricing && book.pricing.length > 0 && (
              <p className="text-green-400 font-semibold">
                {formatPrice(book.pricing[0].price, book.pricing[0].currency)}
              </p>
            )}
            
            <div className="flex gap-2 text-xs text-gray-500">
              {book.page_count && <span>{book.page_count} pages</span>}
              {book.published_date && (
                <span>{new Date(book.published_date).getFullYear()}</span>
              )}
            </div>
          </div>
          
          {book.description && (
            <p className="text-gray-300 text-sm mt-2 line-clamp-2" title={book.description}>
              {book.description}
            </p>
          )}
          
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>ISBN: {book.isbn}</span>
            <span className="capitalize">{book.metadata_source.replace('_', ' ')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookCard;