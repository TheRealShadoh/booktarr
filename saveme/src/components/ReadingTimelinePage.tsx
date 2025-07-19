/**
 * Reading activity timeline page showing reading history and progress
 */
import React, { useState, useMemo } from 'react';
import { BooksBySeriesMap, Book, ReadingStatus } from '../types';
import BookCard from './BookCard';
import LoadingSpinner from './LoadingSpinner';

interface ReadingTimelinePageProps {
  books: BooksBySeriesMap;
  loading: boolean;
  error: string | null;
  onBookClick?: (book: Book) => void;
}

interface TimelineEvent {
  id: string;
  date: Date;
  type: 'book_added' | 'book_started' | 'book_finished' | 'book_rated' | 'milestone' | 'goal_reached';
  book?: Book;
  description: string;
  icon: React.ReactNode;
  color: string;
  metadata?: {
    rating?: number;
    milestone?: string;
    goal?: string;
  };
}

const ReadingTimelinePage: React.FC<ReadingTimelinePageProps> = ({
  books,
  loading,
  error,
  onBookClick
}) => {
  const [timeFilter, setTimeFilter] = useState<'all' | 'year' | 'month' | 'week'>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  // Generate timeline events from book data
  const timelineEvents = useMemo((): TimelineEvent[] => {
    const allBooks = Object.values(books).flat();
    const events: TimelineEvent[] = [];

    // Add book events
    allBooks.forEach(book => {
      // Book added event
      events.push({
        id: `added-${book.isbn}`,
        date: new Date(book.added_date),
        type: 'book_added',
        book,
        description: `Added "${book.title}" to library`,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        ),
        color: 'bg-blue-500'
      });

      // Book finished event (for read books)
      if (book.reading_status === ReadingStatus.READ) {
        events.push({
          id: `finished-${book.isbn}`,
          date: new Date(book.last_updated),
          type: 'book_finished',
          book,
          description: `Finished reading "${book.title}"`,
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
            </svg>
          ),
          color: 'bg-green-500'
        });

        // Book rated event
        if (book.personal_rating && book.personal_rating > 0) {
          events.push({
            id: `rated-${book.isbn}`,
            date: new Date(book.last_updated),
            type: 'book_rated',
            book,
            description: `Rated "${book.title}" ${book.personal_rating}/5 stars`,
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            ),
            color: 'bg-yellow-500',
            metadata: { rating: book.personal_rating }
          });
        }
      }

      // Book started event (for currently reading)
      if (book.reading_status === ReadingStatus.READING) {
        events.push({
          id: `started-${book.isbn}`,
          date: new Date(book.last_updated),
          type: 'book_started',
          book,
          description: `Started reading "${book.title}"`,
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
          color: 'bg-orange-500'
        });
      }
    });

    // Generate milestone events
    const readBooks = allBooks.filter(book => book.reading_status === ReadingStatus.READ);
    const milestones = [10, 25, 50, 100, 200, 300, 500, 1000];

    milestones.forEach(milestone => {
      if (readBooks.length >= milestone) {
        // Find the book that completed this milestone
        const milestoneBook = readBooks
          .sort((a, b) => new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime())[milestone - 1];
        
        if (milestoneBook) {
          events.push({
            id: `milestone-${milestone}`,
            date: new Date(milestoneBook.last_updated),
            type: 'milestone',
            book: milestoneBook,
            description: `Reached ${milestone} books read!`,
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            ),
            color: 'bg-purple-500',
            metadata: { milestone: `${milestone} books` }
          });
        }
      }
    });

    // Sort events by date (newest first)
    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [books]);

  // Filter events by time period
  const filteredEvents = useMemo(() => {
    let filtered = timelineEvents;

    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();

      switch (timeFilter) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(event => event.date >= cutoffDate);
    }

    // Apply event type filter
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(event => event.type === eventTypeFilter);
    }

    return filtered;
  }, [timelineEvents, timeFilter, eventTypeFilter]);

  // Group events by date for better organization
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();

    filteredEvents.forEach(event => {
      const dateKey = event.date.toDateString();
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(event);
    });

    return Array.from(groups.entries()).map(([date, events]) => ({
      date,
      events: events.sort((a, b) => b.date.getTime() - a.date.getTime())
    }));
  }, [filteredEvents]);

  // Calculate reading statistics
  const stats = useMemo(() => {
    const allBooks = Object.values(books).flat();
    const readBooks = allBooks.filter(book => book.reading_status === ReadingStatus.READ);
    
    const currentYear = new Date().getFullYear();
    const booksThisYear = readBooks.filter(book => 
      new Date(book.last_updated).getFullYear() === currentYear
    );

    const currentMonth = new Date().getMonth();
    const booksThisMonth = readBooks.filter(book => {
      const bookDate = new Date(book.last_updated);
      return bookDate.getFullYear() === currentYear && bookDate.getMonth() === currentMonth;
    });

    return {
      totalRead: readBooks.length,
      thisYear: booksThisYear.length,
      thisMonth: booksThisMonth.length,
      averageRating: readBooks.filter(book => book.personal_rating && book.personal_rating > 0)
        .reduce((sum, book, _, arr) => sum + (book.personal_rating || 0) / arr.length, 0)
    };
  }, [books]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message="Loading timeline..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h1 className="text-booktarr-text text-2xl font-bold mb-2">Reading Timeline</h1>
          <p className="text-booktarr-textSecondary text-sm">
            Track your reading journey with a visual timeline of your activity
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="booktarr-card">
          <div className="booktarr-card-body text-center">
            <div className="text-2xl font-bold text-booktarr-accent mb-1">{stats.totalRead}</div>
            <div className="text-sm text-booktarr-textMuted">Total Books Read</div>
          </div>
        </div>
        <div className="booktarr-card">
          <div className="booktarr-card-body text-center">
            <div className="text-2xl font-bold text-booktarr-accent mb-1">{stats.thisYear}</div>
            <div className="text-sm text-booktarr-textMuted">This Year</div>
          </div>
        </div>
        <div className="booktarr-card">
          <div className="booktarr-card-body text-center">
            <div className="text-2xl font-bold text-booktarr-accent mb-1">{stats.thisMonth}</div>
            <div className="text-sm text-booktarr-textMuted">This Month</div>
          </div>
        </div>
        <div className="booktarr-card">
          <div className="booktarr-card-body text-center">
            <div className="text-2xl font-bold text-booktarr-accent mb-1">{stats.averageRating.toFixed(1)}</div>
            <div className="text-sm text-booktarr-textMuted">Avg Rating</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="booktarr-card">
        <div className="booktarr-card-body">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-booktarr-text">Time Period:</label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                className="booktarr-form-input min-w-0 text-sm"
              >
                <option value="all">All Time</option>
                <option value="year">Last Year</option>
                <option value="month">Last Month</option>
                <option value="week">Last Week</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-booktarr-text">Event Type:</label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="booktarr-form-input min-w-0 text-sm"
              >
                <option value="all">All Events</option>
                <option value="book_added">Books Added</option>
                <option value="book_started">Started Reading</option>
                <option value="book_finished">Finished Reading</option>
                <option value="book_rated">Book Ratings</option>
                <option value="milestone">Milestones</option>
              </select>
            </div>
            <div className="text-sm text-booktarr-textMuted">
              {filteredEvents.length} events
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="booktarr-card">
        <div className="booktarr-card-body">
          {groupedEvents.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-booktarr-text text-lg font-semibold mb-2">No Events Found</h3>
              <p className="text-booktarr-textSecondary text-sm">
                Try adjusting your filters or start reading some books to see your timeline.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedEvents.map(({ date, events }) => (
                <div key={date} className="relative">
                  {/* Date Header */}
                  <div className="sticky top-0 bg-booktarr-surface border-b border-booktarr-border py-2 mb-4">
                    <h3 className="text-lg font-semibold text-booktarr-text">
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h3>
                  </div>

                  {/* Events for this date */}
                  <div className="space-y-4">
                    {events.map((event, index) => (
                      <div key={event.id} className="flex items-start space-x-4">
                        {/* Timeline indicator */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full ${event.color} text-white flex items-center justify-center flex-shrink-0`}>
                            {event.icon}
                          </div>
                          {index < events.length - 1 && (
                            <div className="w-0.5 h-6 bg-booktarr-border mt-2"></div>
                          )}
                        </div>

                        {/* Event content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-booktarr-text font-medium">{event.description}</p>
                              <p className="text-sm text-booktarr-textMuted">
                                {event.date.toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                                {event.metadata?.milestone && (
                                  <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                    Milestone: {event.metadata.milestone}
                                  </span>
                                )}
                                {event.metadata?.rating && (
                                  <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                    {event.metadata.rating}/5 stars
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Book card for book-related events */}
                          {event.book && (
                            <div className="mt-3 max-w-xs">
                              <BookCard
                                book={event.book}
                                onClick={() => onBookClick?.(event.book!)}
                                className="transform scale-75 origin-left"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReadingTimelinePage;