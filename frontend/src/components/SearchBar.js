import React, { useState } from 'react';

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        placeholder="Search books by title or author..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full bg-sonarr-dark text-white px-4 py-2 pr-20 rounded-lg border border-gray-600 focus:outline-none focus:border-sonarr-accent"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
        >
          ✕
        </button>
      )}
      <button
        type="submit"
        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-sonarr-accent text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
      >
        Search
      </button>
    </form>
  );
};

export default SearchBar;