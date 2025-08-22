/**
 * Loading Context for managing global loading states and skeleton screens
 */
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  progress?: number;
  message?: string;
  startTime?: number;
}

export interface GlobalLoadingState {
  // Global states
  isAnyLoading: boolean;
  isBackgroundLoading: boolean;
  isMutating: boolean;
  
  // Operation-specific states
  operations: Map<string, LoadingState>;
  
  // Statistics
  totalOperations: number;
  activeOperations: number;
  
  // Methods
  startOperation: (operationId: string, operation?: string, message?: string) => void;
  updateOperation: (operationId: string, progress?: number, message?: string) => void;
  finishOperation: (operationId: string) => void;
  clearAllOperations: () => void;
  
  // Helpers
  isOperationLoading: (operationId: string) => boolean;
  getOperationProgress: (operationId: string) => number | undefined;
  getOperationMessage: (operationId: string) => string | undefined;
  
  // Skeleton modes
  shouldShowSkeleton: (component: string) => boolean;
  registerSkeletonComponent: (component: string, condition?: () => boolean) => void;
  unregisterSkeletonComponent: (component: string) => void;
}

const LoadingContext = createContext<GlobalLoadingState | undefined>(undefined);

interface LoadingProviderProps {
  children: React.ReactNode;
  skeletonThreshold?: number; // Show skeleton after X milliseconds
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ 
  children, 
  skeletonThreshold = 300 
}) => {
  const [operations, setOperations] = useState<Map<string, LoadingState>>(new Map());
  const [skeletonComponents, setSkeletonComponents] = useState<Map<string, () => boolean>>(new Map());
  const operationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // React Query states
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  
  // Derived states
  const isAnyLoading = operations.size > 0;
  const isBackgroundLoading = isFetching > 0;
  const activeOperations = operations.size;
  const totalOperations = useRef(0);

  const startOperation = useCallback((operationId: string, operation?: string, message?: string) => {
    const startTime = Date.now();
    
    setOperations(prev => {
      const newMap = new Map(prev);
      newMap.set(operationId, {
        isLoading: true,
        operation,
        message,
        startTime,
        progress: 0
      });
      return newMap;
    });
    
    totalOperations.current += 1;
    
    // Set timeout to show skeleton
    const timeoutId = setTimeout(() => {
      setOperations(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(operationId);
        if (existing) {
          newMap.set(operationId, { ...existing, progress: undefined });
        }
        return newMap;
      });
    }, skeletonThreshold);
    
    operationTimeouts.current.set(operationId, timeoutId);
  }, [skeletonThreshold]);

  const updateOperation = useCallback((operationId: string, progress?: number, message?: string) => {
    setOperations(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(operationId);
      if (existing) {
        newMap.set(operationId, {
          ...existing,
          progress,
          message: message || existing.message
        });
      }
      return newMap;
    });
  }, []);

  const finishOperation = useCallback((operationId: string) => {
    // Clear timeout
    const timeoutId = operationTimeouts.current.get(operationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      operationTimeouts.current.delete(operationId);
    }
    
    setOperations(prev => {
      const newMap = new Map(prev);
      newMap.delete(operationId);
      return newMap;
    });
  }, []);

  const clearAllOperations = useCallback(() => {
    // Clear all timeouts
    operationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    operationTimeouts.current.clear();
    
    setOperations(new Map());
  }, []);

  const isOperationLoading = useCallback((operationId: string) => {
    return operations.has(operationId);
  }, [operations]);

  const getOperationProgress = useCallback((operationId: string) => {
    return operations.get(operationId)?.progress;
  }, [operations]);

  const getOperationMessage = useCallback((operationId: string) => {
    return operations.get(operationId)?.message;
  }, [operations]);

  const shouldShowSkeleton = useCallback((component: string) => {
    const condition = skeletonComponents.get(component);
    if (condition) {
      return condition();
    }
    
    // Default behavior: show skeleton if any operation is loading for more than threshold
    const now = Date.now();
    for (const [, operation] of Array.from(operations.entries())) {
      if (operation.startTime && (now - operation.startTime) > skeletonThreshold) {
        return true;
      }
    }
    
    return false;
  }, [operations, skeletonComponents, skeletonThreshold]);

  const registerSkeletonComponent = useCallback((component: string, condition?: () => boolean) => {
    setSkeletonComponents(prev => {
      const newMap = new Map(prev);
      newMap.set(component, condition || (() => isAnyLoading));
      return newMap;
    });
  }, [isAnyLoading]);

  const unregisterSkeletonComponent = useCallback((component: string) => {
    setSkeletonComponents(prev => {
      const newMap = new Map(prev);
      newMap.delete(component);
      return newMap;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      operationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      operationTimeouts.current.clear();
    };
  }, []);

  const value: GlobalLoadingState = {
    // Global states
    isAnyLoading,
    isBackgroundLoading: isBackgroundLoading,
    isMutating: isMutating > 0,
    
    // Operation-specific states
    operations,
    
    // Statistics
    totalOperations: totalOperations.current,
    activeOperations,
    
    // Methods
    startOperation,
    updateOperation,
    finishOperation,
    clearAllOperations,
    
    // Helpers
    isOperationLoading,
    getOperationProgress,
    getOperationMessage,
    
    // Skeleton modes
    shouldShowSkeleton,
    registerSkeletonComponent,
    unregisterSkeletonComponent,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): GlobalLoadingState => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

// Specialized hooks for common operations
export const useOperationLoading = (operationId: string) => {
  const { isOperationLoading, getOperationProgress, getOperationMessage } = useLoading();
  
  return {
    isLoading: isOperationLoading(operationId),
    progress: getOperationProgress(operationId),
    message: getOperationMessage(operationId),
  };
};

export const useSkeletonMode = (component: string, condition?: () => boolean) => {
  const { shouldShowSkeleton, registerSkeletonComponent, unregisterSkeletonComponent } = useLoading();
  
  useEffect(() => {
    registerSkeletonComponent(component, condition);
    return () => unregisterSkeletonComponent(component);
  }, [component, condition, registerSkeletonComponent, unregisterSkeletonComponent]);
  
  return shouldShowSkeleton(component);
};

export default LoadingProvider;