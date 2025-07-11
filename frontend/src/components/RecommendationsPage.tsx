/**
 * Recommendations page with AI-powered book suggestions
 */
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { BooksBySeriesMap, Book, ReadingStatus } from '../types';
import BookCard from './BookCard';
import LoadingSpinner from './LoadingSpinner';

interface RecommendationsPageProps {
  books: BooksBySeriesMap;
  loading: boolean;
  error: string | null;
  onBookClick?: (book: Book) => void;
}

interface Recommendation {
  type: 'author' | 'series' | 'category' | 'similar_rating' | 'trending';
  title: string;
  description: string;
  books: Book[];
  confidence: number;
}

const RecommendationsPage: React.FC<RecommendationsPageProps> = ({
  books,
  loading,
  error,
  onBookClick
}) => {
  const { showToast } = useAppContext();
  const [selectedRecommendationType, setSelectedRecommendationType] = useState<string>('all');
  const [showRecommendationDetails, setShowRecommendationDetails] = useState(false);

  // Generate recommendations based on user's library
  const recommendations = useMemo((): Recommendation[] => {
    const allBooks = Object.values(books).flat();
    const readBooks = allBooks.filter(book => book.reading_status === ReadingStatus.READ);
    const currentlyReading = allBooks.filter(book => book.reading_status === ReadingStatus.READING);
    const unreadBooks = allBooks.filter(book => book.reading_status === ReadingStatus.UNREAD);
    
    const recommendations: Recommendation[] = [];

    // Author-based recommendations
    const authorCounts = new Map<string, number>();
    const authorRatings = new Map<string, number[]>();
    
    readBooks.forEach(book => {
      book.authors.forEach(author => {
        authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
        if (book.personal_rating && book.personal_rating > 0) {
          if (!authorRatings.has(author)) {
            authorRatings.set(author, []);
          }
          authorRatings.get(author)!.push(book.personal_rating);
        }
      });
    });

    // Find favorite authors (high rating + multiple books)
    const favoriteAuthors = Array.from(authorRatings.entries())
      .filter(([author, ratings]) => {
        const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        return avgRating >= 4.0 && authorCounts.get(author)! >= 2;
      })
      .sort((a, b) => {
        const avgA = a[1].reduce((sum, r) => sum + r, 0) / a[1].length;
        const avgB = b[1].reduce((sum, r) => sum + r, 0) / b[1].length;
        return avgB - avgA;
      })
      .slice(0, 3);

    favoriteAuthors.forEach(([author, ratings]) => {
      const authorBooks = unreadBooks.filter(book => book.authors.includes(author));
      if (authorBooks.length > 0) {
        const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        recommendations.push({
          type: 'author',
          title: `More from ${author}`,
          description: `You rated this author's books ${avgRating.toFixed(1)}/5 on average`,
          books: authorBooks.slice(0, 6),
          confidence: Math.min(95, 70 + (avgRating - 4) * 25)
        });
      }
    });

    // Series completion recommendations
    const incompleteSeriesList = Object.entries(books)
      .filter(([seriesName]) => seriesName !== 'Standalone')
      .map(([seriesName, seriesBooks]) => {
        const readSeriesBooks = seriesBooks.filter(book => book.reading_status === ReadingStatus.READ);
        const unreadSeriesBooks = seriesBooks.filter(book => book.reading_status === ReadingStatus.UNREAD);
        const avgRating = readSeriesBooks.length > 0 
          ? readSeriesBooks
              .filter(book => book.personal_rating && book.personal_rating > 0)
              .reduce((sum, book) => sum + (book.personal_rating || 0), 0) / readSeriesBooks.length
          : 0;
        
        return {
          seriesName,
          seriesBooks,
          readCount: readSeriesBooks.length,
          unreadCount: unreadSeriesBooks.length,
          unreadBooks: unreadSeriesBooks,
          avgRating
        };
      })
      .filter(series => series.readCount > 0 && series.unreadCount > 0 && series.avgRating >= 3.5)
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 3);

    incompleteSeriesList.forEach(series => {
      recommendations.push({
        type: 'series',
        title: `Continue ${series.seriesName}`,
        description: `You've read ${series.readCount} books with ${series.avgRating.toFixed(1)}/5 average rating`,
        books: series.unreadBooks.slice(0, 6),
        confidence: Math.min(90, 60 + series.avgRating * 10)
      });
    });

    // Category-based recommendations
    const categoryCounts = new Map<string, number>();
    const categoryRatings = new Map<string, number[]>();
    
    readBooks.forEach(book => {
      book.categories.forEach(category => {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        if (book.personal_rating && book.personal_rating > 0) {
          if (!categoryRatings.has(category)) {
            categoryRatings.set(category, []);
          }
          categoryRatings.get(category)!.push(book.personal_rating);
        }
      });
    });

    const favoriteCategories = Array.from(categoryRatings.entries())
      .filter(([category, ratings]) => {
        const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        return avgRating >= 3.8 && categoryCounts.get(category)! >= 3;
      })
      .sort((a, b) => {
        const avgA = a[1].reduce((sum, r) => sum + r, 0) / a[1].length;
        const avgB = b[1].reduce((sum, r) => sum + r, 0) / b[1].length;
        return avgB - avgA;
      })
      .slice(0, 2);

    favoriteCategories.forEach(([category, ratings]) => {
      const categoryBooks = unreadBooks.filter(book => book.categories.includes(category));
      if (categoryBooks.length > 0) {
        const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        recommendations.push({
          type: 'category',
          title: `More ${category}`,
          description: `You rated ${category} books ${avgRating.toFixed(1)}/5 on average`,
          books: categoryBooks.slice(0, 6),
          confidence: Math.min(85, 50 + avgRating * 10)
        });
      }
    });

    // Similar rating recommendations (books with similar ratings to ones you enjoyed)
    const highRatedBooks = readBooks.filter(book => book.personal_rating && book.personal_rating >= 4.0);
    if (highRatedBooks.length > 0) {
      // Find unread books from same authors/categories as high-rated books
      const highRatedAuthors = new Set(highRatedBooks.flatMap(book => book.authors));
      const highRatedCategories = new Set(highRatedBooks.flatMap(book => book.categories));
      
      const similarBooks = unreadBooks.filter(book => 
        book.authors.some(author => highRatedAuthors.has(author)) ||
        book.categories.some(category => highRatedCategories.has(category))
      ).slice(0, 8);

      if (similarBooks.length > 0) {
        recommendations.push({
          type: 'similar_rating',
          title: 'Similar to Your Favorites',
          description: `Based on books you rated 4+ stars`,
          books: similarBooks,
          confidence: 75
        });
      }
    }

    // Currently reading continuation
    if (currentlyReading.length > 0) {
      recommendations.unshift({
        type: 'trending',
        title: 'Continue Reading',
        description: `Pick up where you left off`,
        books: currentlyReading,
        confidence: 100
      });
    }

    // Random discovery (low priority)
    const randomBooks = unreadBooks
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);
    
    if (randomBooks.length > 0) {
      recommendations.push({
        type: 'trending',
        title: 'Discover Something New',
        description: 'Random selections from your unread collection',
        books: randomBooks,
        confidence: 30
      });
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }, [books]);

  const filteredRecommendations = useMemo(() => {
    if (selectedRecommendationType === 'all') {
      return recommendations;
    }
    return recommendations.filter(rec => rec.type === selectedRecommendationType);
  }, [recommendations, selectedRecommendationType]);

  const handleExportRecommendations = () => {
    const recommendationsData = recommendations.map(rec => ({
      type: rec.type,
      title: rec.title,
      description: rec.description,
      confidence: rec.confidence,
      books: rec.books.map(book => ({
        title: book.title,
        authors: book.authors,
        isbn: book.isbn,
        series: book.series,
        series_position: book.series_position
      }))
    }));

    const dataStr = JSON.stringify(recommendationsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booktarr-recommendations-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('Recommendations exported successfully', 'success');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" message="Generating recommendations..." />
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
              <h1 className="text-booktarr-text text-2xl font-bold mb-2">Recommendations</h1>
              <p className="text-booktarr-textSecondary text-sm">
                Personalized book recommendations based on your reading history and preferences
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowRecommendationDetails(!showRecommendationDetails)}
                className="booktarr-btn booktarr-btn-secondary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {showRecommendationDetails ? 'Hide' : 'Show'} Details
              </button>
              <button
                onClick={handleExportRecommendations}
                className="booktarr-btn booktarr-btn-primary"
                disabled={recommendations.length === 0}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="booktarr-card">
        <div className="booktarr-card-body">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', name: 'All Recommendations', count: recommendations.length },
              { id: 'author', name: 'By Author', count: recommendations.filter(r => r.type === 'author').length },
              { id: 'series', name: 'Series Completion', count: recommendations.filter(r => r.type === 'series').length },
              { id: 'category', name: 'By Category', count: recommendations.filter(r => r.type === 'category').length },
              { id: 'similar_rating', name: 'Similar Favorites', count: recommendations.filter(r => r.type === 'similar_rating').length },
              { id: 'trending', name: 'Continue Reading', count: recommendations.filter(r => r.type === 'trending').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedRecommendationType(tab.id)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  selectedRecommendationType === tab.id
                    ? 'border-booktarr-accent bg-booktarr-accent bg-opacity-10 text-booktarr-accent'
                    : 'border-booktarr-border text-booktarr-textSecondary hover:border-booktarr-hover'
                }`}
                disabled={tab.count === 0}
              >
                {tab.name} {tab.count > 0 && `(${tab.count})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {filteredRecommendations.length === 0 ? (
        <div className="booktarr-card">
          <div className="booktarr-card-body">
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="text-booktarr-text text-lg font-semibold mb-2">No Recommendations Available</h3>
              <p className="text-booktarr-textSecondary text-sm">
                Start reading and rating books to get personalized recommendations.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRecommendations.map((recommendation, index) => (
            <div key={`${recommendation.type}-${index}`} className="booktarr-card">
              <div className="booktarr-card-header">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-booktarr-text">{recommendation.title}</h2>
                    <p className="text-booktarr-textSecondary text-sm mt-1">{recommendation.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      recommendation.confidence >= 80 ? 'bg-green-100 text-green-800' :
                      recommendation.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {recommendation.confidence}% match
                    </div>
                    <div className="px-2 py-1 bg-booktarr-surface2 text-booktarr-textMuted rounded text-xs capitalize">
                      {recommendation.type.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                {showRecommendationDetails && (
                  <div className="mt-3 text-sm text-booktarr-textMuted">
                    <p><strong>Recommendation Logic:</strong> 
                      {recommendation.type === 'author' && ' Based on your high ratings for this author\'s previous works'}
                      {recommendation.type === 'series' && ' Continue series you\'ve already started and enjoyed'}
                      {recommendation.type === 'category' && ' More books from genres you consistently rate highly'}
                      {recommendation.type === 'similar_rating' && ' Books similar to ones you\'ve rated 4+ stars'}
                      {recommendation.type === 'trending' && ' Books you\'re currently reading or random discoveries'}
                    </p>
                  </div>
                )}
              </div>
              <div className="booktarr-card-body">
                {recommendation.books.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-booktarr-textMuted">No books available for this recommendation type.</p>
                  </div>
                ) : (
                  <div className="booktarr-book-grid">
                    {recommendation.books.map(book => (
                      <BookCard
                        key={book.isbn}
                        book={book}
                        onClick={() => onBookClick?.(book)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecommendationsPage;