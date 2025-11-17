'use client';

import { Progress } from '@/components/ui/progress';
import { ReadingStatusBadge, type ReadingStatus } from './reading-status-badge';
import { RatingStars } from './rating-stars';

interface ReadingProgressCardProps {
  status: ReadingStatus;
  currentPage?: number;
  totalPages?: number;
  progressPercentage?: number;
  rating?: number;
  compact?: boolean;
}

export function ReadingProgressCard({
  status,
  currentPage,
  totalPages,
  progressPercentage,
  rating,
  compact = false,
}: ReadingProgressCardProps) {
  const percentage = progressPercentage || (currentPage && totalPages ? Math.round((currentPage / totalPages) * 100) : 0);

  if (compact) {
    return (
      <div className="space-y-1">
        <ReadingStatusBadge status={status} />
        {status === 'currently_reading' && totalPages && currentPage !== undefined && (
          <div className="space-y-1">
            <Progress value={percentage} className="h-1" />
            <p className="text-xs text-muted-foreground">
              {currentPage} / {totalPages} pages
            </p>
          </div>
        )}
        {status === 'finished' && rating && rating > 0 && (
          <RatingStars rating={rating} size="sm" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <ReadingStatusBadge status={status} />
        {status === 'finished' && rating && rating > 0 && (
          <RatingStars rating={rating} size="md" />
        )}
      </div>

      {status === 'currently_reading' && totalPages && currentPage !== undefined && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <Progress value={percentage} />
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
        </div>
      )}
    </div>
  );
}
