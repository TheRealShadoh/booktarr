'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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

  const firstCoverUrl = volumes[0]?.coverUrl ?? null;

  const statusColors: Record<string, string> = {
    ongoing: 'bg-blue-500',
    completed: 'bg-green-500',
    hiatus: 'bg-yellow-500',
    cancelled: 'bg-red-500',
  };

  // Tint classes for stat cards
  const ownedCardBg = stats.ownedVolumes > 0
    ? 'bg-green-500/10 border-green-500/20'
    : '';
  const missingCardBg = stats.missingVolumes > 0
    ? 'bg-amber-500/10 border-amber-500/20'
    : '';
  const progressCardBg = stats.completionPercentage >= 75
    ? 'bg-green-500/10 border-green-500/20'
    : stats.completionPercentage >= 40
      ? 'bg-blue-500/10 border-blue-500/20'
      : 'bg-muted/30';

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

      {/* Hero Section */}
      <div className="relative rounded-xl overflow-hidden">
        {/* Blurred ambient background */}
        {firstCoverUrl && (
          <div
            className="absolute inset-0 blur-3xl opacity-20 scale-110"
            style={{ backgroundImage: `url(${firstCoverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            aria-hidden="true"
          />
        )}

        {/* Hero content */}
        <div className="relative flex flex-col sm:flex-row gap-6 p-6">
          {/* Series cover art */}
          {firstCoverUrl && (
            <div className="relative h-48 w-32 shrink-0 rounded-lg overflow-hidden shadow-lg self-start">
              <Image
                src={firstCoverUrl}
                alt={`${series.name} cover`}
                fill
                className="object-cover"
                sizes="128px"
                priority
              />
            </div>
          )}

          {/* Title and meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">{series.name}</h1>
              <Badge className={`${statusColors[series.status] ?? 'bg-gray-500'} shrink-0`}>
                {series.status}
              </Badge>
            </div>
            {series.type && (
              <span className="text-xs text-muted-foreground capitalize block mb-3">
                {series.type.replace(/_/g, ' ')}
              </span>
            )}
            {series.description && (
              <p className="text-muted-foreground text-sm leading-relaxed">{series.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats + Progress */}
      <div className="space-y-4">
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

          <Card className={ownedCardBg}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Owned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.ownedVolumes}</div>
            </CardContent>
          </Card>

          <Card className={missingCardBg}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Missing</CardTitle>
              <BookCopy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.missingVolumes}</div>
            </CardContent>
          </Card>

          <Card className={progressCardBg}>
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
            {volumes.map((volume: Parameters<typeof VolumeCard>[0]['volume']) => (
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
