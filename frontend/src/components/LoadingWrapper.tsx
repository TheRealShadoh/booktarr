/**
 * Loading Wrapper component that automatically shows skeletons during loading states
 */
import React, { ComponentType, ReactElement } from 'react';
import { useLoading } from '../context/LoadingContext';
import BookCardSkeleton from './skeletons/BookCardSkeleton';
import SeriesCardSkeleton from './skeletons/SeriesCardSkeleton';
import TableSkeleton from './skeletons/TableSkeleton';
import StatsSkeleton from './skeletons/StatsSkeleton';

// Available skeleton types
export type SkeletonType = 'book-card' | 'series-card' | 'table' | 'stats' | 'custom';

interface LoadingWrapperProps {
  isLoading?: boolean;
  skeleton?: SkeletonType | ReactElement;
  skeletonProps?: Record<string, any>;
  skeletonCount?: number;
  loadingText?: string;
  minimumLoadingTime?: number;
  children: React.ReactNode;
  className?: string;
  fallback?: ReactElement;
}

const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  isLoading = false,
  skeleton = 'book-card',
  skeletonProps = {},
  skeletonCount = 1,
  loadingText,
  minimumLoadingTime = 300,
  children,
  className = '',
  fallback
}) => {
  const { isAnyLoading } = useLoading();
  const [showMinimumLoading, setShowMinimumLoading] = React.useState(false);
  const loadingStartRef = React.useRef<number | null>(null);

  // Handle minimum loading time
  React.useEffect(() => {
    if (isLoading || isAnyLoading) {
      if (!loadingStartRef.current) {
        loadingStartRef.current = Date.now();
        setShowMinimumLoading(true);
      }
    } else {
      if (loadingStartRef.current) {
        const elapsed = Date.now() - loadingStartRef.current;
        if (elapsed < minimumLoadingTime) {
          const remainingTime = minimumLoadingTime - elapsed;
          setTimeout(() => {
            setShowMinimumLoading(false);
            loadingStartRef.current = null;
          }, remainingTime);
        } else {
          setShowMinimumLoading(false);
          loadingStartRef.current = null;
        }
      }
    }
  }, [isLoading, isAnyLoading, minimumLoadingTime]);

  const shouldShowLoading = isLoading || isAnyLoading || showMinimumLoading;

  // Render skeleton based on type
  const renderSkeleton = () => {
    if (React.isValidElement(skeleton)) {
      return skeleton;
    }

    const skeletons = [];
    for (let i = 0; i < skeletonCount; i++) {
      let skeletonElement;
      
      switch (skeleton) {
        case 'book-card':
          skeletonElement = <BookCardSkeleton key={i} {...skeletonProps} />;
          break;
        case 'series-card':
          skeletonElement = <SeriesCardSkeleton key={i} {...skeletonProps} />;
          break;
        case 'table':
          skeletonElement = <TableSkeleton key={i} {...skeletonProps} />;
          break;
        case 'stats':
          skeletonElement = <StatsSkeleton key={i} {...skeletonProps} />;
          break;
        default:
          skeletonElement = <div key={i} className="animate-pulse bg-booktarr-surface2 rounded h-20" />;
      }
      
      skeletons.push(skeletonElement);
    }

    return (
      <div className={className}>
        {skeletons}
        {loadingText && (
          <div className="text-center text-booktarr-textMuted mt-4">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-booktarr-accent mr-2"></div>
              {loadingText}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (shouldShowLoading) {
    return fallback || renderSkeleton();
  }

  return <>{children}</>;
};

// Higher-order component for automatic loading states
export function withLoadingState<P extends object>(
  WrappedComponent: ComponentType<P>,
  skeletonType: SkeletonType = 'book-card',
  skeletonProps?: Record<string, any>
) {
  const WithLoadingStateComponent = (props: P & { isLoading?: boolean }) => {
    const { isLoading, ...componentProps } = props;
    
    return (
      <LoadingWrapper 
        isLoading={isLoading}
        skeleton={skeletonType}
        skeletonProps={skeletonProps}
      >
        <WrappedComponent {...(componentProps as P)} />
      </LoadingWrapper>
    );
  };

  WithLoadingStateComponent.displayName = `withLoadingState(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithLoadingStateComponent;
}

// Hook for managing component-specific loading states
export const useComponentLoading = (componentName: string) => {
  const { startOperation, finishOperation, isOperationLoading } = useLoading();

  const startLoading = React.useCallback((message?: string) => {
    startOperation(componentName, componentName, message);
  }, [startOperation, componentName]);

  const stopLoading = React.useCallback(() => {
    finishOperation(componentName);
  }, [finishOperation, componentName]);

  const isLoading = isOperationLoading(componentName);

  return { startLoading, stopLoading, isLoading };
};

// Grid wrapper for skeleton loading
interface SkeletonGridProps {
  type: SkeletonType;
  count?: number;
  columns?: number;
  gap?: string;
  className?: string;
  skeletonProps?: Record<string, any>;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({
  type,
  count = 6,
  columns = 3,
  gap = 'gap-6',
  className = '',
  skeletonProps = {}
}) => {
  const gridClass = `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} ${gap} ${className}`;

  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, index) => {
        switch (type) {
          case 'book-card':
            return <BookCardSkeleton key={index} {...skeletonProps} />;
          case 'series-card':
            return <SeriesCardSkeleton key={index} {...skeletonProps} />;
          default:
            return (
              <div 
                key={index} 
                className="animate-pulse bg-booktarr-surface2 rounded h-64"
              />
            );
        }
      })}
    </div>
  );
};

// Loading overlay for full-screen operations
interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
  canCancel?: boolean;
  onCancel?: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...',
  progress,
  canCancel = false,
  onCancel
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-booktarr-surface rounded-lg p-8 max-w-sm w-full mx-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-booktarr-accent mx-auto mb-4"></div>
        
        <h3 className="text-lg font-medium text-booktarr-text mb-2">
          {message}
        </h3>
        
        {progress !== undefined && (
          <div className="w-full bg-booktarr-surface2 rounded-full h-2 mb-4">
            <div 
              className="bg-booktarr-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            ></div>
          </div>
        )}
        
        {progress !== undefined && (
          <p className="text-sm text-booktarr-textMuted mb-4">
            {Math.round(progress)}% complete
          </p>
        )}
        
        {canCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-booktarr-surface2 text-booktarr-text rounded hover:bg-booktarr-hover transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default LoadingWrapper;