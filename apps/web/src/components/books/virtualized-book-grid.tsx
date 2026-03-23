'use client';

import { useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { BookCard } from './book-card';
import type { BookWithRelations } from '@/types/api';

interface VirtualizedBookGridProps {
  books: BookWithRelations[];
  onBookClick: (bookId: string) => void;
  renderOverlay?: (book: BookWithRelations) => React.ReactNode;
}

/**
 * Responsive column count based on container width.
 * Matches the Tailwind grid breakpoints used in the non-virtualized grid:
 * grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6
 */
function getColumnCount(containerWidth: number): number {
  if (containerWidth >= 1280) return 6; // xl
  if (containerWidth >= 1024) return 5; // lg
  if (containerWidth >= 768) return 4;  // md
  if (containerWidth >= 640) return 3;  // sm
  return 2;
}

const GAP = 24; // matches gap-6 (1.5rem = 24px)
const ASPECT_RATIO = 1.8; // ~card height:width ratio (cover + text)

export function VirtualizedBookGrid({
  books,
  onBookClick,
  renderOverlay,
}: VirtualizedBookGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Compute columns and row count based on container width
  const parentWidth = parentRef.current?.offsetWidth ?? 1200;
  const columns = getColumnCount(parentWidth);
  const rowCount = Math.ceil(books.length / columns);

  // Estimate row height from column width
  const columnWidth = (parentWidth - GAP * (columns - 1)) / columns;
  const estimatedRowHeight = columnWidth * ASPECT_RATIO + GAP;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: useCallback(() => parentRef.current, []),
    estimateSize: useCallback(() => estimatedRowHeight, [estimatedRowHeight]),
    overscan: 3,
  });

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      style={{ height: '80vh', overflow: 'auto' }}
      className="w-full"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const startIndex = virtualRow.index * columns;

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="grid gap-6"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: columns }, (_, colIndex) => {
                  const bookIndex = startIndex + colIndex;
                  if (bookIndex >= books.length) return <div key={colIndex} />;
                  const book = books[bookIndex];

                  return (
                    <div key={book.userBook.id} className="relative">
                      {renderOverlay?.(book)}
                      <BookCard
                        book={book}
                        onClick={() => onBookClick(book.book.id)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
