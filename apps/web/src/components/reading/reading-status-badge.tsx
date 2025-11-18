'use client';

import { Badge } from '@/components/ui/badge';

export type ReadingStatus = 'want_to_read' | 'currently_reading' | 'finished' | 'dnf' | 'on_hold';

interface ReadingStatusBadgeProps {
  status: ReadingStatus;
}

const statusConfig = {
  want_to_read: {
    label: 'Want to Read',
    variant: 'secondary' as const,
  },
  currently_reading: {
    label: 'Currently Reading',
    variant: 'default' as const,
  },
  finished: {
    label: 'Finished',
    variant: 'default' as const,
  },
  dnf: {
    label: 'Did Not Finish',
    variant: 'destructive' as const,
  },
  on_hold: {
    label: 'On Hold',
    variant: 'outline' as const,
  },
};

export function ReadingStatusBadge({ status }: ReadingStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}
