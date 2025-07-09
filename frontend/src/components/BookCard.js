import React from 'react';

const BookCard = ({ book }) => {
  const defaultCover = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDEwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzc0MTUxIi8+CjxyZWN0IHg9IjIwIiB5PSI0MCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjQiIGZpbGw9IiM2Mzc0OEEiLz4KPHJlY3QgeD0iMjAiIHk9IjUwIiB3aWR0aD0iNDAiIGhlaWdodD0iNCIgZmlsbD0iIzYzNzQ4QSIvPgo8L3N2Zz4K';

  return (
    <div className="bg-sonarr-dark rounded-lg p-4 hover:bg-gray-800 transition-colors duration-200">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <img 
            src={book.cover_image || defaultCover} 
            alt={book.title}
            className="w-24 h-36 object-cover rounded shadow-lg"
            onError={(e) => {
              e.target.src = defaultCover;
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg mb-1 truncate">{book.title}</h3>
          <p className="text-gray-400 text-sm mb-2">{book.author}</p>
          
          {book.shelves && book.shelves.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {book.shelves.map(shelf => (
                <span 
                  key={shelf} 
                  className="text-xs bg-sonarr-accent text-white px-2 py-1 rounded-full"
                >
                  {shelf}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            {book.pricing && book.pricing.retail && (
              <p className="text-sonarr-success font-semibold">
                ${book.pricing.retail.toFixed(2)}
              </p>
            )}
            
            <div className="flex gap-2 text-xs text-gray-500">
              {book.isbn10 && <span>ISBN10: {book.isbn10}</span>}
              {book.isbn13 && <span>ISBN13: {book.isbn13}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookCard;