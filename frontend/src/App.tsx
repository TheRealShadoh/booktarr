import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './components/MainLayout';
import BookList from './components/BookList';
import LoadingSpinner from './components/LoadingSpinner';
import { BooksBySeriesMap, Book, ReadingStatus } from './types';
import './styles/tailwind.css';

// Sample data to demonstrate the UI
const sampleBooks: BooksBySeriesMap = {
  "The Stormlight Archive": [
    {
      isbn: "9780765326355",
      isbn13: "9780765326355",
      title: "The Way of Kings",
      authors: ["Brandon Sanderson"],
      series: "The Stormlight Archive",
      series_position: 1,
      publisher: "Tor Books",
      published_date: "2010-08-31",
      page_count: 1007,
      language: "en",
      thumbnail_url: "https://via.placeholder.com/300x450/f39c12/ffffff?text=Way+of+Kings",
      description: "The first book in the epic fantasy series by Brandon Sanderson.",
      categories: ["Fantasy", "Epic Fantasy"],
      pricing: [{
        source: "Amazon",
        price: 9.99,
        currency: "USD",
        last_updated: "2024-01-15"
      }],
      metadata_source: "SKOOLIB" as any,
      added_date: "2024-01-15",
      last_updated: "2024-01-15",
      reading_status: ReadingStatus.READ,
      personal_rating: 5,
      times_read: 2,
      date_finished: "2023-12-20"
    },
    {
      isbn: "9780765326362",
      isbn13: "9780765326362", 
      title: "Words of Radiance",
      authors: ["Brandon Sanderson"],
      series: "The Stormlight Archive",
      series_position: 2,
      publisher: "Tor Books",
      published_date: "2014-03-04",
      page_count: 1087,
      language: "en",
      thumbnail_url: "https://via.placeholder.com/300x450/3498db/ffffff?text=Words+of+Radiance",
      description: "The second book in the epic fantasy series by Brandon Sanderson.",
      categories: ["Fantasy", "Epic Fantasy"],
      pricing: [{
        source: "Amazon",
        price: 11.99,
        currency: "USD",
        last_updated: "2024-01-15"
      }],
      metadata_source: "SKOOLIB" as any,
      added_date: "2024-01-15",
      last_updated: "2024-01-15",
      reading_status: ReadingStatus.READING,
      reading_progress_pages: 543,
      reading_progress_percentage: 50,
      times_read: 0,
      date_started: "2024-01-10"
    },
    {
      isbn: "9780765326379",
      isbn13: "9780765326379",
      title: "Oathbringer",
      authors: ["Brandon Sanderson"],
      series: "The Stormlight Archive",
      series_position: 3,
      publisher: "Tor Books",
      published_date: "2017-11-14",
      page_count: 1248,
      language: "en",
      thumbnail_url: "https://via.placeholder.com/300x450/27ae60/ffffff?text=Oathbringer",
      description: "The third book in the epic fantasy series by Brandon Sanderson.",
      categories: ["Fantasy", "Epic Fantasy"],
      pricing: [{
        source: "Amazon",
        price: 12.99,
        currency: "USD",
        last_updated: "2024-01-15"
      }],
      metadata_source: "SKOOLIB" as any,
      added_date: "2024-01-15",
      last_updated: "2024-01-15",
      reading_status: ReadingStatus.UNREAD,
      times_read: 0
    }
  ],
  "The Kingkiller Chronicle": [
    {
      isbn: "9780756404741",
      isbn13: "9780756404741",
      title: "The Name of the Wind",
      authors: ["Patrick Rothfuss"],
      series: "The Kingkiller Chronicle",
      series_position: 1,
      publisher: "DAW Books",
      published_date: "2007-03-27",
      page_count: 662,
      language: "en",
      thumbnail_url: "https://via.placeholder.com/300x450/9b59b6/ffffff?text=Name+of+the+Wind",
      description: "The first book in The Kingkiller Chronicle by Patrick Rothfuss.",
      categories: ["Fantasy"],
      pricing: [{
        source: "Amazon",
        price: 8.99,
        currency: "USD",
        last_updated: "2024-01-15"
      }],
      metadata_source: "SKOOLIB" as any,
      added_date: "2024-01-20",
      last_updated: "2024-01-20",
      reading_status: ReadingStatus.WISHLIST,
      times_read: 0
    }
  ],
  "Standalone": [
    {
      isbn: "9780062316110",
      isbn13: "9780062316110",
      title: "Sapiens: A Brief History of Humankind",
      authors: ["Yuval Noah Harari"],
      publisher: "Harper",
      published_date: "2015-02-10",
      page_count: 443,
      language: "en",
      thumbnail_url: "https://via.placeholder.com/300x450/e74c3c/ffffff?text=Sapiens",
      description: "A groundbreaking narrative of humanity's creation and evolution.",
      categories: ["History", "Science", "Anthropology"],
      pricing: [{
        source: "Amazon",
        price: 14.99,
        currency: "USD",
        last_updated: "2024-01-15"
      }],
      metadata_source: "SKOOLIB" as any,
      added_date: "2024-01-25",
      last_updated: "2024-01-25",
      reading_status: ReadingStatus.DNF,
      reading_progress_pages: 150,
      personal_notes: "Found it interesting but couldn't finish",
      times_read: 0
    }
  ]
};

