/**
 * BookDetailsPage - Main orchestrator for book details view
 * Refactored for better maintainability and code organization
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import LoadingSpinner from '../LoadingSpinner';
import MetadataEditor from '../MetadataEditor';
import BookDetailsHeader from './BookDetailsHeader';
import BookInfoSection from './BookInfoSection';
import BookOwnershipPanel from './BookOwnershipPanel';
import QuoteForm from './QuoteForm';
import OverviewTab from './tabs/OverviewTab';
import ProgressTab from './tabs/ProgressTab';
import QuotesTab from './tabs/QuotesTab';
import StatsTab from './tabs/StatsTab';
import EditionsTab from './tabs/EditionsTab';

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

  reading_sessions?: ReadingSession[];
  quotes?: BookQuote[];
  tags?: string[];
  collections?: string[];

  added_date: string;
  last_updated: string;
}

interface BookDetailsPageProps {
  bookId?: string;
  isbn?: string;
  onBack: () => void;
  onSeriesClick?: (seriesName: string) => void;
}

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
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  // Review and rating state
  const [personalRating, setPersonalRating] = useState<number>(0);
  const [personalReview, setPersonalReview] = useState('');
  const [editingReview, setEditingReview] = useState(false);

  // Tags state
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Reading goals state
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

    console.log('Reading session ended:', {
      duration: Math.round(duration / 1000 / 60),
      pagesRead,
      startTime: readingStartTime,
      endTime
    });

    setIsReading(false);
    setReadingStartTime(null);
  };

  const refreshMetadata = async () => {
    if (!bookDetails?.series) {
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

  const addQuote = (text: string, pageNumber?: number) => {
    const newQuote: BookQuote = {
      id: Date.now().toString(),
      text,
      page_number: pageNumber,
      date_added: new Date().toISOString(),
      tags: []
    };

    console.log('Adding quote:', newQuote);
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
      <BookDetailsHeader
        onBack={onBack}
        isReading={isReading}
        onStartReading={startReadingSession}
        onStopReading={endReadingSession}
        onAddQuote={() => setShowQuoteForm(!showQuoteForm)}
        onRefreshMetadata={refreshMetadata}
      />

      {/* Main Book Info Card */}
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

            <BookInfoSection
              title={bookDetails.title}
              authors={bookDetails.authors}
              series={bookDetails.series}
              seriesPosition={bookDetails.series_position}
              publisher={bookDetails.publisher}
              publishedDate={bookDetails.published_date}
              pageCount={bookDetails.page_count}
              language={bookDetails.language}
              description={bookDetails.description}
              customTags={customTags}
              newTag={newTag}
              onSeriesClick={onSeriesClick}
              onEditMetadata={() => setShowMetadataEditor(true)}
              onAddTag={addTag}
              onRemoveTag={removeTag}
              onNewTagChange={setNewTag}
              onNewTagKeyPress={(e) => e.key === 'Enter' && addTag()}
            />

            <BookOwnershipPanel
              ownership={bookDetails.ownership}
              personalRating={personalRating}
              personalReview={personalReview}
              editingReview={editingReview}
              onRatingChange={setPersonalRating}
              onReviewChange={setPersonalReview}
              onEditReview={() => setEditingReview(true)}
              onSaveReview={() => setEditingReview(false)}
              onCancelReview={() => setEditingReview(false)}
            />
          </div>
        </div>
      </div>

      {/* Quote Form */}
      {showQuoteForm && (
        <QuoteForm
          onAddQuote={addQuote}
          onCancel={() => setShowQuoteForm(false)}
        />
      )}

      {/* Tabbed Content */}
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
          {activeTab === 'overview' && (
            <OverviewTab bookDetails={bookDetails} />
          )}

          {activeTab === 'progress' && (
            <ProgressTab
              ownership={bookDetails.ownership}
              readingSessions={bookDetails.reading_sessions}
              readingGoal={readingGoal}
              onReadingGoalChange={setReadingGoal}
            />
          )}

          {activeTab === 'quotes' && (
            <QuotesTab quotes={bookDetails.quotes} />
          )}

          {activeTab === 'stats' && (
            <StatsTab readingStats={readingStats} />
          )}

          {activeTab === 'editions' && (
            <EditionsTab
              editions={bookDetails.editions}
              selectedEdition={selectedEdition}
              onSelectEdition={setSelectedEdition}
            />
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
