import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Eye, EyeOff } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

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
  const statusColors: Record<string, string> = {
    ongoing: 'bg-blue-500',
    completed: 'bg-green-500',
    hiatus: 'bg-yellow-500',
    cancelled: 'bg-red-500',
  };

  return (
    <div className="relative">
      {/* Monitor toggle — positioned above the link so it captures its own clicks */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 z-10 h-7 w-7 rounded-full opacity-70 hover:opacity-100"
        aria-label={series.monitored ? 'Unmonitor series' : 'Monitor series'}
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

    <Link href={`/series/${series.id}`}>
      <Card className="cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg">
        <CardHeader>
          <div className="flex gap-3">
            {/* Series Cover Thumbnail */}
            <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded bg-gradient-to-b from-muted to-muted/50">
              {series.coverUrl ? (
                <Image
                  src={series.coverUrl}
                  alt={`${series.name} cover`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <BookOpen className="h-6 w-6 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Title and Status */}
            <div className="flex flex-1 items-start justify-between">
              <div className="min-w-0">
                <CardTitle className="line-clamp-2 text-lg">{series.name}</CardTitle>
                <span className="text-xs text-muted-foreground capitalize">
                  {[series.type?.replace(/_/g, ' '), series.status]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {series.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">
                    {series.description}
                  </p>
                )}
              </div>
              <Badge className={`${statusColors[series.status] || 'bg-gray-500'} capitalize ml-2 shrink-0`}>
                {series.status}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {series.ownedVolumes} / {series.totalVolumes} volumes
              </span>
            </div>

            <Progress value={series.completionPercentage} className="h-2" />

            <p className="text-center text-xs text-muted-foreground">
              {series.completionPercentage}% complete
            </p>
          </div>

          {series.completionPercentage === 100 && (
            <p className="mt-1 text-xs text-green-500">&#10003; Complete</p>
          )}

          {series.completionPercentage < 100 && series.totalVolumes - series.ownedVolumes > 0 && (
            <div className="mt-1 space-y-0.5">
              <p className="text-xs text-blue-500">
                {series.totalVolumes - series.ownedVolumes} volumes missing
              </p>
              {series.missingVolumeNumbers && series.missingVolumeNumbers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Need: {series.missingVolumeNumbers.slice(0, 8).map(n => `#${n}`).join(', ')}
                  {series.missingVolumeNumbers.length > 8 && ` +${series.missingVolumeNumbers.length - 8} more`}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
    </div>
  );
}
