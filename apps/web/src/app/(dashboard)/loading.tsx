import { Skeleton } from '@/components/ui/skeleton';
import { BookGridSkeleton } from '@/components/books/book-grid-skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <BookGridSkeleton />
    </div>
  );
}
