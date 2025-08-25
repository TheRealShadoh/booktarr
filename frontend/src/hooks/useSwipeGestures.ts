/**
 * Custom hook for handling swipe gestures on mobile devices
 * Provides swipe detection for navigation and interactions
 */
import { useRef, useEffect, useCallback } from 'react';

interface SwipeConfig {
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  preventDefaultTouchmoveEvent?: boolean;
  delta?: number;
}

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: (event: TouchEvent) => void;
  onSwipeMove?: (event: TouchEvent) => void;
  onSwipeEnd?: (event: TouchEvent) => void;
}

interface SwipeInput extends SwipeConfig, SwipeHandlers {}

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

export const useSwipeGestures = (input: SwipeInput) => {
  const {
    minSwipeDistance = 60,
    maxSwipeTime = 1000,
    preventDefaultTouchmoveEvent = false,
    delta = 10,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipeStart,
    onSwipeMove,
    onSwipeEnd
  } = input;

  const startPos = useRef<TouchPosition>({ x: 0, y: 0, time: 0 });
  const endPos = useRef<TouchPosition>({ x: 0, y: 0, time: 0 });

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    startPos.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    
    onSwipeStart?.(event);
  }, [onSwipeStart]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (preventDefaultTouchmoveEvent && event.cancelable) {
      event.preventDefault();
    }
    
    onSwipeMove?.(event);
  }, [preventDefaultTouchmoveEvent, onSwipeMove]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (event.changedTouches.length !== 1) return;
    
    const touch = event.changedTouches[0];
    endPos.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    const deltaX = endPos.current.x - startPos.current.x;
    const deltaY = endPos.current.y - startPos.current.y;
    const deltaTime = endPos.current.time - startPos.current.time;

    // Check if the swipe was fast enough and far enough
    if (deltaTime > maxSwipeTime) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Determine swipe direction based on the largest movement
    if (absX > absY) {
      // Horizontal swipe
      if (absX > minSwipeDistance) {
        if (deltaX > delta) {
          onSwipeRight?.();
        } else if (deltaX < -delta) {
          onSwipeLeft?.();
        }
      }
    } else {
      // Vertical swipe
      if (absY > minSwipeDistance) {
        if (deltaY > delta) {
          onSwipeDown?.();
        } else if (deltaY < -delta) {
          onSwipeUp?.();
        }
      }
    }

    onSwipeEnd?.(event);
  }, [minSwipeDistance, maxSwipeTime, delta, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipeEnd]);

  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Add passive event listeners for better performance
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefaultTouchmoveEvent });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventDefaultTouchmoveEvent]);

  return elementRef;
};

// Utility function to detect if device supports touch
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Utility function to get optimal swipe thresholds based on screen size
export const getSwipeThresholds = () => {
  const screenWidth = window.innerWidth;
  
  if (screenWidth < 480) {
    // Small mobile
    return {
      minSwipeDistance: 50,
      maxSwipeTime: 800,
      delta: 8
    };
  } else if (screenWidth < 768) {
    // Large mobile
    return {
      minSwipeDistance: 60,
      maxSwipeTime: 900,
      delta: 10
    };
  } else {
    // Tablet and up
    return {
      minSwipeDistance: 80,
      maxSwipeTime: 1000,
      delta: 15
    };
  }
};

export default useSwipeGestures;