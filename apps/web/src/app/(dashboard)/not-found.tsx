import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/layout/empty-state';

export default function DashboardNotFound() {
  return (
    <EmptyState
      icon={FileQuestion}
      title="Page not found"
      description="We couldn't find what you were looking for. It may have been removed from your library."
      action={
        <Button asChild>
          <Link href="/library">Back to Library</Link>
        </Button>
      }
    />
  );
}
