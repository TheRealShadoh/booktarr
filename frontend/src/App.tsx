import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './components/MainLayout';
import BookList from './components/BookList';
import LoadingSpinner from './components/LoadingSpinner';
import Toast from './components/Toast';
import { Book, ToastMessage } from './types';
import './styles/tailwind.css';

// Sample data for demonstration
const sampleBooks: Book[] = [
  {
    id: '1',
    title: 'The Way of Kings',
    authors: ['Brandon Sanderson'],
    series: 'The Stormlight Archive',
    seriesPosition: 1,
    isbn: '9780765326355',
    isbn13: '9780765326355',
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/I/71nFP5J-7EL.jpg',
    publisher: 'Tor Books',
    publishedDate: '2010-08-31',
    pageCount: 1007,
    description: 'The first book in the epic fantasy series by Brandon Sanderson.',
    language: 'English',
    genres: ['Fantasy', 'Epic Fantasy'],
    rating: 4.6,
    status: 'owned',
    format: 'physical',
    dateAdded: '2024-01-15',
    condition: 'good'
  },
  {
    id: '2',
    title: 'Words of Radiance',
    authors: ['Brandon Sanderson'],
    series: 'The Stormlight Archive',
    seriesPosition: 2,
    isbn: '9780765326362',
    isbn13: '9780765326362',
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/I/81xUMEF6qHL.jpg',
    publisher: 'Tor Books',
    publishedDate: '2014-03-04',
    pageCount: 1087,
    description: 'The second book in the epic fantasy series by Brandon Sanderson.',
    language: 'English',
    genres: ['Fantasy', 'Epic Fantasy'],
    rating: 4.7,
    status: 'owned',
    format: 'physical',
    dateAdded: '2024-01-20',
    condition: 'good'
  },
  {
    id: '3',
    title: 'Oathbringer',
    authors: ['Brandon Sanderson'],
    series: 'The Stormlight Archive',
    seriesPosition: 3,
    isbn: '9780765326379',
    isbn13: '9780765326379',
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/I/81XD6sYMsJL.jpg',
    publisher: 'Tor Books',
    publishedDate: '2017-11-14',
    pageCount: 1248,
    description: 'The third book in the epic fantasy series by Brandon Sanderson.',
    language: 'English',
    genres: ['Fantasy', 'Epic Fantasy'],
    rating: 4.5,
    status: 'owned',
    format: 'physical',
    dateAdded: '2024-01-25',
    condition: 'good'
  },
  {
    id: '4',
    title: 'Rhythm of War',
    authors: ['Brandon Sanderson'],
    series: 'The Stormlight Archive',
    seriesPosition: 4,
    isbn: '9780765326386',
    isbn13: '9780765326386',
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/I/81hNdRWG-7L.jpg',
    publisher: 'Tor Books',
    publishedDate: '2020-11-17',
    pageCount: 1232,
    description: 'The fourth book in the epic fantasy series by Brandon Sanderson.',
    language: 'English',
    genres: ['Fantasy', 'Epic Fantasy'],
    rating: 4.4,
    status: 'wanted',
    format: 'physical',
    dateAdded: '2024-02-01',
    condition: 'new'
  },
  {
    id: '5',
    title: 'The Name of the Wind',
    authors: ['Patrick Rothfuss'],
    series: 'The Kingkiller Chronicle',
    seriesPosition: 1,
    isbn: '9780756404741',
    isbn13: '9780756404741',
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/I/81vHgJK7ipL.jpg',
    publisher: 'DAW Books',
    publishedDate: '2007-03-27',
    pageCount: 662,
    description: 'The first book in The Kingkiller Chronicle by Patrick Rothfuss.',
    language: 'English',
    genres: ['Fantasy'],
    rating: 4.5,
    status: 'read',
    format: 'ebook',
    dateAdded: '2024-02-05',
    condition: 'new'
  }
];

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [currentPage, setCurrentPage] = useState('library');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    // Simulate loading data
    const loadBooks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setBooks(sampleBooks);
        setFilteredBooks(sampleBooks);
        
        showToast('Books loaded successfully!', 'success');
      } catch (err) {
        setError('Failed to load books. Please try again.');
        showToast('Failed to load books', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadBooks();
  }, []);

  const showToast = (message: string, type: ToastMessage['type']) => {
    const newToast: ToastMessage = {
      id: Date.now().toString(),
      message,
      type,
      duration: 5000
    };
    setToast(newToast);
  };

  const handleBookClick = (book: Book) => {
    console.log('Book clicked:', book);
    showToast(`Opened ${book.title}`, 'info');
  };

  const handleStatusChange = (book: Book, newStatus: string) => {
    const updatedBooks = books.map(b => 
      b.id === book.id ? { ...b, status: newStatus as any } : b
    );
    setBooks(updatedBooks);
    setFilteredBooks(updatedBooks);
    showToast(`Status changed to ${newStatus}`, 'success');
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Books refreshed!', 'success');
    }, 1000);
  };

  const handleFilterChange = (filtered: Book[]) => {
    setFilteredBooks(filtered);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'library':
        return (
          <BookList
            books={filteredBooks}
            loading={loading}
            error={error}
            onBookClick={handleBookClick}
            onStatusChange={handleStatusChange}
            onRefresh={handleRefresh}
          />
        );
      case 'search':
        return (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <svg className="w-16 h-16 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h3 className="text-booktarr-text text-xl font-semibold">Add Books</h3>
            <p className="text-booktarr-textSecondary text-center max-w-md">
              Search for books to add to your library. This feature will be connected to the backend soon.
            </p>
          </div>
        );
      case 'series':
        return (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <svg className="w-16 h-16 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-booktarr-text text-xl font-semibold">Series</h3>
            <p className="text-booktarr-textSecondary text-center max-w-md">
              Browse your books organized by series. Coming soon!
            </p>
          </div>
        );
      case 'authors':
        return (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <svg className="w-16 h-16 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="text-booktarr-text text-xl font-semibold">Authors</h3>
            <p className="text-booktarr-textSecondary text-center max-w-md">
              Browse your books organized by author. Coming soon!
            </p>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <svg className="w-16 h-16 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-booktarr-text text-xl font-semibold">
              {currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}
            </h3>
            <p className="text-booktarr-textSecondary text-center max-w-md">
              This page is coming soon. Stay tuned for updates!
            </p>
          </div>
        );
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-booktarr-bg">
        {/* Toast Notifications */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => setToast(null)}
            action={toast.action}
          />
        )}

        <MainLayout
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          books={books}
          onFilterChange={handleFilterChange}
        >
          {renderCurrentPage()}
        </MainLayout>
      </div>
    </ThemeProvider>
  );
};

export default App;