/**
 * BookOwnershipPanel - Ownership status and rating display
 */
import React from 'react';

const STAR_RATINGS = [1, 2, 3, 4, 5];

interface Ownership {
  status: 'own' | 'want' | 'missing';
  reading_progress_percentage?: number;
}

interface BookOwnershipPanelProps {
  ownership?: Ownership;
  personalRating: number;
  personalReview: string;
  editingReview: boolean;
  onRatingChange: (rating: number) => void;
  onReviewChange: (review: string) => void;
  onEditReview: () => void;
  onSaveReview: () => void;
  onCancelReview: () => void;
}

const BookOwnershipPanel: React.FC<BookOwnershipPanelProps> = ({
  ownership,
  personalRating,
  personalReview,
  editingReview,
  onRatingChange,
  onReviewChange,
  onEditReview,
  onSaveReview,
  onCancelReview
}) => {
  return (
    <div className="md:col-span-1 space-y-4">
      {/* Ownership Status */}
      <div className="p-4 bg-booktarr-cardBg rounded-lg">
        <h3 className="font-medium text-booktarr-text mb-3">Ownership</h3>
        <div className="space-y-2">
          <div className={`px-3 py-2 rounded-full text-sm text-center ${
            ownership?.status === 'own'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : ownership?.status === 'want'
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
              : 'bg-gray-100 text-gray-800 border border-gray-200'
          }`}>
            {ownership?.status === 'own' ? '✓ Owned' :
             ownership?.status === 'want' ? '⭐ Wanted' : '❌ Missing'}
          </div>

          {ownership?.reading_progress_percentage && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-booktarr-textMuted mb-1">
                <span>Progress</span>
                <span>{ownership.reading_progress_percentage}%</span>
              </div>
              <div className="w-full bg-booktarr-border rounded-full h-2">
                <div
                  className="bg-booktarr-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${ownership.reading_progress_percentage}%` }}
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
                onClick={() => onRatingChange(star)}
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
                onChange={(e) => onReviewChange(e.target.value)}
                className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                rows={3}
                placeholder="What did you think of this book?"
              />
              <div className="flex space-x-2">
                <button
                  onClick={onSaveReview}
                  className="px-3 py-1 bg-booktarr-accent text-white text-sm rounded hover:bg-booktarr-accent/90"
                >
                  Save
                </button>
                <button
                  onClick={onCancelReview}
                  className="px-3 py-1 bg-booktarr-border text-booktarr-textMuted text-sm rounded hover:bg-booktarr-border/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={onEditReview}
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
  );
};

export default BookOwnershipPanel;
