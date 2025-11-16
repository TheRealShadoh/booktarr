/**
 * Enhanced BookDetailsPage - Comprehensive book management with all the bells and whistles
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import LoadingSpinner from './LoadingSpinner';
import MetadataEditor from './MetadataEditor';

interface BookEdition {
  id: number;
  isbn_13?: string;
  isbn_10?: string;
  format?: string;
  publisher?: string;
  release_date?: string;
  cover_url?: string;
  price?: number;
  status?: 'own' | 'want' | 'missing';
  notes?: string;
}

interface ReadingSession {
  id: string;
  start_time: string;
  end_time?: string;
  pages_read: number;
  notes?: string;
  mood?: 'excited' | 'engaged' | 'neutral' | 'bored' | 'frustrated';
}

interface BookQuote {
  id: string;
  text: string;
  page_number?: number;
  chapter?: string;
  date_added: string;
  tags: string[];
}

interface BookDetails {
  id: string;
  title: string;
  authors: string[];
  series?: string;
  series_position?: number;
  isbn: string;
  publisher?: string;
  published_date?: string;
  page_count?: number;
  language: string;
  thumbnail_url?: string;
  description?: string;
  categories: string[];
  editions: BookEdition[];
  
  // Reading progress and ownership
  ownership?: {
    status: 'own' | 'want' | 'missing';
    selected_edition?: string;
    purchase_date?: string;
    purchase_price?: number;
    location?: string;
    condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
    reading_progress_pages?: number;
    reading_progress_percentage?: number;
    personal_rating?: number;
    personal_review?: string;
    date_started?: string;
    date_finished?: string;
    times_read?: number;
  };
  
  // Enhanced features
  reading_sessions?: ReadingSession[];
  quotes?: BookQuote[];
  tags?: string[];
  collections?: string[];
  
  // Metadata
  added_date: string;
  last_updated: string;
}

interface BookDetailsPageProps {
  bookId?: string;
  isbn?: string;
  onBack: () => void;
  onSeriesClick?: (seriesName: string) => void;
}

const STAR_RATINGS = [1, 2, 3, 4, 5];

const TAB_CONFIG = [
  { key: 'overview', label: 'Overview', icon: '📖' },
  { key: 'progress', label: 'Reading Progress', icon: '📊' },
  { key: 'quotes', label: 'Quotes & Notes', icon: '💭' },
  { key: 'stats', label: 'Reading Stats', icon: '📈' },
  { key: 'editions', label: 'Editions', icon: '📚' }
];

const BookDetailsPage: React.FC<BookDetailsPageProps> = ({ bookId, isbn, onBack, onSeriesClick }) => {
  const [bookDetails, setBookDetails] = useState<BookDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEdition, setSelectedEdition] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'quotes' | 'stats' | 'editions'>('overview');
  
  // Metadata editor state
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  
  // Reading progress state
  const [isReading, setIsReading] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [readingStartTime, setReadingStartTime] = useState<Date | null>(null);
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuotePage, setNewQuotePage] = useState<number | undefined>();
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  
  // Review and rating state
  const [personalRating, setPersonalRating] = useState<number>(0);
  const [personalReview, setPersonalReview] = useState('');
  const [editingReview, setEditingReview] = useState(false);
  
  // Tags and collections
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  // Goals and targets
  const [readingGoal, setReadingGoal] = useState<{
    target_date?: string;
    pages_per_day?: number;
    total_time_estimate?: number;
  }>({});


  const fetchBookDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = '';
      if (bookId) {
        url = `/api/books/${bookId}`;
      } else if (isbn) {
        url = `/api/books/isbn/${isbn}`;
      } else {
        throw new Error('No book identifier provided');
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch book details');
      }
      
      const data = await response.json();
      
      // Add mock data for enhanced features
      const enhancedData = {
        ...data,
        reading_sessions: [
          {
            id: '1',
            start_time: '2025-07-10T14:30:00Z',
            end_time: '2025-07-10T16:15:00Z',
            pages_read: 25,
            notes: 'Great opening chapter, really engaging!',
            mood: 'excited'
          },
          {
            id: '2', 
            start_time: '2025-07-11T09:00:00Z',
            end_time: '2025-07-11T10:30:00Z',
            pages_read: 18,
            mood: 'engaged'
          }
        ],
        quotes: [
          {
            id: '1',
            text: 'The best time to plant a tree was 20 years ago. The second best time is now.',
            page_number: 45,
            chapter: 'Chapter 3',
            date_added: '2025-07-10T16:00:00Z',
            tags: ['wisdom', 'motivation']
          }
        ],
        tags: ['fantasy', 'adventure', 'favorite'],
        collections: ['2025 Reading Challenge', 'Must Read'],
        ownership: {
          status: data.editions?.[0]?.status || 'own',
          selected_edition: data.editions?.[0]?.isbn_13,
          reading_progress_pages: 67,
          reading_progress_percentage: 45,
          personal_rating: 4,
          personal_review: 'Really enjoying this series so far!',
          times_read: 1
        }
      };
      
      setBookDetails(enhancedData);
      
      if (enhancedData.ownership?.selected_edition) {
        setSelectedEdition(enhancedData.ownership.selected_edition);
      } else if (enhancedData.editions?.length > 0) {
        setSelectedEdition(enhancedData.editions[0].isbn_13 || enhancedData.editions[0].id.toString());
      }
      
      if (enhancedData.ownership?.reading_progress_pages) {
        setCurrentPage(enhancedData.ownership.reading_progress_pages);
      }
      
      if (enhancedData.ownership?.personal_rating) {
        setPersonalRating(enhancedData.ownership.personal_rating);
      }
      
      if (enhancedData.ownership?.personal_review) {
        setPersonalReview(enhancedData.ownership.personal_review);
      }
      
      if (enhancedData.tags) {
        setCustomTags(enhancedData.tags);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load book details');
    } finally {
      setLoading(false);
    }
  }, [bookId, isbn]);

  useEffect(() => {
    fetchBookDetails();
  }, [fetchBookDetails]);

  const startReadingSession = () => {
    setIsReading(true);
    setReadingStartTime(new Date());
  };

  const endReadingSession = () => {
    if (!readingStartTime) return;
    
    const endTime = new Date();
    const duration = endTime.getTime() - readingStartTime.getTime();
    const pagesRead = currentPage - (bookDetails?.ownership?.reading_progress_pages || 0);
    
    // Here you would typically save the reading session to the backend
    console.log('Reading session ended:', {
      duration: Math.round(duration / 1000 / 60), // minutes
      pagesRead,
      startTime: readingStartTime,
      endTime
    });
    
    setIsReading(false);
    setReadingStartTime(null);
  };

  const refreshMetadata = async () => {
    if (!bookDetails?.series) {
      // For individual books, we could refresh book metadata
      alert('Book metadata refresh not yet implemented for individual books');
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/series/${encodeURIComponent(bookDetails.series)}/refresh`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Series metadata refreshed successfully! Updated ${result.updated_volumes || 0} volumes.`);
        // Optionally refetch book details
        await fetchBookDetails();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Error refreshing metadata:', error);
      alert('Failed to refresh metadata. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addQuote = () => {
    if (!newQuoteText.trim()) return;
    
    const newQuote: BookQuote = {
      id: Date.now().toString(),
      text: newQuoteText.trim(),
      page_number: newQuotePage,
      date_added: new Date().toISOString(),
      tags: []
    };
    
    // Here you would typically save to backend
    console.log('Adding quote:', newQuote);
    
    setNewQuoteText('');
    setNewQuotePage(undefined);
    setShowQuoteForm(false);
  };

  const addTag = () => {
    if (!newTag.trim() || customTags.includes(newTag.trim())) return;
    
    setCustomTags([...customTags, newTag.trim()]);
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter(tag => tag !== tagToRemove));
  };

  const updateReadingProgress = (pages: number) => {
    setCurrentPage(pages);
    
    if (bookDetails?.page_count) {
      const percentage = Math.round((pages / bookDetails.page_count) * 100);
      // Here you would typically update the backend
      console.log('Progress updated:', { pages, percentage });
    }
  };

  // Memoized calculations
  const selectedEditionDetails = useMemo(() => 
    bookDetails?.editions.find(e => e.isbn_13 === selectedEdition || e.id.toString() === selectedEdition), 
    [bookDetails?.editions, selectedEdition]
  );

  const readingStats = useMemo(() => {
    if (!bookDetails?.reading_sessions) return null;
    
    const totalPages = bookDetails.reading_sessions.reduce((sum, session) => sum + session.pages_read, 0);
    const totalSessions = bookDetails.reading_sessions.length;
    const avgPagesPerSession = totalPages / totalSessions;
    
    return {
      totalPages,
      totalSessions,
      avgPagesPerSession: Math.round(avgPagesPerSession)
    };
  }, [bookDetails?.reading_sessions]);

  const getEditionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'hardcover': 'Hardcover',
      'paperback': 'Paperback', 
      'ebook': 'E-book',
      'audiobook': 'Audiobook',
      'mass_market': 'Mass Market',
      'trade_paperback': 'Trade Paperback'
    };
    return labels[type] || type;
  };

  const getReadingMoodIcon = (mood: string) => {
    const icons: Record<string, string> = {
      'excited': '🤩',
      'engaged': '😊',
      'neutral': '😐',
      'bored': '😴',
      'frustrated': '😤'
    };
    return icons[mood] || '📖';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-booktarr-bg">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-booktarr-bg min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <button 
            onClick={onBack}
            className="mt-4 bg-booktarr-accent text-white px-4 py-2 rounded hover:bg-booktarr-accent/90 transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  if (!bookDetails) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-booktarr-bg min-h-screen">
        <div className="text-center text-booktarr-textMuted">
          No book details available
          <button 
            onClick={onBack}
            className="block mt-4 mx-auto bg-booktarr-accent text-white px-4 py-2 rounded hover:bg-booktarr-accent/90 transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-booktarr-bg min-h-screen">
      {/* Header with back button and quick actions */}
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center space-x-2 text-booktarr-textMuted hover:text-booktarr-text transition-colors"
        >
          <span className="text-xl">←</span>
          <span>Back to Library</span>
        </button>
        
        <div className="flex items-center space-x-3">
          {!isReading ? (
            <button
              onClick={startReadingSession}
              className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-600 transition-colors"
            >
              <span>📖</span>
              <span>Start Reading</span>
            </button>
          ) : (
            <button
              onClick={endReadingSession}
              className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-600 transition-colors"
            >
              <span>⏹️</span>
              <span>Stop Reading</span>
            </button>
          )}
          
          <button
            onClick={() => setShowQuoteForm(!showQuoteForm)}
            className="bg-booktarr-accent text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-booktarr-accent/90 transition-colors"
          >
            <span>💭</span>
            <span>Add Quote</span>
          </button>
          
          <button
            onClick={refreshMetadata}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-600 transition-colors"
            title="Refresh book metadata from external sources"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Book Info Header */}
      <div className="booktarr-card mb-6">
        <div className="booktarr-card-content">
          <div className="grid md:grid-cols-4 gap-6">
            {/* Book Cover */}
            <div className="md:col-span-1">
              <div className="aspect-[2/3] bg-booktarr-cardBg rounded-lg overflow-hidden shadow-lg">
                {selectedEditionDetails?.cover_url ? (
                  <img 
                    src={selectedEditionDetails.cover_url} 
                    alt={bookDetails.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-booktarr-textMuted">
                    <span className="text-4xl">📚</span>
                  </div>
                )}
              </div>
              
              {/* Quick Progress Update */}
              {bookDetails.ownership?.status === 'own' && (
                <div className="mt-4 p-3 bg-booktarr-cardBg rounded-lg">
                  <label className="block text-sm font-medium text-booktarr-text mb-2">
                    Current Page
                  </label>
                  <input
                    type="number"
                    value={currentPage}
                    onChange={(e) => updateReadingProgress(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                    min="0"
                    max={bookDetails.page_count || 999}
                  />
                  {bookDetails.page_count && (
                    <div className="mt-2 text-xs text-booktarr-textMuted">
                      of {bookDetails.page_count} pages ({Math.round((currentPage / bookDetails.page_count) * 100)}%)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Book Details */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h1 className="text-3xl font-bold text-booktarr-text">{bookDetails.title}</h1>
                  <button
                    onClick={() => setShowMetadataEditor(true)}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                  >
                    ✏️ Edit Metadata
                  </button>
                </div>
                <p className="text-lg text-booktarr-textMuted">
                  by {bookDetails.authors.join(', ')}
                </p>
                {bookDetails.series && (
                  <p className="text-sm text-booktarr-textMuted mt-1">
                    <span className="font-medium">Series:</span>{' '}
                    {onSeriesClick ? (
                      <button
                        onClick={() => bookDetails.series && onSeriesClick(bookDetails.series)}
                        className="text-booktarr-accent hover:text-booktarr-accent/80 underline transition-colors"
                      >
                        {bookDetails.series}
                      </button>
                    ) : (
                      <span>{bookDetails.series}</span>
                    )}
                    {bookDetails.series_position && ` #${bookDetails.series_position}`}
                  </p>
                )}
              </div>

              {/* Basic Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-booktarr-text">Publisher:</span>
                  <p className="text-booktarr-textMuted">{bookDetails.publisher || 'Unknown'}</p>
                </div>
                <div>
                  <span className="font-medium text-booktarr-text">Published:</span>
                  <p className="text-booktarr-textMuted">
                    {bookDetails.published_date ? new Date(bookDetails.published_date).getFullYear() : 'Unknown'}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-booktarr-text">Pages:</span>
                  <p className="text-booktarr-textMuted">{bookDetails.page_count || 'Unknown'}</p>
                </div>
                <div>
                  <span className="font-medium text-booktarr-text">Language:</span>
                  <p className="text-booktarr-textMuted">{bookDetails.language || 'Unknown'}</p>
                </div>
              </div>

              {/* Description */}
              {bookDetails.description && (
                <div>
                  <h3 className="font-medium text-booktarr-text mb-2">Description</h3>
                  <p className="text-sm text-booktarr-textMuted leading-relaxed">
                    {bookDetails.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              <div>
                <h3 className="font-medium text-booktarr-text mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {customTags.map((tag, index) => (
                    <span
                      key={`tag-${tag}-${index}`}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-booktarr-accent/10 text-booktarr-accent border border-booktarr-accent/20"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-booktarr-accent/70 hover:text-booktarr-accent"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {newTag && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                        className="px-2 py-1 text-xs border border-booktarr-border rounded focus:outline-none focus:ring-1 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                        placeholder="New tag..."
                      />
                      <button
                        onClick={addTag}
                        className="text-xs bg-booktarr-accent text-white px-2 py-1 rounded hover:bg-booktarr-accent/90"
                      >
                        Add
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setNewTag(' ')}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs border border-dashed border-booktarr-textMuted text-booktarr-textMuted hover:border-booktarr-accent hover:text-booktarr-accent"
                  >
                    + Add Tag
                  </button>
                </div>
              </div>
            </div>

            {/* Ownership & Rating */}
            <div className="md:col-span-1 space-y-4">
              {/* Ownership Status */}
              <div className="p-4 bg-booktarr-cardBg rounded-lg">
                <h3 className="font-medium text-booktarr-text mb-3">Ownership</h3>
                <div className="space-y-2">
                  <div className={`px-3 py-2 rounded-full text-sm text-center ${
                    bookDetails.ownership?.status === 'own' 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : bookDetails.ownership?.status === 'want'
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    {bookDetails.ownership?.status === 'own' ? '✓ Owned' : 
                     bookDetails.ownership?.status === 'want' ? '⭐ Wanted' : '❌ Missing'}
                  </div>
                  
                  {bookDetails.ownership?.reading_progress_percentage && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-booktarr-textMuted mb-1">
                        <span>Progress</span>
                        <span>{bookDetails.ownership.reading_progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-booktarr-border rounded-full h-2">
                        <div 
                          className="bg-booktarr-accent h-2 rounded-full transition-all duration-300"
                          style={{ width: `${bookDetails.ownership.reading_progress_percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="p-4 bg-booktarr-cardBg rounded-lg">
                <h3 className="font-medium text-booktarr-text mb-3">Your Rating</h3>
                
                {/* Star Rating - Interactive */}
                <div className="text-right">
                  <div className="flex items-center space-x-1 mb-2">
                    {STAR_RATINGS.map((star) => (
                      <button
                        key={star}
                        onClick={() => setPersonalRating(star)}
                        className={`w-8 h-8 ${
                          star <= personalRating 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-gray-300 hover:text-yellow-300'
                        } transition-colors`}
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-booktarr-textMuted">
                    {personalRating > 0 ? `${personalRating}/5 stars` : 'No rating yet'}
                  </p>
                </div>

                {/* Personal Review */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-booktarr-text mb-2">
                    Your Review
                  </label>
                  {editingReview ? (
                    <div className="space-y-2">
                      <textarea
                        value={personalReview}
                        onChange={(e) => setPersonalReview(e.target.value)}
                        className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                        rows={3}
                        placeholder="What did you think of this book?"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingReview(false)}
                          className="px-3 py-1 bg-booktarr-accent text-white text-sm rounded hover:bg-booktarr-accent/90"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingReview(false)}
                          className="px-3 py-1 bg-booktarr-border text-booktarr-textMuted text-sm rounded hover:bg-booktarr-border/80"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setEditingReview(true)}
                      className="min-h-[60px] p-2 border border-booktarr-border rounded-md cursor-pointer hover:border-booktarr-accent transition-colors bg-booktarr-bg"
                    >
                      {personalReview ? (
                        <p className="text-sm text-booktarr-text">{personalReview}</p>
                      ) : (
                        <p className="text-sm text-booktarr-textMuted italic">Click to add your review...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Quote Form */}
      {showQuoteForm && (
        <div className="booktarr-card mb-6">
          <div className="booktarr-card-header">
            <h3 className="text-lg font-semibold text-booktarr-text">Add Quote</h3>
          </div>
          <div className="booktarr-card-content">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-booktarr-text mb-2">
                  Quote Text
                </label>
                <textarea
                  value={newQuoteText}
                  onChange={(e) => setNewQuoteText(e.target.value)}
                  className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                  rows={3}
                  placeholder="Enter the quote..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-booktarr-text mb-2">
                    Page Number (optional)
                  </label>
                  <input
                    type="number"
                    value={newQuotePage || ''}
                    onChange={(e) => setNewQuotePage(parseInt(e.target.value) || undefined)}
                    className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                    placeholder="Page number"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={addQuote}
                  className="bg-booktarr-accent text-white px-4 py-2 rounded-lg hover:bg-booktarr-accent/90 transition-colors"
                >
                  Add Quote
                </button>
                <button
                  onClick={() => setShowQuoteForm(false)}
                  className="bg-booktarr-border text-booktarr-textMuted px-4 py-2 rounded-lg hover:bg-booktarr-border/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Tab Navigation */}
      <div className="booktarr-card">
        <div className="booktarr-card-header border-b border-booktarr-border">
          <nav className="flex space-x-8">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-booktarr-accent text-booktarr-accent'
                    : 'border-transparent text-booktarr-textMuted hover:text-booktarr-text hover:border-booktarr-textMuted'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="booktarr-card-content">
          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-booktarr-text mb-4">Book Overview</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-booktarr-text mb-2">Metadata</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-booktarr-textMuted">ISBN:</span>
                        <span className="text-booktarr-text">{bookDetails.isbn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-booktarr-textMuted">Added:</span>
                        <span className="text-booktarr-text">
                          {new Date(bookDetails.added_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-booktarr-textMuted">Last Updated:</span>
                        <span className="text-booktarr-text">
                          {new Date(bookDetails.last_updated).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-booktarr-text mb-2">Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {bookDetails.categories?.length > 0 ? (
                        bookDetails.categories.map((category, index) => (
                          <span
                            key={`category-${category}-${index}`}
                            className="px-2 py-1 bg-booktarr-accent/10 text-booktarr-accent text-xs rounded-full border border-booktarr-accent/20"
                          >
                            {category}
                          </span>
                        ))
                      ) : (
                        <span className="text-booktarr-textMuted text-sm">No categories assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {bookDetails.collections && bookDetails.collections.length > 0 && (
                <div>
                  <h4 className="font-medium text-booktarr-text mb-2">Collections</h4>
                  <div className="flex flex-wrap gap-2">
                    {bookDetails.collections.map((collection, index) => (
                      <span
                        key={`collection-${collection}-${index}`}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full border border-blue-200"
                      >
                        📚 {collection}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-booktarr-text mb-4">Reading Progress</h3>
              
              {/* Progress Overview */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-booktarr-cardBg rounded-lg">
                  <div className="text-2xl font-bold text-booktarr-accent">
                    {bookDetails.ownership?.reading_progress_pages || 0}
                  </div>
                  <div className="text-sm text-booktarr-textMuted">Pages Read</div>
                </div>
                <div className="p-4 bg-booktarr-cardBg rounded-lg">
                  <div className="text-2xl font-bold text-booktarr-accent">
                    {bookDetails.ownership?.reading_progress_percentage || 0}%
                  </div>
                  <div className="text-sm text-booktarr-textMuted">Complete</div>
                </div>
                <div className="p-4 bg-booktarr-cardBg rounded-lg">
                  <div className="text-2xl font-bold text-booktarr-accent">
                    {bookDetails.ownership?.times_read || 0}
                  </div>
                  <div className="text-sm text-booktarr-textMuted">Times Read</div>
                </div>
              </div>

              {/* Reading Sessions */}
              <div>
                <h4 className="font-medium text-booktarr-text mb-3">Recent Reading Sessions</h4>
                {bookDetails.reading_sessions && bookDetails.reading_sessions.length > 0 ? (
                  <div className="space-y-3">
                    {bookDetails.reading_sessions.map((session) => (
                      <div key={session.id} className="p-3 bg-booktarr-cardBg rounded-lg border border-booktarr-border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">
                              {session.mood ? getReadingMoodIcon(session.mood) : '📖'}
                            </span>
                            <div>
                              <div className="text-sm font-medium text-booktarr-text">
                                {session.pages_read} pages read
                              </div>
                              <div className="text-xs text-booktarr-textMuted">
                                {new Date(session.start_time).toLocaleDateString()} at{' '}
                                {new Date(session.start_time).toLocaleTimeString()}
                                {session.end_time && (
                                  <> - {new Date(session.end_time).toLocaleTimeString()}</>
                                )}
                              </div>
                            </div>
                          </div>
                          {session.end_time && (
                            <div className="text-xs text-booktarr-textMuted">
                              {Math.round(
                                (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 
                                (1000 * 60)
                              )} min
                            </div>
                          )}
                        </div>
                        {session.notes && (
                          <div className="mt-2 text-sm text-booktarr-textMuted italic">
                            "{session.notes}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-booktarr-textMuted">
                    <span className="text-4xl block mb-2">📖</span>
                    No reading sessions yet. Start reading to track your progress!
                  </div>
                )}
              </div>

              {/* Reading Goals */}
              <div>
                <h4 className="font-medium text-booktarr-text mb-3">Reading Goals</h4>
                <div className="p-4 bg-booktarr-cardBg rounded-lg border border-booktarr-border">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-booktarr-text mb-2">
                        Target Date
                      </label>
                      <input
                        type="date"
                        value={readingGoal.target_date || ''}
                        onChange={(e) => setReadingGoal({...readingGoal, target_date: e.target.value})}
                        className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-booktarr-text mb-2">
                        Pages Per Day
                      </label>
                      <input
                        type="number"
                        value={readingGoal.pages_per_day || ''}
                        onChange={(e) => setReadingGoal({...readingGoal, pages_per_day: parseInt(e.target.value) || undefined})}
                        className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                        placeholder="Pages per day"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-booktarr-text mb-2">
                        Estimated Hours
                      </label>
                      <input
                        type="number"
                        value={readingGoal.total_time_estimate || ''}
                        onChange={(e) => setReadingGoal({...readingGoal, total_time_estimate: parseInt(e.target.value) || undefined})}
                        className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                        placeholder="Total hours"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quotes' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-booktarr-text mb-4">Quotes & Notes</h3>
              
              {bookDetails.quotes && bookDetails.quotes.length > 0 ? (
                <div className="space-y-4">
                  {bookDetails.quotes.map((quote) => (
                    <div key={quote.id} className="p-4 bg-booktarr-cardBg rounded-lg border border-booktarr-border">
                      <blockquote className="text-booktarr-text italic text-lg leading-relaxed mb-3">
                        "{quote.text}"
                      </blockquote>
                      <div className="flex items-center justify-between text-sm text-booktarr-textMuted">
                        <div className="flex items-center space-x-4">
                          {quote.page_number && (
                            <span>Page {quote.page_number}</span>
                          )}
                          {quote.chapter && (
                            <span>{quote.chapter}</span>
                          )}
                        </div>
                        <span>{new Date(quote.date_added).toLocaleDateString()}</span>
                      </div>
                      {quote.tags && quote.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {quote.tags.map((tag, index) => (
                            <span
                              key={`quote-tag-${tag}-${index}`}
                              className="px-2 py-1 bg-booktarr-accent/10 text-booktarr-accent text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-booktarr-textMuted">
                  <span className="text-4xl block mb-2">💭</span>
                  No quotes saved yet. Click "Add Quote" to save your favorite passages!
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-booktarr-text mb-4">Reading Statistics</h3>
              
              {readingStats ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-booktarr-cardBg rounded-lg border border-booktarr-border">
                    <div className="text-2xl font-bold text-booktarr-accent mb-1">
                      {readingStats.totalPages}
                    </div>
                    <div className="text-sm text-booktarr-textMuted">Total Pages Read</div>
                  </div>
                  <div className="p-4 bg-booktarr-cardBg rounded-lg border border-booktarr-border">
                    <div className="text-2xl font-bold text-booktarr-accent mb-1">
                      {readingStats.totalSessions}
                    </div>
                    <div className="text-sm text-booktarr-textMuted">Reading Sessions</div>
                  </div>
                  <div className="p-4 bg-booktarr-cardBg rounded-lg border border-booktarr-border">
                    <div className="text-2xl font-bold text-booktarr-accent mb-1">
                      {readingStats.avgPagesPerSession}
                    </div>
                    <div className="text-sm text-booktarr-textMuted">Avg Pages/Session</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-booktarr-textMuted">
                  <span className="text-4xl block mb-2">📈</span>
                  Start reading to see your statistics!
                </div>
              )}
            </div>
          )}

          {activeTab === 'editions' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-booktarr-text mb-4">Available Editions</h3>
              
              {bookDetails.editions && bookDetails.editions.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {bookDetails.editions.map((edition, index) => (
                    <div 
                      key={edition.id || edition.isbn_13 || `edition-${index}`} 
                      className={`p-4 rounded-lg border transition-all ${
                        selectedEdition === (edition.isbn_13 || edition.id.toString())
                          ? 'border-booktarr-accent bg-booktarr-accent/5'
                          : 'border-booktarr-border bg-booktarr-cardBg hover:border-booktarr-accent/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-booktarr-text">
                            {getEditionTypeLabel(edition.format || 'unknown')}
                          </h4>
                          <p className="text-sm text-booktarr-textMuted">
                            {edition.publisher || 'Unknown Publisher'}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedEdition(edition.isbn_13 || edition.id.toString() || '')}
                          className={`px-3 py-1 rounded-full text-xs ${
                            selectedEdition === (edition.isbn_13 || edition.id.toString())
                              ? 'bg-booktarr-accent text-white'
                              : 'bg-booktarr-border text-booktarr-textMuted hover:bg-booktarr-accent hover:text-white'
                          }`}
                        >
                          {selectedEdition === (edition.isbn_13 || edition.id.toString()) ? 'Selected' : 'Select'}
                        </button>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-booktarr-textMuted">ISBN:</span>
                          <span className="text-booktarr-text">{edition.isbn_13 || edition.isbn_10 || 'N/A'}</span>
                        </div>
                        {edition.release_date && (
                          <div className="flex justify-between">
                            <span className="text-booktarr-textMuted">Published:</span>
                            <span className="text-booktarr-text">
                              {new Date(edition.release_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {edition.price && (
                          <div className="flex justify-between">
                            <span className="text-booktarr-textMuted">Price:</span>
                            <span className="text-booktarr-text">${edition.price}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-booktarr-textMuted">Status:</span>
                          <span className={`text-sm px-2 py-1 rounded-full ${
                            edition.status === 'own' 
                              ? 'bg-green-100 text-green-800' 
                              : edition.status === 'want'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {edition.status || 'unknown'}
                          </span>
                        </div>
                        {edition.notes && (
                          <div className="mt-2 p-2 bg-booktarr-bg rounded text-xs text-booktarr-textMuted">
                            {edition.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-booktarr-textMuted">
                  <span className="text-4xl block mb-2">📚</span>
                  No editions available
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Metadata Editor Modal */}
      {showMetadataEditor && bookDetails && (
        <MetadataEditor
          type="book"
          itemId={parseInt(bookDetails.id)}
          currentData={{
            title: bookDetails.title,
            authors: bookDetails.authors,
            series_name: bookDetails.series,
            series_position: bookDetails.series_position,
            isbn_13: bookDetails.isbn,
            publisher: bookDetails.publisher,
            published_date: bookDetails.published_date,
            description: bookDetails.description,
            cover_url: bookDetails.thumbnail_url
          }}
          onClose={() => setShowMetadataEditor(false)}
          onUpdate={(updatedData) => {
            // Refresh book data to show the updated information
            const fetchUpdatedData = async () => {
              try {
                const fetchUrl = bookId 
                  ? `/api/books/details/${bookId}`
                  : `/api/books/details?isbn=${isbn}`;
                
                const response = await fetch(fetchUrl);
                if (response.ok) {
                  const data = await response.json();
                  setBookDetails(data);
                }
              } catch (error) {
                console.error('Error refreshing book data:', error);
              }
            };
            fetchUpdatedData();
            setShowMetadataEditor(false);
          }}
        />
      )}
    </div>
  );
};

export default BookDetailsPage;