function App() {
  const [currentPage, setCurrentPage] = React.useState<string>('library');
  const [loading, setLoading] = React.useState(false);
  const [books, setBooks] = React.useState<BooksBySeriesMap>(sampleBooks);

  const handleBookClick = (book: Book) => {
    console.log('Book clicked:', book);
  };

  const handleFilterChange = (filteredBooks: Book[]) => {
    // In a real app, this would filter the books
    console.log('Filter changed:', filteredBooks.length);
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'library':
        return (
          <BookList
            books={books}
            loading={loading}
            error={null}
            onBookClick={handleBookClick}
          />
        );
      case 'series':
      case 'authors':
      case 'settings':
      case 'add':
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="text-center">
              <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-booktarr-text text-xl font-semibold mb-2">
                {currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}
              </h3>
              <p className="text-booktarr-textSecondary text-sm max-w-md">
                This page is coming soon. Backend integration pending.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Sidebar */}
        <div style={{ 
          width: '256px', 
          backgroundColor: '#252525', 
          borderRight: '1px solid #404040',
          padding: '1rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#f39c12' }}>
            Booktarr
          </h2>
          <nav>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <button 
                  onClick={() => setCurrentPage('library')}
                  style={{ 
                    color: currentPage === 'library' ? '#f39c12' : '#cccccc',
                    background: 'none',
                    border: 'none',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  📚 Library
                </button>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <button 
                  onClick={() => setCurrentPage('series')}
                  style={{ 
                    color: currentPage === 'series' ? '#f39c12' : '#cccccc',
                    background: 'none',
                    border: 'none',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  📖 Series
                </button>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <button 
                  onClick={() => setCurrentPage('settings')}
                  style={{ 
                    color: currentPage === 'settings' ? '#f39c12' : '#cccccc',
                    background: 'none',
                    border: 'none',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  ⚙️ Settings
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
          <header style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', textTransform: 'capitalize' }}>
              {currentPage}
            </h1>
          </header>

          {currentPage === 'library' && (
            <div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '1rem' 
              }}>
                {Object.values(books).flat().map(book => (
                  <div 
                    key={book.isbn} 
                    style={{ 
                      backgroundColor: '#252525', 
                      padding: '1rem', 
                      borderRadius: '8px',
                      border: '1px solid #404040'
                    }}
                  >
                    <img 
                      src={book.thumbnail_url} 
                      alt={book.title}
                      style={{ 
                        width: '100%', 
                        height: '200px', 
                        objectFit: 'cover', 
                        borderRadius: '4px',
                        marginBottom: '0.5rem'
                      }}
                    />
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      {book.title}
                    </h3>
                    <p style={{ color: '#cccccc', fontSize: '0.875rem' }}>
                      {book.authors.join(', ')}
                    </p>
                    {book.series && (
                      <p style={{ color: '#f39c12', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {book.series} #{book.series_position}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentPage !== 'library' && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                {currentPage.charAt(0).toUpperCase() + currentPage.slice(1)} Page
              </h2>
              <p style={{ color: '#cccccc' }}>
                This page is coming soon. Backend integration pending.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;