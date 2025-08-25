/**
 * Pull-to-refresh component for mobile book lists
 * Provides native-like refresh functionality on touch devices
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { isTouchDevice } from '../hooks/useSwipeGestures';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  disabled?: boolean;
  pullDownThreshold?: number;
  maxPullDistance?: number;
  resistance?: number;
  refreshingText?: string;
  pullDownText?: string;
  releaseText?: string;
  className?: string;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  disabled = false,
  pullDownThreshold = 80,
  maxPullDistance = 120,
  resistance = 2.5,
  refreshingText = "Refreshing books...",
  pullDownText = "Pull down to refresh",
  releaseText = "Release to refresh",
  className = ""
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canPull, setCanPull] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startTime = useRef(0);
  const lastY = useRef(0);

  const isAtTop = useCallback(() => {
    const container = containerRef.current;
    if (!container) return false;
    
    // Check if we're at the top of the scrollable content
    return container.scrollTop === 0;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || !isTouchDevice() || isRefreshing) return;
    
    startY.current = e.touches[0].clientY;
    lastY.current = startY.current;
    startTime.current = Date.now();
    
    if (isAtTop()) {
      setCanPull(true);
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || !canPull || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY.current;
    
    // Only handle pull down gestures
    if (deltaY > 0 && isAtTop()) {
      e.preventDefault();
      
      // Apply resistance to make pulling feel natural
      const distance = Math.min(deltaY / resistance, maxPullDistance);
      setPullDistance(distance);
      setIsPulling(distance > 10);
      
      lastY.current = currentY;
    }
  }, [disabled, canPull, isRefreshing, resistance, maxPullDistance]);

  const handleTouchEnd = useCallback(async (e: TouchEvent) => {
    if (disabled || !canPull || isRefreshing) return;

    const endTime = Date.now();
    const duration = endTime - startTime.current;
    
    // Check if user pulled far enough and fast enough
    const shouldRefresh = pullDistance >= pullDownThreshold && duration < 1500;
    
    if (shouldRefresh) {
      setIsRefreshing(true);
      setIsPulling(false);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        // Add minimum refresh time for better UX
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
          setCanPull(false);
        }, 500);
      }
    } else {
      // Animate back to original position
      setIsPulling(false);
      setPullDistance(0);
      setCanPull(false);
    }
  }, [disabled, canPull, isRefreshing, pullDistance, pullDownThreshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Calculate refresh indicator states
  const refreshIndicatorOpacity = Math.min(pullDistance / pullDownThreshold, 1);
  const showReleaseText = pullDistance >= pullDownThreshold;
  const indicatorRotation = (pullDistance / maxPullDistance) * 360;

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{
        transform: `translateY(${isPulling || isRefreshing ? Math.min(pullDistance, maxPullDistance / 2) : 0}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull-to-refresh indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center bg-booktarr-surface border-b border-booktarr-border"
        style={{
          height: `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px`,
          opacity: isRefreshing ? 1 : refreshIndicatorOpacity,
          transition: isRefreshing ? 'height 0.3s ease-out, opacity 0.2s' : 'none',
          transform: `translateY(-${isRefreshing ? 0 : Math.max(0, 60 - pullDistance)}px)`
        }}
      >
        {isRefreshing ? (
          <>
            <div className="w-6 h-6 border-2 border-booktarr-accent border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-sm text-booktarr-textSecondary font-medium">{refreshingText}</p>
          </>
        ) : (
          <>
            <div 
              className="w-6 h-6 mb-2 text-booktarr-accent transition-transform duration-150"
              style={{
                transform: `rotate(${indicatorRotation}deg)`,
                opacity: refreshIndicatorOpacity
              }}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </div>
            <p 
              className="text-sm text-booktarr-textSecondary font-medium transition-opacity duration-150"
              style={{ opacity: refreshIndicatorOpacity }}
            >
              {showReleaseText ? releaseText : pullDownText}
            </p>
          </>
        )}
      </div>

      {/* Content with proper spacing for indicator */}
      <div 
        style={{
          paddingTop: isRefreshing ? '60px' : '0px',
          transition: 'padding-top 0.3s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;