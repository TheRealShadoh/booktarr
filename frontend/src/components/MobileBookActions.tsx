/**
 * Mobile-optimized book action menu component
 * Provides touch-friendly actions for books on mobile devices
 */
import React, { useState } from 'react';
import { Book, ReadingStatus } from '../types';
import MobileModal from './MobileModal';

interface BookAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
  destructive?: boolean;
}

interface MobileBookActionsProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onUpdateReadingStatus?: (status: ReadingStatus) => void;
  onAddToWishlist?: () => void;
  onRemoveBook?: () => void;
  onEditBook?: () => void;
  onViewDetails?: () => void;
  onRateBook?: (rating: number) => void;
}

const MobileBookActions: React.FC<MobileBookActionsProps> = ({
  book,
  isOpen,
  onClose,
  onUpdateReadingStatus,
  onAddToWishlist,
  onRemoveBook,
  onEditBook,
  onViewDetails,
  onRateBook
}) => {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(book.personal_rating || 0);

  const handleReadingStatusChange = (status: ReadingStatus) => {
    onUpdateReadingStatus?.(status);
    onClose();
  };

  const handleRateBook = () => {
    setShowRatingModal(true);
  };

  const handleRatingSubmit = () => {
    onRateBook?.(selectedRating);
    setShowRatingModal(false);
    onClose();
  };

  // Define available actions based on current book state
  const actions: BookAction[] = [
    {
      id: 'view-details',
      label: 'View Details',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      color: 'text-booktarr-info',
      action: () => {
        onViewDetails?.();
        onClose();
      }
    },
    {
      id: 'mark-want-to-read',
      label: book.reading_status === ReadingStatus.WANT_TO_READ ? 'Remove from Want to Read' : 'Want to Read',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
      color: book.reading_status === ReadingStatus.WANT_TO_READ ? 'text-booktarr-warning' : 'text-booktarr-textSecondary',
      action: () => handleReadingStatusChange(
        book.reading_status === ReadingStatus.WANT_TO_READ ? ReadingStatus.UNREAD : ReadingStatus.WANT_TO_READ
      )
    },
    {
      id: 'mark-reading',
      label: book.reading_status === ReadingStatus.READING ? 'Mark as Not Reading' : 'Currently Reading',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: book.reading_status === ReadingStatus.READING ? 'text-booktarr-success' : 'text-booktarr-textSecondary',
      action: () => handleReadingStatusChange(
        book.reading_status === ReadingStatus.READING ? ReadingStatus.UNREAD : ReadingStatus.READING
      )
    },
    {
      id: 'mark-read',
      label: book.reading_status === ReadingStatus.READ ? 'Mark as Unread' : 'Mark as Read',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: book.reading_status === ReadingStatus.READ ? 'text-booktarr-success' : 'text-booktarr-textSecondary',
      action: () => handleReadingStatusChange(
        book.reading_status === ReadingStatus.READ ? ReadingStatus.UNREAD : ReadingStatus.READ
      )
    },
    {
      id: 'rate-book',
      label: book.personal_rating ? `Rated ${book.personal_rating}/5 stars` : 'Rate This Book',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      color: book.personal_rating ? 'text-booktarr-warning' : 'text-booktarr-textSecondary',
      action: handleRateBook
    },
    {
      id: 'edit-book',
      label: 'Edit Book',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      color: 'text-booktarr-textSecondary',
      action: () => {
        onEditBook?.();
        onClose();
      }
    },
    {
      id: 'add-to-wishlist',
      label: 'Add to Wishlist',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      color: 'text-booktarr-error',
      action: () => {
        onAddToWishlist?.();
        onClose();
      }
    },
    {
      id: 'remove-book',
      label: 'Remove Book',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      color: 'text-booktarr-error',
      destructive: true,
      action: () => {
        if (window.confirm(`Remove "${book.title}" from your library?`)) {
          onRemoveBook?.();
          onClose();
        }
      }
    }
  ];

  return (
    <>
      {/* Main Actions Modal */}
      <MobileModal
        isOpen={isOpen && !showRatingModal}
        onClose={onClose}
        title={`Actions for "${book.title}"`}
      >
        <div className="py-2">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.action}
              className={`
                w-full flex items-center px-4 py-4 text-left transition-colors
                ${action.destructive ? 'hover:bg-red-500 hover:bg-opacity-10' : 'hover:bg-booktarr-hover'}
                border-b border-booktarr-border last:border-b-0
                touch-target
              `}
            >
              <div className={`mr-3 ${action.color}`}>
                {action.icon}
              </div>
              <span className={`
                font-medium 
                ${action.destructive ? 'text-booktarr-error' : 'text-booktarr-text'}
              `}>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </MobileModal>

      {/* Rating Modal */}
      <MobileModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        title="Rate This Book"
        showCloseButton={true}
      >
        <div className="p-6 text-center">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-booktarr-text mb-2">
              {book.title}
            </h3>
            <p className="text-sm text-booktarr-textSecondary">
              by {book.authors.join(', ')}
            </p>
          </div>

          {/* Star Rating Input */}
          <div className="flex justify-center mb-6 space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setSelectedRating(star)}
                className={`
                  w-12 h-12 touch-target transition-all duration-200
                  ${star <= selectedRating 
                    ? 'text-yellow-400 scale-110' 
                    : 'text-booktarr-textMuted hover:text-yellow-300 hover:scale-105'
                  }
                `}
              >
                <svg
                  className="w-full h-full"
                  fill="currentColor"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={star <= selectedRating ? 0 : 1}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </button>
            ))}
          </div>

          <div className="text-sm text-booktarr-textSecondary mb-6">
            {selectedRating === 0 && "Tap a star to rate"}
            {selectedRating === 1 && "Didn't like it"}
            {selectedRating === 2 && "It was okay"}
            {selectedRating === 3 && "Liked it"}
            {selectedRating === 4 && "Really liked it"}
            {selectedRating === 5 && "It was amazing!"}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => setShowRatingModal(false)}
              className="flex-1 booktarr-btn booktarr-btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleRatingSubmit}
              disabled={selectedRating === 0}
              className="flex-1 booktarr-btn booktarr-btn-primary disabled:opacity-50"
            >
              Rate Book
            </button>
          </div>
        </div>
      </MobileModal>
    </>
  );
};

export default MobileBookActions;