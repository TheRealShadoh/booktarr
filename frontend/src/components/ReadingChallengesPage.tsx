/**
 * Reading challenges and goals page
 */
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { BooksBySeriesMap, Book, ReadingStatus } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface ReadingChallengesPageProps {
  books: BooksBySeriesMap;
  loading: boolean;
  error: string | null;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'book_count' | 'page_count' | 'series_completion' | 'category_exploration' | 'author_diversity' | 'custom';
  target: number;
  current: number;
  unit: string;
  deadline?: Date;
  completed: boolean;
  progress: number; // 0-100
  icon: React.ReactNode;
  color: string;
}

interface ReadingGoal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  deadline: Date;
  category?: string;
  author?: string;
  series?: string;
  completed: boolean;
  progress: number;
}

const ReadingChallengesPage: React.FC<ReadingChallengesPageProps> = ({
  books,
  loading,
  error
}) => {
  const { showToast } = useAppContext();
  const [activeTab, setActiveTab] = useState<'challenges' | 'goals' | 'achievements'>('challenges');
  const [showCompletedChallenges, setShowCompletedChallenges] = useState(false);
  const [newGoalModalOpen, setNewGoalModalOpen] = useState(false);
  const [customGoals, setCustomGoals] = useState<ReadingGoal[]>([]);

  // Calculate reading statistics
  const readingStats = useMemo(() => {
    const allBooks = Object.values(books).flat();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    const thisYearBooks = allBooks.filter(book => {
      if (book.reading_status !== ReadingStatus.READ) return false;
      const readDate = new Date(book.last_updated);
      return readDate.getFullYear() === currentYear;
    });

    const thisMonthBooks = allBooks.filter(book => {
      if (book.reading_status !== ReadingStatus.READ) return false;
      const readDate = new Date(book.last_updated);
      return readDate.getFullYear() === currentYear && readDate.getMonth() === currentMonth;
    });

    const totalPagesThisYear = thisYearBooks.reduce((sum, book) => sum + (book.page_count || 0), 0);
    const uniqueAuthorsThisYear = new Set(thisYearBooks.flatMap(book => book.authors)).size;
    const uniqueCategoriesThisYear = new Set(thisYearBooks.flatMap(book => book.categories)).size;
    
    const completedSeries = Object.entries(books)
      .filter(([seriesName]) => seriesName !== 'Standalone')
      .filter(([, seriesBooks]) => {
        const positions = seriesBooks
          .map(book => book.series_position)
          .filter(pos => pos !== null && pos !== undefined) as number[];
        
        if (positions.length === 0) return false;
        const maxPosition = Math.max(...positions);
        return Array.from({ length: maxPosition }, (_, i) => i + 1)
          .every(pos => positions.includes(pos));
      }).length;

    return {
      booksThisYear: thisYearBooks.length,
      booksThisMonth: thisMonthBooks.length,
      pagesThisYear: totalPagesThisYear,
      authorsThisYear: uniqueAuthorsThisYear,
      categoriesThisYear: uniqueCategoriesThisYear,
      completedSeries,
      totalBooks: allBooks.filter(book => book.reading_status === ReadingStatus.READ).length,
      totalPages: allBooks.filter(book => book.reading_status === ReadingStatus.READ)
        .reduce((sum, book) => sum + (book.page_count || 0), 0)
    };
  }, [books]);

  // Generate challenges based on reading history
  const challenges = useMemo((): Challenge[] => {
    const baseYear = readingStats.booksThisYear || 1;
    const basePage = readingStats.pagesThisYear || 1000;
    
    return [
      {
        id: 'annual-reading',
        title: 'Annual Reading Goal',
        description: 'Read 52 books this year (1 book per week)',
        type: 'book_count',
        target: 52,
        current: readingStats.booksThisYear,
        unit: 'books',
        deadline: new Date(new Date().getFullYear(), 11, 31),
        completed: readingStats.booksThisYear >= 52,
        progress: Math.min(100, (readingStats.booksThisYear / 52) * 100),
        color: 'bg-blue-500',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )
      },
      {
        id: 'page-marathon',
        title: 'Page Marathon',
        description: 'Read 15,000 pages this year',
        type: 'page_count',
        target: 15000,
        current: readingStats.pagesThisYear,
        unit: 'pages',
        deadline: new Date(new Date().getFullYear(), 11, 31),
        completed: readingStats.pagesThisYear >= 15000,
        progress: Math.min(100, (readingStats.pagesThisYear / 15000) * 100),
        color: 'bg-green-500',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      },
      {
        id: 'author-explorer',
        title: 'Author Explorer',
        description: 'Read books from 25 different authors this year',
        type: 'author_diversity',
        target: 25,
        current: readingStats.authorsThisYear,
        unit: 'authors',
        deadline: new Date(new Date().getFullYear(), 11, 31),
        completed: readingStats.authorsThisYear >= 25,
        progress: Math.min(100, (readingStats.authorsThisYear / 25) * 100),
        color: 'bg-purple-500',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      },
      {
        id: 'genre-voyager',
        title: 'Genre Voyager',
        description: 'Explore 10 different categories/genres this year',
        type: 'category_exploration',
        target: 10,
        current: readingStats.categoriesThisYear,
        unit: 'genres',
        deadline: new Date(new Date().getFullYear(), 11, 31),
        completed: readingStats.categoriesThisYear >= 10,
        progress: Math.min(100, (readingStats.categoriesThisYear / 10) * 100),
        color: 'bg-orange-500',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
          </svg>
        )
      },
      {
        id: 'series-completionist',
        title: 'Series Completionist',
        description: 'Complete 3 book series this year',
        type: 'series_completion',
        target: 3,
        current: readingStats.completedSeries,
        unit: 'series',
        deadline: new Date(new Date().getFullYear(), 11, 31),
        completed: readingStats.completedSeries >= 3,
        progress: Math.min(100, (readingStats.completedSeries / 3) * 100),
        color: 'bg-red-500',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        )
      },
      {
        id: 'monthly-consistent',
        title: 'Monthly Consistency',
        description: 'Read at least 4 books every month',
        type: 'book_count',
        target: 4,
        current: readingStats.booksThisMonth,
        unit: 'books this month',
        deadline: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
        completed: readingStats.booksThisMonth >= 4,
        progress: Math.min(100, (readingStats.booksThisMonth / 4) * 100),
        color: 'bg-teal-500',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      }
    ];
  }, [readingStats]);

  const visibleChallenges = useMemo(() => {
    return showCompletedChallenges 
      ? challenges 
      : challenges.filter(challenge => !challenge.completed);
  }, [challenges, showCompletedChallenges]);

  const handleCreateCustomGoal = () => {
    // This would open a modal to create custom reading goals
    setNewGoalModalOpen(true);
  };

  const handleCompleteChallenge = (challengeId: string) => {
    showToast('Challenge marked as completed!', 'success');
  };

  const completedChallengesCount = challenges.filter(c => c.completed).length;
  const totalChallengesCount = challenges.length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message="Loading challenges..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-booktarr-text text-2xl font-bold mb-2">Reading Challenges</h1>
              <p className="text-booktarr-textSecondary text-sm">
                Track your reading goals and challenge yourself to read more
              </p>
            </div>
            <div className="text-booktarr-textSecondary text-sm">
              {completedChallengesCount} of {totalChallengesCount} challenges completed
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="booktarr-card">
        <div className="booktarr-card-body">
          <div className="flex space-x-1 bg-booktarr-surface2 rounded-lg p-1">
            {[
              { id: 'challenges', name: 'Challenges', count: challenges.length },
              { id: 'goals', name: 'Custom Goals', count: customGoals.length },
              { id: 'achievements', name: 'Achievements', count: completedChallengesCount }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-booktarr-accent shadow-sm'
                    : 'text-booktarr-textSecondary hover:text-booktarr-text'
                }`}
              >
                {tab.name} {tab.count > 0 && `(${tab.count})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="booktarr-card">
          <div className="booktarr-card-body text-center">
            <div className="text-2xl font-bold text-booktarr-accent mb-1">{readingStats.booksThisYear}</div>
            <div className="text-sm text-booktarr-textMuted">Books This Year</div>
          </div>
        </div>
        <div className="booktarr-card">
          <div className="booktarr-card-body text-center">
            <div className="text-2xl font-bold text-booktarr-accent mb-1">{readingStats.pagesThisYear.toLocaleString()}</div>
            <div className="text-sm text-booktarr-textMuted">Pages This Year</div>
          </div>
        </div>
        <div className="booktarr-card">
          <div className="booktarr-card-body text-center">
            <div className="text-2xl font-bold text-booktarr-accent mb-1">{readingStats.authorsThisYear}</div>
            <div className="text-sm text-booktarr-textMuted">Authors This Year</div>
          </div>
        </div>
        <div className="booktarr-card">
          <div className="booktarr-card-body text-center">
            <div className="text-2xl font-bold text-booktarr-accent mb-1">{readingStats.booksThisMonth}</div>
            <div className="text-sm text-booktarr-textMuted">Books This Month</div>
          </div>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'challenges' && (
        <div className="space-y-4">
          {/* Filter Controls */}
          <div className="booktarr-card">
            <div className="booktarr-card-body">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showCompletedChallenges}
                    onChange={(e) => setShowCompletedChallenges(e.target.checked)}
                    className="rounded border-booktarr-border"
                  />
                  <span className="text-sm text-booktarr-text">Show completed challenges</span>
                </label>
                <button
                  onClick={handleCreateCustomGoal}
                  className="booktarr-btn booktarr-btn-primary"
                >
                  Create Custom Goal
                </button>
              </div>
            </div>
          </div>

          {/* Challenges Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {visibleChallenges.map(challenge => (
              <div key={challenge.id} className="booktarr-card">
                <div className="booktarr-card-body">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${challenge.color} text-white flex-shrink-0`}>
                      {challenge.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-booktarr-text">{challenge.title}</h3>
                        {challenge.completed && (
                          <div className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            Completed
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-booktarr-textSecondary mb-3">{challenge.description}</p>
                      
                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-booktarr-textMuted">
                            {challenge.current} / {challenge.target} {challenge.unit}
                          </span>
                          <span className="text-booktarr-accent font-medium">
                            {Math.round(challenge.progress)}%
                          </span>
                        </div>
                        <div className="w-full bg-booktarr-surface2 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${challenge.color}`}
                            style={{ width: `${Math.min(100, challenge.progress)}%` }}
                          />
                        </div>
                      </div>

                      {/* Deadline */}
                      {challenge.deadline && (
                        <div className="mt-3 text-xs text-booktarr-textMuted">
                          Deadline: {challenge.deadline.toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'goals' && (
        <div className="booktarr-card">
          <div className="booktarr-card-body">
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <h3 className="text-booktarr-text text-lg font-semibold mb-2">No Custom Goals Yet</h3>
              <p className="text-booktarr-textSecondary text-sm mb-4">
                Create personalized reading goals to track your progress
              </p>
              <button
                onClick={handleCreateCustomGoal}
                className="booktarr-btn booktarr-btn-primary"
              >
                Create Your First Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="space-y-4">
          {challenges.filter(c => c.completed).length === 0 ? (
            <div className="booktarr-card">
              <div className="booktarr-card-body">
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <h3 className="text-booktarr-text text-lg font-semibold mb-2">No Achievements Yet</h3>
                  <p className="text-booktarr-textSecondary text-sm">
                    Complete reading challenges to unlock achievements
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {challenges.filter(c => c.completed).map(challenge => (
                <div key={challenge.id} className="booktarr-card">
                  <div className="booktarr-card-body text-center">
                    <div className={`p-4 rounded-full ${challenge.color} text-white w-16 h-16 mx-auto mb-3 flex items-center justify-center`}>
                      {challenge.icon}
                    </div>
                    <h3 className="font-semibold text-booktarr-text mb-1">{challenge.title}</h3>
                    <p className="text-sm text-booktarr-textSecondary mb-2">{challenge.description}</p>
                    <div className="text-xs text-booktarr-textMuted">
                      Completed: {challenge.current} {challenge.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReadingChallengesPage;