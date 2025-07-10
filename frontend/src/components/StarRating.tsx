/**
 * Star Rating Component
 * Interactive star rating for books
 */
import React, { useState } from 'react';

interface StarRatingProps {
  rating?: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showText?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating = 0,
  onRatingChange,
  readonly = false,
  size = 'medium',
  className = '',
  showText = false
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  const handleStarClick = (starValue: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(starValue);
    }
  };

  const handleStarHover = (starValue: number) => {
    if (!readonly) {
      setHoverRating(starValue);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(0);
    }
  };

  const getStarFill = (starIndex: number) => {
    const currentRating = hoverRating || rating;
    if (currentRating >= starIndex) {
      return 'text-yellow-400';
    } else if (currentRating >= starIndex - 0.5) {
      return 'text-yellow-300';
    } else {
      return 'text-gray-300 dark:text-gray-600';
    }
  };

  const getRatingText = (rating: number) => {
    if (rating === 0) return 'Not rated';
    if (rating <= 1) return 'Poor';
    if (rating <= 2) return 'Fair';
    if (rating <= 3) return 'Good';
    if (rating <= 4) return 'Very Good';
    return 'Excellent';
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div 
        className="flex items-center space-x-1"
        onMouseLeave={handleMouseLeave}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`
              ${sizeClasses[size]} 
              ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
              transition-all duration-150 
              ${getStarFill(star)}
            `}
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => handleStarHover(star)}
            disabled={readonly}
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
          >
            <svg
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
      
      {showText && (
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          {getRatingText(hoverRating || rating)}
          {(hoverRating || rating) > 0 && ` (${(hoverRating || rating).toFixed(1)})`}
        </span>
      )}
    </div>
  );
};

export default StarRating;