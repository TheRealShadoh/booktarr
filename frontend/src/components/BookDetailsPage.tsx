/**
 * Enhanced BookDetailsPage - Comprehensive book management with all the bells and whistles
 */
import React, { useState, useEffect, useRef } from 'react';
import { Book } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface BookEdition {
  isbn: string;
  isbn10?: string;
  isbn13?: string;
  publisher?: string;
  published_date?: string;
  page_count?: number;
  language: string;
  edition_type: 'hardcover' | 'paperback' | 'ebook' | 'audiobook' | 'mass_market' | 'trade_paperback' | 'board_book' | 'unknown';
  thumbnail_url?: string;
  description?: string;
  pricing: Array<{
    source: string;
    price: number;
    currency: string;
    url?: string;
    last_updated: string;
  }>;
  added_date: string;
  last_updated: string;
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
  categories: string[];
  editions: BookEdition[];
  ownership?: {
    owned_editions: string[];
    selected_edition?: string;
    reading_status: string;
    reading_progress_pages?: number;
    reading_progress_percentage?: number;
    date_started?: string;
    date_finished?: string;
    personal_rating?: number;
    personal_notes?: string;
    times_read: number;
    reading_goal_id?: string;
    estimated_reading_time?: number;
    actual_reading_time?: number;
  };
  reading_sessions?: ReadingSession[];
  quotes?: BookQuote[];
  custom_tags?: string[];
  similar_books?: Array<{
    isbn: string;
    title: string;
    authors: string[];
    thumbnail_url?: string;
    similarity_score: number;
  }>;
}

interface BookDetailsPageProps {
  bookId?: string;
  isbn?: string;
  onBack: () => void;
}

