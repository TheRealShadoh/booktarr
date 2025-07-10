/**
 * Touch gesture hook for mobile interactions
 * Provides swipe, pinch, and tap gesture recognition
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface TouchPoint {
  x: number;
  y: number;
  id: number;
}

interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
}

interface PinchGesture {
  scale: number;
  center: { x: number; y: number };
}

interface TapGesture {
  x: number;
  y: number;
  timestamp: number;
}

interface TouchGestureCallbacks {
  onSwipe?: (gesture: SwipeGesture) => void;
  onPinch?: (gesture: PinchGesture) => void;
  onTap?: (gesture: TapGesture) => void;
  onDoubleTap?: (gesture: TapGesture) => void;
  onLongPress?: (gesture: TapGesture) => void;
}

interface TouchGestureOptions {
  swipeThreshold?: number;
  pinchThreshold?: number;
  tapTimeout?: number;
  doubleTapTimeout?: number;
  longPressTimeout?: number;
}

export const useTouchGestures = (
  elementRef: React.RefObject<HTMLElement>,
  callbacks: TouchGestureCallbacks,
  options: TouchGestureOptions = {}
) => {
  const {
    swipeThreshold = 50,
    pinchThreshold = 0.1,
    tapTimeout = 200,
    doubleTapTimeout = 300,
    longPressTimeout = 500,
  } = options;

  const touchStartRef = useRef<TouchPoint[]>([]);
  const touchMoveRef = useRef<TouchPoint[]>([]);
  const lastTapRef = useRef<TapGesture | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const [isGesturing, setIsGesturing] = useState(false);

  // Helper functions
  const getTouchPoint = (touch: Touch): TouchPoint => ({
    x: touch.clientX,
    y: touch.clientY,
    id: touch.identifier,
  });

  const getDistance = (p1: TouchPoint, p2: TouchPoint): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const getCenter = (p1: TouchPoint, p2: TouchPoint): { x: number; y: number } => ({
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  });

  const getSwipeDirection = (start: TouchPoint, end: TouchPoint): SwipeGesture['direction'] => {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  };

  // Touch event handlers
  const handleTouchStart = useCallback((event: TouchEvent) => {
    event.preventDefault();
    
    const touches = Array.from(event.touches).map(getTouchPoint);
    touchStartRef.current = touches;
    touchMoveRef.current = touches;
    setIsGesturing(true);
    isLongPressRef.current = false;

    // Start long press timer for single touch
    if (touches.length === 1) {
      longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        callbacks.onLongPress?.({
          x: touches[0].x,
          y: touches[0].y,
          timestamp: Date.now(),
        });
      }, longPressTimeout);
    }
  }, [callbacks, longPressTimeout]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    event.preventDefault();
    
    const touches = Array.from(event.touches).map(getTouchPoint);
    touchMoveRef.current = touches;

    // Cancel long press if touch moves too much
    if (longPressTimerRef.current && touches.length === 1) {
      const startTouch = touchStartRef.current[0];
      const currentTouch = touches[0];
      const distance = getDistance(startTouch, currentTouch);
      
      if (distance > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    // Handle pinch gesture
    if (touches.length === 2 && touchStartRef.current.length === 2) {
      const startDistance = getDistance(touchStartRef.current[0], touchStartRef.current[1]);
      const currentDistance = getDistance(touches[0], touches[1]);
      const scale = currentDistance / startDistance;
      
      if (Math.abs(scale - 1) > pinchThreshold) {
        callbacks.onPinch?.({
          scale,
          center: getCenter(touches[0], touches[1]),
        });
      }
    }
  }, [callbacks, pinchThreshold]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    event.preventDefault();
    
    const endTouches = Array.from(event.changedTouches).map(getTouchPoint);
    const remainingTouches = Array.from(event.touches).map(getTouchPoint);
    
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Handle swipe gesture (single touch)
    if (touchStartRef.current.length === 1 && endTouches.length === 1 && !isLongPressRef.current) {
      const startTouch = touchStartRef.current[0];
      const endTouch = endTouches[0];
      const distance = getDistance(startTouch, endTouch);
      
      if (distance > swipeThreshold) {
        const direction = getSwipeDirection(startTouch, endTouch);
        const timeDelta = Date.now() - (touchStartRef.current as any).timestamp || 1;
        const velocity = distance / timeDelta;
        
        callbacks.onSwipe?.({
          direction,
          distance,
          velocity,
        });
      } else {
        // Handle tap/double tap
        const tapGesture: TapGesture = {
          x: endTouch.x,
          y: endTouch.y,
          timestamp: Date.now(),
        };

        // Check for double tap
        if (lastTapRef.current && 
            tapGesture.timestamp - lastTapRef.current.timestamp < doubleTapTimeout &&
            getDistance(
              { x: lastTapRef.current.x, y: lastTapRef.current.y, id: 0 }, 
              { x: tapGesture.x, y: tapGesture.y, id: 0 }
            ) < 30) {
          callbacks.onDoubleTap?.(tapGesture);
          lastTapRef.current = null;
        } else {
          // Single tap with delay to check for double tap
          setTimeout(() => {
            if (lastTapRef.current === tapGesture) {
              callbacks.onTap?.(tapGesture);
            }
          }, tapTimeout);
          lastTapRef.current = tapGesture;
        }
      }
    }

    // Update gesture state
    if (remainingTouches.length === 0) {
      setIsGesturing(false);
    }
  }, [callbacks, swipeThreshold, tapTimeout, doubleTapTimeout]);

  // Setup event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Prevent default context menu on long press
    element.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('contextmenu', (e) => e.preventDefault());
      
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isGesturing,
  };
};

export default useTouchGestures;