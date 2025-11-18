'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { VolumeCard } from '@/components/series/volume-card';
import { ArrowLeft, BookCopy, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SeriesDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { id: seriesId } = use(params);

  // Fetch series details
  const { data, isLoading, error } = useQuery({
    queryKey: ['series', seriesId],
    queryFn: async () => {
      const response = await fetch(`/api/series/${seriesId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Series not found');
        }
        throw new Error('Failed to fetch series details');
      }
      return response.json();
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" disabled>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Series
        </Button>

        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>

        <Skeleton className="h-64" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/series')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Series
        </Button>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-destructive mb-4">
                {error instanceof Error ? error.message : 'Failed to load series details'}
              </p>
              <Button onClick={() => router.push('/series')}>
                Return to Series
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { series, volumes, stats } = data;

  const statusColors: Record<string, string> = {
    ongoing: 'bg-blue-500',
    completed: 'bg-green-500',
    hiatus: 'bg-yellow-500',
    cancelled: 'bg-red-500',
  };

  const handleAddToCollection = (volumeNumber: number) => {
    toast({
      title: 'Add to Collection',
      description: `Feature coming soon: Add volume ${volumeNumber} to your collection`,
    });
  };

  const handleMarkAsWanted = (volumeNumber: number) => {
    toast({
      title: 'Add to Wishlist',
      description: `Feature coming soon: Mark volume ${volumeNumber} as wanted`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.push('/series')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Series
      </Button>

      {/* Series Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{series.name}</h1>
            {series.description && (
              <p className="text-muted-foreground">{series.description}</p>
            )}
          </div>
          <Badge className={statusColors[series.status] || 'bg-gray-500'}>
            {series.status}
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volumes</CardTitle>
              <BookCopy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVolumes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Owned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.ownedVolumes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Missing</CardTitle>
              <BookCopy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.missingVolumes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completionPercentage}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Collection Progress</span>
                <span className="text-muted-foreground">
                  {stats.ownedVolumes} / {stats.totalVolumes} volumes
                </span>
              </div>
              <Progress value={stats.completionPercentage} className="h-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Volumes Grid */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Volumes</h2>

        {volumes.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No volumes found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This series doesn&apos;t have any volumes linked yet.
              </p>
            </CardContent>
          </Card>
        )}

        {volumes.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {volumes.map((volume: any) => (
              <VolumeCard
                key={volume.volumeNumber}
                volume={volume}
                seriesId={seriesId}
                onAddToCollection={handleAddToCollection}
                onMarkAsWanted={handleMarkAsWanted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