const BookDetailsPage: React.FC<BookDetailsPageProps> = ({ bookId, isbn, onBack }) => {
  const [bookDetails, setBookDetails] = useState<BookDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEdition, setSelectedEdition] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'quotes' | 'stats' | 'editions'>('overview');
  
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

  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBookDetails();
  }, [bookId, isbn]);

  const fetchBookDetails = async () => {
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
            text: "Not all those who wander are lost.",
            page_number: 167,
            chapter: "Chapter 10",
            date_added: '2025-07-10T15:45:00Z',
            tags: ['wisdom', 'journey']
          }
        ],
        custom_tags: ['fantasy', 'epic', 'classic', 'reread'],
        similar_books: [
          {
            isbn: '9780547928210',
            title: 'The Two Towers',
            authors: ['J.R.R. Tolkien'],
            thumbnail_url: 'https://books.google.com/books/content?id=AY9yyAEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
            similarity_score: 0.95
          },
          {
            isbn: '9780345391803',
            title: 'The Hobbit',
            authors: ['J.R.R. Tolkien'],
            thumbnail_url: 'https://books.google.com/books/content?id=LLSpngEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
            similarity_score: 0.85
          }
        ]
      };
      
      setBookDetails(enhancedData);
      setCustomTags(enhancedData.custom_tags || []);
      setPersonalRating(enhancedData.ownership?.personal_rating || 0);
      setPersonalReview(enhancedData.ownership?.personal_notes || '');
      
      if (enhancedData.ownership?.selected_edition) {
        setSelectedEdition(enhancedData.ownership.selected_edition);
      } else if (enhancedData.editions?.length > 0) {
        setSelectedEdition(enhancedData.editions[0].isbn);
      }
      
      if (enhancedData.ownership?.reading_progress_pages) {
        setCurrentPage(enhancedData.ownership.reading_progress_pages);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load book details');
    } finally {
      setLoading(false);
    }
  };

  const startReadingSession = () => {
    setIsReading(true);
    setReadingStartTime(new Date());
  };

  const endReadingSession = () => {
    if (!readingStartTime) return;
    
    const endTime = new Date();
    const duration = endTime.getTime() - readingStartTime.getTime();
    const pagesRead = currentPage - (bookDetails?.ownership?.reading_progress_pages || 0);
    
    // In a real app, this would save to the backend
    console.log('Reading session ended:', {
      duration: duration / 1000 / 60, // minutes
      pagesRead,
      currentPage
    });
    
    setIsReading(false);
    setReadingStartTime(null);
  };

  const updateReadingProgress = async (pages: number, percentage?: number) => {
    setCurrentPage(pages);
    
    // In a real app, this would update the backend
    try {
      const response = await fetch(`/api/books/${bookDetails?.id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages,
          percentage,
          timestamp: new Date().toISOString()
        })
      });
      // Handle response
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const addQuote = () => {
    if (!newQuoteText.trim()) return;
    
    const newQuote: BookQuote = {
      id: Date.now().toString(),
      text: newQuoteText,
      page_number: newQuotePage,
      date_added: new Date().toISOString(),
      tags: []
    };
    
    // In a real app, this would save to backend
    setBookDetails(prev => prev ? {
      ...prev,
      quotes: [...(prev.quotes || []), newQuote]
    } : prev);
    
    setNewQuoteText('');
    setNewQuotePage(undefined);
    setShowQuoteForm(false);
  };

  const addCustomTag = () => {
    if (!newTag.trim() || customTags.includes(newTag)) return;
    
    const updatedTags = [...customTags, newTag];
    setCustomTags(updatedTags);
    setNewTag('');
    
    // In a real app, save to backend
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = customTags.filter(tag => tag !== tagToRemove);
    setCustomTags(updatedTags);
    // In a real app, save to backend
  };

  const saveRatingAndReview = async () => {
    try {
      const response = await fetch(`/api/books/${bookDetails?.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: personalRating,
          review: personalReview
        })
      });
      setEditingReview(false);
    } catch (err) {
      console.error('Failed to save review:', err);
    }
  };

  const calculateReadingStats = () => {
    if (!bookDetails?.reading_sessions) return null;
    
    const sessions = bookDetails.reading_sessions;
    const totalTime = sessions.reduce((acc, session) => {
      if (session.end_time) {
        return acc + (new Date(session.end_time).getTime() - new Date(session.start_time).getTime());
      }
      return acc;
    }, 0);
    
    const totalPages = sessions.reduce((acc, session) => acc + session.pages_read, 0);
    const avgPagesPerHour = totalTime > 0 ? (totalPages / (totalTime / 1000 / 60 / 60)) : 0;
    
    return {
      totalTime: totalTime / 1000 / 60, // minutes
      totalPages,
      avgPagesPerHour: Math.round(avgPagesPerHour),
      sessionsCount: sessions.length
    };
  };

  const formatAuthors = (authors: string[]) => {
    if (authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors[0]} et al.`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).getFullYear().toString();
    } catch {
      return dateString;
    }
  };

  const getEditionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      hardcover: 'Hardcover',
      paperback: 'Paperback',
      ebook: 'E-book',
      audiobook: 'Audiobook',
      mass_market: 'Mass Market Paperback',
      trade_paperback: 'Trade Paperback',
      board_book: 'Board Book',
      unknown: 'Unknown Format'
    };
    return labels[type] || type;
  };

  const getReadingMoodIcon = (mood?: string) => {
    const icons: Record<string, string> = {
      excited: '🤩',
      engaged: '😊',
      neutral: '😐',
      bored: '😴',
      frustrated: '😤'
    };
    return icons[mood || 'neutral'];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !bookDetails) {
    return (
      <div className="booktarr-card">
        <div className="booktarr-card-body text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold mb-2">Failed to Load Book</h3>
            <p className="text-sm">{error || 'Book not found'}</p>
          </div>
          <button onClick={onBack} className="booktarr-btn booktarr-btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const selectedEditionDetails = bookDetails.editions.find(e => e.isbn === selectedEdition);
  const stats = calculateReadingStats();

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Quick Actions */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <div className="flex items-center justify-between">
            <button 
              onClick={onBack}
              className="flex items-center text-booktarr-textSecondary hover:text-booktarr-text"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Library
            </button>
            
            <div className="flex items-center space-x-3">
              {/* Reading Session Controls */}
              {!isReading ? (
                <button
                  onClick={startReadingSession}
                  className="booktarr-btn booktarr-btn-primary"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Reading
                </button>
              ) : (
                <button
                  onClick={endReadingSession}
                  className="booktarr-btn bg-red-600 text-white hover:bg-red-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6 6m0-6l-6 6" />
                  </svg>
                  End Session
                </button>
              )}
              
              {/* Quick Actions Menu */}
              <div className="flex items-center space-x-2">
                <button className="p-2 text-booktarr-textMuted hover:text-booktarr-text hover:bg-booktarr-surface2 rounded" title="Share Book">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </button>
                <button className="p-2 text-booktarr-textMuted hover:text-booktarr-text hover:bg-booktarr-surface2 rounded" title="Export Data">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <button className="p-2 text-booktarr-textMuted hover:text-booktarr-text hover:bg-booktarr-surface2 rounded" title="More Options">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                </button>
              </div>
              
              {bookDetails.ownership && (
                <div className="flex items-center text-green-600">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  In Your Library
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Main Book Information */}
      <div className="booktarr-card">
        <div className="booktarr-card-body">
          <div className="flex gap-8">
            {/* Book Cover with Overlay Info */}
            <div className="flex-shrink-0 relative">
              <div className="w-56 h-80">
                {selectedEditionDetails?.thumbnail_url ? (
                  <img
                    src={selectedEditionDetails.thumbnail_url}
                    alt={bookDetails.title}
                    className="w-full h-full object-cover rounded-lg shadow-xl"
                  />
                ) : (
                  <div className="w-full h-full bg-booktarr-surface2 border border-booktarr-border rounded-lg flex items-center justify-center">
                    <svg className="w-20 h-20 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Reading Status Overlay */}
              {bookDetails.ownership && (
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    bookDetails.ownership.reading_status === 'reading' ? 'bg-blue-100 text-blue-800' :
                    bookDetails.ownership.reading_status === 'read' ? 'bg-green-100 text-green-800' :
                    bookDetails.ownership.reading_status === 'wishlist' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {bookDetails.ownership.reading_status}
                  </span>
                </div>
              )}
              
              {/* Quick Progress Update */}
              {isReading && (
                <div className="absolute bottom-3 left-3 right-3 bg-black bg-opacity-75 text-white p-2 rounded">
                  <div className="text-xs text-center">
                    📖 Reading Session Active
                    <div className="text-xs opacity-75">
                      {readingStartTime && `Started ${readingStartTime.toLocaleTimeString()}`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Book Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-booktarr-text mb-3">{bookDetails.title}</h1>
                  <p className="text-xl text-booktarr-textSecondary mb-2">by {formatAuthors(bookDetails.authors)}</p>
                  
                  {bookDetails.series && (
                    <div className="flex items-center space-x-4 mb-4">
                      <p className="text-lg text-booktarr-accent font-medium">
                        {bookDetails.series}
                        {bookDetails.series_position && ` #${bookDetails.series_position}`}
                      </p>
                      <button className="text-sm text-booktarr-textMuted hover:text-booktarr-accent">
                        View Series →
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Star Rating - Interactive */}
                <div className="text-right">
                  <div className="flex items-center space-x-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
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
                  <p className="text-sm text-booktarr-textMuted">Your Rating</p>
                  {personalRating > 0 && (
                    <button
                      onClick={saveRatingAndReview}
                      className="text-xs text-booktarr-accent hover:underline"
                    >
                      Save Rating
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Stats Row */}
              {selectedEditionDetails && (
                <div className="grid grid-cols-4 gap-6 mb-6 p-4 bg-booktarr-surface2 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-booktarr-text">{selectedEditionDetails.page_count || '???'}</div>
                    <div className="text-xs text-booktarr-textMuted">Pages</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-booktarr-text">{formatDate(selectedEditionDetails.published_date)}</div>
                    <div className="text-xs text-booktarr-textMuted">Published</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-booktarr-text">{stats?.totalTime ? Math.round(stats.totalTime) : 0}</div>
                    <div className="text-xs text-booktarr-textMuted">Minutes Read</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-booktarr-text">{bookDetails.ownership?.times_read || 0}</div>
                    <div className="text-xs text-booktarr-textMuted">Times Read</div>
                  </div>
                </div>
              )}

              {/* Custom Tags */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-booktarr-text">Your Tags</h3>
                  <button
                    onClick={() => setNewTag('')}
                    className="text-xs text-booktarr-accent hover:underline"
                  >
                    + Add Tag
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customTags.map((tag, index) => (
                    <span 
                      key={index}
                      className="group flex items-center px-3 py-1 bg-booktarr-accent/10 text-booktarr-accent text-sm rounded-full border border-booktarr-accent/20"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-2 opacity-0 group-hover:opacity-100 text-xs hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {newTag !== null && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                        placeholder="New tag..."
                        className="px-2 py-1 text-sm border border-booktarr-border rounded"
                      />
                      <button
                        onClick={addCustomTag}
                        className="text-xs text-booktarr-accent hover:underline"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Description */}
              {selectedEditionDetails?.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-booktarr-text mb-3">Description</h3>
                  <div className="prose prose-sm max-w-none text-booktarr-textSecondary">
                    <p className="leading-relaxed">{selectedEditionDetails.description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tab Navigation */}
      <div className="booktarr-card">
        <div className="booktarr-card-header border-b border-booktarr-border">
          <nav className="flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: '📖' },
              { key: 'progress', label: 'Reading Progress', icon: '📊' },
              { key: 'quotes', label: 'Quotes & Notes', icon: '💭' },
              { key: 'stats', label: 'Reading Stats', icon: '📈' },
              { key: 'editions', label: 'Editions', icon: '📚' }
            ].map((tab) => (
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

        <div className="booktarr-card-body">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Categories and Publisher Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-booktarr-text mb-3">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {bookDetails.categories.map((category, index) => (
                      <span 
                        key={index} 
                        className="px-3 py-1 bg-booktarr-surface2 text-booktarr-textSecondary text-sm rounded-full border border-booktarr-border"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-booktarr-text mb-3">Publication Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-booktarr-textMuted">Publisher:</span>
                      <span className="text-booktarr-text">{selectedEditionDetails?.publisher || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-booktarr-textMuted">Language:</span>
                      <span className="text-booktarr-text">{selectedEditionDetails?.language?.toUpperCase() || 'EN'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-booktarr-textMuted">Format:</span>
                      <span className="text-booktarr-text">{getEditionTypeLabel(selectedEditionDetails?.edition_type || 'unknown')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Similar Books */}
              {bookDetails.similar_books && bookDetails.similar_books.length > 0 && (
                <div>
                  <h4 className="font-medium text-booktarr-text mb-3">Similar Books</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {bookDetails.similar_books.map((similarBook) => (
                      <div key={similarBook.isbn} className="border border-booktarr-border rounded-lg p-3 hover:border-booktarr-accent transition-colors cursor-pointer">
                        <div className="flex items-start space-x-3">
                          <div className="w-12 h-16 flex-shrink-0">
                            {similarBook.thumbnail_url ? (
                              <img
                                src={similarBook.thumbnail_url}
                                alt={similarBook.title}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <div className="w-full h-full bg-booktarr-surface2 rounded flex items-center justify-center">
                                <svg className="w-6 h-6 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-medium text-booktarr-text line-clamp-2">{similarBook.title}</h5>
                            <p className="text-xs text-booktarr-textMuted">{formatAuthors(similarBook.authors)}</p>
                            <div className="mt-1">
                              <span className="text-xs text-booktarr-accent">{Math.round(similarBook.similarity_score * 100)}% match</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personal Review */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-booktarr-text">Your Review</h4>
                  <button
                    onClick={() => setEditingReview(!editingReview)}
                    className="text-sm text-booktarr-accent hover:underline"
                  >
                    {editingReview ? 'Cancel' : personalReview ? 'Edit' : 'Add Review'}
                  </button>
                </div>
                
                {editingReview ? (
                  <div className="space-y-3">
                    <textarea
                      value={personalReview}
                      onChange={(e) => setPersonalReview(e.target.value)}
                      placeholder="Write your thoughts about this book..."
                      className="w-full h-32 p-3 border border-booktarr-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-booktarr-accent"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingReview(false)}
                        className="booktarr-btn booktarr-btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveRatingAndReview}
                        className="booktarr-btn booktarr-btn-primary"
                      >
                        Save Review
                      </button>
                    </div>
                  </div>
                ) : personalReview ? (
                  <div className="bg-booktarr-surface2 p-4 rounded-lg border border-booktarr-border">
                    <p className="text-booktarr-text">{personalReview}</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-booktarr-textMuted">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <p>No review yet. Share your thoughts!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reading Progress Tab */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              {/* Current Progress */}
              <div className="bg-gradient-to-r from-booktarr-accent/10 to-booktarr-accent/5 p-6 rounded-lg border border-booktarr-accent/20">
                <h4 className="font-medium text-booktarr-text mb-4">Current Progress</h4>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-booktarr-accent">{currentPage}</div>
                      <div className="text-xs text-booktarr-textMuted">Current Page</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-booktarr-accent">
                        {selectedEditionDetails?.page_count && currentPage ? 
                          Math.round((currentPage / selectedEditionDetails.page_count) * 100) : 0}%
                      </div>
                      <div className="text-xs text-booktarr-textMuted">Complete</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={currentPage}
                      onChange={(e) => setCurrentPage(parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-sm border border-booktarr-border rounded"
                      placeholder="Page"
                    />
                    <button
                      onClick={() => updateReadingProgress(currentPage)}
                      className="booktarr-btn booktarr-btn-primary booktarr-btn-sm"
                    >
                      Update
                    </button>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-booktarr-surface2 rounded-full h-3 mb-4">
                  <div 
                    className="bg-gradient-to-r from-booktarr-accent to-booktarr-accent/80 h-3 rounded-full transition-all duration-300"
                    style={{ 
                      width: selectedEditionDetails?.page_count && currentPage ? 
                        `${Math.min((currentPage / selectedEditionDetails.page_count) * 100, 100)}%` : '0%' 
                    }}
                  ></div>
                </div>
                
                {/* Reading Goals */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm font-medium text-booktarr-text">
                      {selectedEditionDetails?.page_count ? selectedEditionDetails.page_count - currentPage : '?'}
                    </div>
                    <div className="text-xs text-booktarr-textMuted">Pages Left</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-booktarr-text">
                      {stats?.avgPagesPerHour || 0}
                    </div>
                    <div className="text-xs text-booktarr-textMuted">Pages/Hour</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-booktarr-text">
                      {selectedEditionDetails?.page_count && stats?.avgPagesPerHour && currentPage < selectedEditionDetails.page_count ?
                        Math.round((selectedEditionDetails.page_count - currentPage) / stats.avgPagesPerHour * 60) : 0}
                    </div>
                    <div className="text-xs text-booktarr-textMuted">Min. to Finish</div>
                  </div>
                </div>
              </div>

              {/* Reading Sessions */}
              <div>
                <h4 className="font-medium text-booktarr-text mb-4">Recent Reading Sessions</h4>
                <div className="space-y-3">
                  {bookDetails.reading_sessions?.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border border-booktarr-border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">
                          {getReadingMoodIcon(session.mood)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-booktarr-text">
                            {new Date(session.start_time).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-booktarr-textMuted">
                            {new Date(session.start_time).toLocaleTimeString()} - {session.end_time ? new Date(session.end_time).toLocaleTimeString() : 'In Progress'}
                          </div>
                          {session.notes && (
                            <div className="text-xs text-booktarr-textSecondary mt-1 italic">"{session.notes}"</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-booktarr-text">{session.pages_read} pages</div>
                        <div className="text-xs text-booktarr-textMuted">
                          {session.end_time ? 
                            `${Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 1000 / 60)} min` :
                            'Active'
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!bookDetails.reading_sessions || bookDetails.reading_sessions.length === 0) && (
                    <div className="text-center py-8 text-booktarr-textMuted">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <p>No reading sessions yet. Start reading to track your progress!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quotes Tab */}
          {activeTab === 'quotes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-booktarr-text">Your Quotes & Highlights</h4>
                <button
                  onClick={() => setShowQuoteForm(!showQuoteForm)}
                  className="booktarr-btn booktarr-btn-primary"
                >
                  + Add Quote
                </button>
              </div>

              {/* Add Quote Form */}
              {showQuoteForm && (
                <div className="border border-booktarr-border rounded-lg p-4 bg-booktarr-surface2">
                  <div className="space-y-3">
                    <textarea
                      value={newQuoteText}
                      onChange={(e) => setNewQuoteText(e.target.value)}
                      placeholder="Enter your favorite quote or highlight..."
                      className="w-full h-24 p-3 border border-booktarr-border rounded resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <input
                        type="number"
                        value={newQuotePage || ''}
                        onChange={(e) => setNewQuotePage(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="Page number (optional)"
                        className="w-32 px-3 py-1 text-sm border border-booktarr-border rounded"
                      />
                      <div className="space-x-2">
                        <button
                          onClick={() => setShowQuoteForm(false)}
                          className="booktarr-btn booktarr-btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={addQuote}
                          disabled={!newQuoteText.trim()}
                          className="booktarr-btn booktarr-btn-primary"
                        >
                          Save Quote
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quotes List */}
              <div className="space-y-4">
                {bookDetails.quotes?.map((quote) => (
                  <div key={quote.id} className="border border-booktarr-border rounded-lg p-4 hover:border-booktarr-accent/50 transition-colors">
                    <blockquote className="text-booktarr-text italic text-lg mb-3">
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
                        <span>{new Date(quote.date_added).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {quote.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-booktarr-accent/10 text-booktarr-accent rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                        <button className="text-booktarr-textMuted hover:text-red-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {(!bookDetails.quotes || bookDetails.quotes.length === 0) && !showQuoteForm && (
                  <div className="text-center py-12 text-booktarr-textMuted">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">No quotes yet</h3>
                    <p>Capture your favorite passages and thoughts while reading!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h4 className="font-medium text-booktarr-text">Reading Statistics</h4>
              
              {stats ? (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-booktarr-surface2 p-4 rounded-lg border border-booktarr-border">
                      <div className="text-2xl font-bold text-booktarr-accent">{Math.round(stats.totalTime)}</div>
                      <div className="text-sm text-booktarr-textMuted">Total Reading Time (minutes)</div>
                    </div>
                    
                    <div className="bg-booktarr-surface2 p-4 rounded-lg border border-booktarr-border">
                      <div className="text-2xl font-bold text-booktarr-accent">{stats.totalPages}</div>
                      <div className="text-sm text-booktarr-textMuted">Pages Read</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-booktarr-surface2 p-4 rounded-lg border border-booktarr-border">
                      <div className="text-2xl font-bold text-booktarr-accent">{stats.avgPagesPerHour}</div>
                      <div className="text-sm text-booktarr-textMuted">Average Pages/Hour</div>
                    </div>
                    
                    <div className="bg-booktarr-surface2 p-4 rounded-lg border border-booktarr-border">
                      <div className="text-2xl font-bold text-booktarr-accent">{stats.sessionsCount}</div>
                      <div className="text-sm text-booktarr-textMuted">Reading Sessions</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-booktarr-textMuted">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-medium mb-2">No reading data yet</h3>
                  <p>Start reading to see your statistics!</p>
                </div>
              )}
            </div>
          )}

          {/* Editions Tab */}
          {activeTab === 'editions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-booktarr-text">Available Editions</h4>
                <div className="text-sm text-booktarr-textSecondary">
                  {bookDetails.editions.length} edition{bookDetails.editions.length !== 1 ? 's' : ''} found
                </div>
              </div>
              
              <div className="space-y-4">
                {bookDetails.editions.map((edition) => {
                  const isSelected = edition.isbn === selectedEdition;
                  const isOwned = bookDetails.ownership?.owned_editions?.includes(edition.isbn);
                  
                  return (
                    <div 
                      key={edition.isbn}
                      className={`border rounded-lg p-6 cursor-pointer transition-all hover:shadow-md ${
                        isSelected 
                          ? 'border-booktarr-accent bg-booktarr-accent/5 shadow-md' 
                          : 'border-booktarr-border hover:border-booktarr-accent/50'
                      }`}
                      onClick={() => setSelectedEdition(edition.isbn)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-medium text-booktarr-text">
                              {getEditionTypeLabel(edition.edition_type)}
                            </h3>
                            {isOwned && (
                              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                                ✓ Owned
                              </span>
                            )}
                            {isSelected && (
                              <span className="px-3 py-1 bg-booktarr-accent text-white text-sm rounded-full font-medium">
                                Selected
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-6 mb-4">
                            <div>
                              <span className="text-sm text-booktarr-textMuted">ISBN:</span>
                              <p className="text-booktarr-text font-mono text-sm">{edition.isbn}</p>
                            </div>
                            <div>
                              <span className="text-sm text-booktarr-textMuted">Publisher:</span>
                              <p className="text-booktarr-text">{edition.publisher || 'Unknown'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-booktarr-textMuted">Published:</span>
                              <p className="text-booktarr-text">{formatDate(edition.published_date)}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-6">
                            <div>
                              <span className="text-sm text-booktarr-textMuted">Pages:</span>
                              <p className="text-booktarr-text">{edition.page_count || 'Unknown'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-booktarr-textMuted">Language:</span>
                              <p className="text-booktarr-text">{edition.language.toUpperCase()}</p>
                            </div>
                            <div>
                              <span className="text-sm text-booktarr-textMuted">Added:</span>
                              <p className="text-booktarr-text">{new Date(edition.added_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          {edition.pricing && edition.pricing.length > 0 && (
                            <div className="mt-4">
                              <span className="text-sm text-booktarr-textMuted">Pricing:</span>
                              <div className="flex items-center space-x-4 mt-1">
                                {edition.pricing.map((price, index) => (
                                  <div key={index} className="flex items-center space-x-2">
                                    <span className="text-booktarr-text font-medium">
                                      {new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: price.currency,
                                      }).format(price.price)}
                                    </span>
                                    <span className="text-xs text-booktarr-textMuted">({price.source})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-6">
                          {edition.thumbnail_url && (
                            <div className="w-16 h-24 mb-3">
                              <img
                                src={edition.thumbnail_url}
                                alt={bookDetails.title}
                                className="w-full h-full object-cover rounded shadow"
                              />
                            </div>
                          )}
                          
                          {!isOwned && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // handleEditionSelect(edition.isbn, true);
                              }}
                              className="booktarr-btn booktarr-btn-primary booktarr-btn-sm"
                            >
                              Mark as Owned
                            </button>
                          )}
                          {!isSelected && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEdition(edition.isbn);
                              }}
                              className="booktarr-btn booktarr-btn-secondary booktarr-btn-sm"
                            >
                              Select Edition
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookDetailsPage;