/**
 * Performance optimization hooks for debouncing, throttling, and virtual scrolling
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * Hook for debouncing values to reduce expensive operations
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook for throttling function calls to improve performance
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now());

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    ((...args: any[]) => {
      if (Date.now() - lastRun.current >= delay) {
        func(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [func, delay]
  );
};

/**
 * Hook for memoizing expensive calculations
 */
export const useMemoizedValue = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
};

/**
 * Hook for virtual scrolling to handle large lists efficiently
 */
export const useVirtualScrolling = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 1, itemCount);
    
    return {
      start: Math.max(0, start - 1), // Add buffer
      end,
      visibleItems: end - start
    };
  }, [scrollTop, itemHeight, containerHeight, itemCount]);

  const totalHeight = itemCount * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleRange,
    totalHeight,
    offsetY,
    handleScroll,
    setScrollTop
  };
};

/**
 * Hook for intersection observer to lazy load components
 */
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
        ...options
      }
    );

    observer.observe(target);
    observerRef.current = observer;

    return () => {
      observer.unobserve(target);
      observer.disconnect();
    };
  }, [options]);

  return { targetRef, isIntersecting };
};

/**
 * Hook for measuring component performance
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderStartTime = useRef<number>(0);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    renderCount: 0,
    averageRenderTime: 0
  });

  const startMeasure = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endMeasure = useCallback(() => {
    if (renderStartTime.current === 0) return;
    
    const renderTime = performance.now() - renderStartTime.current;
    
    setPerformanceMetrics(prev => {
      const newRenderCount = prev.renderCount + 1;
      const newAverageRenderTime = 
        (prev.averageRenderTime * prev.renderCount + renderTime) / newRenderCount;
      
      return {
        renderTime,
        renderCount: newRenderCount,
        averageRenderTime: newAverageRenderTime
      };
    });

    // Log performance in development
    if (process.env.NODE_ENV === 'development' && renderTime > 16) {
      console.warn(
        `⚠️ Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`
      );
    }

    renderStartTime.current = 0;
  }, [componentName]);

  useEffect(() => {
    startMeasure();
    return () => {
      endMeasure();
    };
  });

  return performanceMetrics;
};

/**
 * Hook for batch updates to prevent excessive re-renders
 */
export const useBatchedUpdates = <T>(initialValue: T) => {
  const [value, setValue] = useState<T>(initialValue);
  const pendingUpdates = useRef<((prev: T) => T)[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const batchUpdate = useCallback((updater: (prev: T) => T) => {
    pendingUpdates.current.push(updater);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setValue(prevValue => {
        let newValue = prevValue;
        pendingUpdates.current.forEach(update => {
          newValue = update(newValue);
        });
        pendingUpdates.current = [];
        return newValue;
      });
    }, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, batchUpdate] as const;
};

/**
 * Hook for optimistic updates with rollback capability
 */
export const useOptimisticUpdate = <T>(
  initialValue: T,
  asyncUpdate: (value: T) => Promise<T>
) => {
  const [currentValue, setCurrentValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const optimisticUpdate = useCallback(async (newValue: T) => {
    const previousValue = currentValue;
    setCurrentValue(newValue);
    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncUpdate(newValue);
      setCurrentValue(result);
    } catch (err) {
      // Rollback on error
      setCurrentValue(previousValue);
      setError(err instanceof Error ? err : new Error('Update failed'));
    } finally {
      setIsLoading(false);
    }
  }, [currentValue, asyncUpdate]);

  return {
    value: currentValue,
    update: optimisticUpdate,
    isLoading,
    error
  };
};