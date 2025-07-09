import React, { useState, useEffect } from 'react';
import { fetchBooks } from './services/api';
import BookList from './components/BookList';
import SearchBar from './components/SearchBar';
import './styles/tailwind.css';

function App() {
  const [seriesGroups, setSeriesGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    loadBooks();
  }, []);
  
  const loadBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBooks();
      setSeriesGroups(data);
      setFilteredGroups(data);
    } catch (error) {
      console.error('Failed to load books:', error);
      setError(error.message || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = (query) => {
    if (!query) {
      setFilteredGroups(seriesGroups);
      return;
    }
    
    const filtered = seriesGroups.map(group => ({
      ...group,
      books: group.books.filter(book => 
        book.title.toLowerCase().includes(query.toLowerCase()) ||
        book.author.toLowerCase().includes(query.toLowerCase())
      )
    })).filter(group => group.books.length > 0);
    
    setFilteredGroups(filtered);
  };
  
  return (
    <div className="min-h-screen bg-sonarr-darker">
      <header className="bg-sonarr-dark shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-white">
              📚 Booktarr
            </h1>
            <button
              onClick={loadBooks}
              className="bg-sonarr-accent text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          <SearchBar onSearch={handleSearch} />
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        <BookList 
          seriesGroups={filteredGroups} 
          loading={loading} 
          error={error}
        />
      </main>
      
      <footer className="bg-sonarr-dark mt-12 py-4">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>Booktarr - Your personal book library viewer</p>
        </div>
      </footer>
    </div>
  );
}

export default App;