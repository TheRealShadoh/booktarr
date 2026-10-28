'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/layout/empty-state';
import { logger } from '@/lib/logger';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Dashboard page error:', error);
  }, [error]);

  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong"
      description="This page hit an unexpected error. You can try again, or head back to your library."
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/library">Go to Library</Link>
          </Button>
        </div>
      }
    />
  );
}
