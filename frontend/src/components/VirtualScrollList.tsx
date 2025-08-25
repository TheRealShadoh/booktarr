/**
 * Virtual Scrolling List Component for Performance Optimization
 * Renders only visible items to handle large datasets efficiently
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useVirtualScrolling } from '../hooks/usePerformance';

interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey: (item: T, index: number) => string | number;
  className?: string;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

function VirtualScrollList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  getItemKey,
  className = '',
  loadingComponent,
  emptyComponent
}: VirtualScrollListProps<T>) {
  const {
    visibleRange,
    totalHeight,
    offsetY,
    handleScroll
  } = useVirtualScrolling(items.length, itemHeight, containerHeight);

  // Get visible items based on calculated range
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange.start, visibleRange.end]);

  // Create spacer elements to maintain scroll position
  const topSpacer = offsetY;
  const bottomSpacer = totalHeight - offsetY - (visibleItems.length * itemHeight);

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height: containerHeight }}>
        {emptyComponent || (
          <div className="text-center text-booktarr-textMuted">
            <p>No items to display</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      data-testid="virtual-scroll-container"
    >
      {/* Total height container */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Top spacer */}
        {topSpacer > 0 && (
          <div style={{ height: topSpacer }} />
        )}
        
        {/* Visible items */}
        <div style={{ position: 'relative' }}>
          {visibleItems.map((item, relativeIndex) => {
            const absoluteIndex = visibleRange.start + relativeIndex;
            const key = getItemKey(item, absoluteIndex);
            
            return (
              <div
                key={key}
                style={{
                  height: itemHeight,
                  position: 'relative'
                }}
                data-testid={`virtual-item-${key}`}
              >
                {renderItem(item, absoluteIndex)}
              </div>
            );
          })}
        </div>
        
        {/* Bottom spacer */}
        {bottomSpacer > 0 && (
          <div style={{ height: bottomSpacer }} />
        )}
      </div>
    </div>
  );
}

export default VirtualScrollList;