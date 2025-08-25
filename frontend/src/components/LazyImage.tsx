/**
 * Lazy Loading Image Component for Performance Optimization
 * Loads images only when they enter the viewport
 */
import React, { useState, useCallback } from 'react';
import { useIntersectionObserver } from '../hooks/usePerformance';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder,
  fallback = '/api/placeholder-image',
  onLoad,
  onError
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageSrc, setImageSrc] = useState<string>('');
  
  const { targetRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px'
  });
  
  // Type-safe ref for divs
  const divRef = targetRef as React.RefObject<HTMLDivElement>;

  const handleImageLoad = useCallback(() => {
    setImageState('loaded');
    onLoad?.();
  }, [onLoad]);

  const handleImageError = useCallback(() => {
    setImageState('error');
    setImageSrc(fallback);
    onError?.();
  }, [fallback, onError]);

  // Load image when it becomes visible
  React.useEffect(() => {
    if (isIntersecting && imageState === 'loading' && !imageSrc) {
      setImageSrc(src);
    }
  }, [isIntersecting, imageState, imageSrc, src]);

  // Render skeleton/placeholder when not loaded
  if (!isIntersecting || (!imageSrc && imageState === 'loading')) {
    return (
      <div
        ref={divRef}
        className={`bg-gray-300 animate-pulse flex items-center justify-center ${className}`}
        data-testid="lazy-image-placeholder"
      >
        {placeholder ? (
          <img
            src={placeholder}
            alt={alt}
            className="opacity-50 object-cover w-full h-full"
          />
        ) : (
          <svg
            className="w-10 h-10 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
      </div>
    );
  }

  // Render error state
  if (imageState === 'error') {
    return (
      <div
        ref={divRef}
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        data-testid="lazy-image-error"
      >
        <svg
          className="w-10 h-10 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
    );
  }

  // Render actual image
  return (
    <div ref={divRef} className="relative">
      {imageState === 'loading' && imageSrc && (
        <div className={`absolute inset-0 bg-gray-300 animate-pulse ${className}`} />
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} ${imageState === 'loading' ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
        data-testid="lazy-image"
      />
    </div>
  );
};

export default LazyImage;