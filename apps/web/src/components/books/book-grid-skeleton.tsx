import { Skeleton } from '@/components/ui/skeleton';

export const BOOK_GRID_CLASS =
  'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-5';

export function BookGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={BOOK_GRID_CLASS} aria-busy="true" aria-label="Loading books">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[2/3] w-full rounded-xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
