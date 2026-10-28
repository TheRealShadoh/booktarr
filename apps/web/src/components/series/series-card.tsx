'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { CoverImage } from '@/components/books/cover-image';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SeriesCardProps {
  series: {
    id: string;
    name: string;
    status: string;
    totalVolumes: number;
    ownedVolumes: number;
    completionPercentage: number;
    coverUrl?: string | null;
    type?: string | null;
    description?: string | null;
    missingVolumeNumbers?: number[];
    monitored?: boolean;
  };
}

const statusStyles: Record<string, string> = {
  ongoing: 'border-blue-500/40 text-blue-600 dark:text-blue-400',
  completed: 'border-green-500/40 text-green-600 dark:text-green-400',
  hiatus: 'border-yellow-500/40 text-yellow-700 dark:text-yellow-400',
  cancelled: 'border-red-500/40 text-red-600 dark:text-red-400',
};

export function SeriesCard({ series }: SeriesCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const monitorMutation = useMutation({
    mutationFn: async (monitored: boolean) => {
      const response = await fetch(`/api/series/${series.id}/monitor`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monitored }),
      });
      if (!response.ok) throw new Error('Failed to update monitoring');
      return response.json();
    },
    onSuccess: (_data, monitored) => {
      toast({
        title: monitored ? 'Series monitored' : 'Series unmonitored',
        description: `"${series.name}" will ${monitored ? 'now' : 'no longer'} be checked for missing volumes.`,
      });
      queryClient.invalidateQueries({ queryKey: ['series'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'wanted'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update monitoring status.', variant: 'destructive' });
    },
  });

  const missing = Math.max(series.totalVolumes - series.ownedVolumes, 0);
  const complete = series.completionPercentage >= 100;
  const typeLabel = series.type?.replace(/_/g, ' ');

  return (
    <Card className="relative h-full gap-0 py-0 transition-all hover:-translate-y-0.5 hover:shadow-lg focus-within:ring-2 focus-within:ring-ring/50">
      {/* Monitor toggle — a sibling of the link so it captures its own clicks */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full"
        aria-label={series.monitored ? `Stop monitoring ${series.name}` : `Monitor ${series.name}`}
        aria-pressed={!!series.monitored}
        title={series.monitored ? 'Monitored — click to stop' : 'Not monitored — click to monitor'}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          monitorMutation.mutate(!series.monitored);
        }}
        disabled={monitorMutation.isPending}
      >
        {series.monitored ? (
          <Eye className="h-4 w-4 text-primary" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      <Link
        href={`/series/${series.id}`}
        className="block h-full rounded-xl focus-visible:outline-none"
        aria-label={`Open ${series.name}`}
      >
        <CardContent className="flex h-full flex-col gap-4 p-4">
          <div className="flex gap-4 pr-8">
            <div className="relative h-28 w-[4.75rem] shrink-0 overflow-hidden rounded-md bg-muted shadow-sm">
              {series.coverUrl ? (
                <CoverImage src={series.coverUrl} alt="" fill className="object-cover" sizes="76px" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <BookOpen className="h-6 w-6 text-muted-foreground/30" aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-base font-semibold leading-snug">{series.name}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {typeLabel && (
                  <span className="text-xs capitalize text-muted-foreground">{typeLabel}</span>
                )}
                {series.status && (
                  <Badge
                    variant="outline"
                    className={cn('h-5 capitalize', statusStyles[series.status] ?? '')}
                  >
                    {series.status}
                  </Badge>
                )}
              </div>
              {series.description && (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{series.description}</p>
              )}
            </div>
          </div>

          <div className="mt-auto space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {series.ownedVolumes} / {series.totalVolumes || '?'} volumes
              </span>
              <span
                className={cn(
                  'text-xs',
                  complete ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                )}
              >
                {complete ? (
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Complete
                  </span>
                ) : (
                  `${series.completionPercentage}%`
                )}
              </span>
            </div>
            <Progress
              value={Math.min(series.completionPercentage, 100)}
              className="h-2"
              aria-label={`${series.completionPercentage}% complete`}
            />
            {!complete && missing > 0 && (
              <p className="truncate text-xs text-muted-foreground">
                {missing} missing
                {series.missingVolumeNumbers && series.missingVolumeNumbers.length > 0 && (
                  <>
                    {' · '}
                    {series.missingVolumeNumbers.slice(0, 6).map((n) => `#${n}`).join(', ')}
                    {series.missingVolumeNumbers.length > 6 &&
                      ` +${series.missingVolumeNumbers.length - 6} more`}
                  </>
                )}
              </p>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
