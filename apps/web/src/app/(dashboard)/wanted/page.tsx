'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Eye,
  EyeOff,
  Search,
  Download,
  BookOpen,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { generateStoreLinks } from '@/lib/utils/store-links';

interface WantedVolume {
  seriesId: string;
  seriesName: string;
  volumeNumber: number;
  coverUrl?: string | null;
  status: 'missing' | 'wanted' | 'searching';
  monitored: boolean;
}

interface WantedResponse {
  items: WantedVolume[];
  total: number;
}

interface SearchResult {
  id: string;
  title: string;
  size?: number;
  seeders?: number;
  indexer?: string;
  downloadUrl?: string;
  type: 'torrent' | 'nzb';
}

interface SearchResponse {
  results: SearchResult[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function WantedPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [monitorFilter, setMonitorFilter] = useState<'all' | 'monitored'>('monitored');
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [activeVolume, setActiveVolume] = useState<WantedVolume | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery<WantedResponse>({
    queryKey: ['monitoring', 'wanted'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/wanted');
      if (!response.ok) throw new Error('Failed to fetch wanted volumes');
      return response.json() as Promise<WantedResponse>;
    },
    staleTime: 2 * 60 * 1000,
  });

  const searchMutation = useMutation<SearchResponse, Error, { seriesName: string; volumeNumber: number }>({
    mutationFn: async ({ seriesName, volumeNumber }) => {
      const response = await fetch('/api/monitoring/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seriesName, volumeNumber }),
      });
      if (!response.ok) throw new Error('Search failed');
      return response.json() as Promise<SearchResponse>;
    },
    onError: () => {
      toast({
        title: 'Search failed',
        description: 'Could not retrieve search results. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const downloadMutation = useMutation<unknown, Error, { resultId: string; seriesId: string; volumeNumber: number }>({
    mutationFn: async ({ resultId, seriesId, volumeNumber }) => {
      const response = await fetch('/api/monitoring/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId, seriesId, volumeNumber }),
      });
      if (!response.ok) throw new Error('Download failed');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Download queued',
        description: 'The volume has been sent to your download client.',
      });
      setSearchDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'wanted'] });
    },
    onError: () => {
      toast({
        title: 'Download failed',
        description: 'Could not send to download client. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setDownloadingId(null);
    },
  });

  const handleSearch = (volume: WantedVolume) => {
    setActiveVolume(volume);
    setSearchDialogOpen(true);
    searchMutation.mutate({
      seriesName: volume.seriesName,
      volumeNumber: volume.volumeNumber,
    });
  };

  const handleDownload = (result: SearchResult) => {
    if (!activeVolume) return;
    setDownloadingId(result.id);
    downloadMutation.mutate({
      resultId: result.id,
      seriesId: activeVolume.seriesId,
      volumeNumber: activeVolume.volumeNumber,
    });
  };

  const statusBadgeVariant = (status: WantedVolume['status']) => {
    switch (status) {
      case 'searching': return 'default';
      case 'wanted': return 'secondary';
      case 'missing': return 'outline';
    }
  };

  const filteredVolumes = (data?.items ?? []).filter((v) => {
    if (monitorFilter === 'monitored') return v.monitored;
    return true;
  });

  // Group by series name
  const grouped = filteredVolumes.reduce<Record<string, WantedVolume[]>>((acc, vol) => {
    const key = vol.seriesName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(vol);
    return acc;
  }, {});

  const seriesNames = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wanted</h1>
          <p className="text-muted-foreground">
            {filteredVolumes.length} missing{' '}
            {filteredVolumes.length === 1 ? 'volume' : 'volumes'} across{' '}
            {seriesNames.length} {seriesNames.length === 1 ? 'series' : 'series'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Monitor filter toggle */}
          <Button
            variant={monitorFilter === 'monitored' ? 'default' : 'outline'}
            size="sm"
            onClick={() =>
              setMonitorFilter(monitorFilter === 'monitored' ? 'all' : 'monitored')
            }
          >
            {monitorFilter === 'monitored' ? (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Monitored Only
              </>
            ) : (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                All Series
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-24 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between rounded-md bg-destructive/10 p-4 text-destructive">
          <span>Failed to load wanted volumes. Please try again.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredVolumes.length === 0 && (
        <div className="rounded-lg border-2 border-dashed py-16 text-center">
          <Search className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">
            {monitorFilter === 'monitored'
              ? 'No missing volumes in monitored series'
              : 'No missing volumes found'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {monitorFilter === 'monitored'
              ? 'Toggle to "All Series" to see unmonitored missing volumes, or your collection is complete.'
              : 'Your collection is complete or no series have been added yet.'}
          </p>
        </div>
      )}

      {/* Volumes grouped by series */}
      {!isLoading && !error && seriesNames.length > 0 && (
        <div className="space-y-8">
          {seriesNames.map((seriesName) => {
            const volumes = grouped[seriesName];
            if (!volumes) return null;
            return (
              <div key={seriesName} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{seriesName}</h2>
                  <Badge variant="secondary">{volumes.length} missing</Badge>
                  {volumes[0]?.monitored && (
                    <Badge variant="outline" className="text-xs">
                      <Eye className="mr-1 h-3 w-3" />
                      Monitored
                    </Badge>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {volumes
                    .sort((a, b) => a.volumeNumber - b.volumeNumber)
                    .map((volume) => (
                      <div
                        key={`${volume.seriesId}-${volume.volumeNumber}`}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        {/* Cover thumbnail */}
                        <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-muted">
                          {volume.coverUrl ? (
                            <Image
                              src={volume.coverUrl}
                              alt={`${volume.seriesName} Vol. ${volume.volumeNumber}`}
                              fill
                              className="object-cover"
                              sizes="44px"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <BookOpen className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>

                        {/* Volume info */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            Vol. {volume.volumeNumber}
                          </p>
                          <Badge
                            variant={statusBadgeVariant(volume.status)}
                            className="mt-1 text-xs capitalize"
                          >
                            {volume.status}
                          </Badge>
                          {/* Store purchase links */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {generateStoreLinks(
                              null,
                              `${volume.seriesName} Vol. ${volume.volumeNumber}`
                            ).map((link) => (
                              <a
                                key={link.name}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Buy on ${link.name}`}
                                className="inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {link.shortName}
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            ))}
                          </div>
                        </div>

                        {/* Search button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSearch(volume)}
                          className="shrink-0"
                        >
                          <Search className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search Results Dialog */}
      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Search Results
              {activeVolume && (
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  — {activeVolume.seriesName} Vol. {activeVolume.volumeNumber}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {searchMutation.isPending && (
              <div className="space-y-3 py-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            )}

            {searchMutation.isError && (
              <div className="py-8 text-center text-destructive">
                <p>Search failed. Please try again.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() =>
                    activeVolume &&
                    searchMutation.mutate({
                      seriesName: activeVolume.seriesName,
                      volumeNumber: activeVolume.volumeNumber,
                    })
                  }
                >
                  Retry
                </Button>
              </div>
            )}

            {searchMutation.isSuccess && (
              <>
                {searchMutation.data.results.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Search className="mx-auto mb-3 h-8 w-8 opacity-40" />
                    <p>No results found for this volume.</p>
                  </div>
                ) : (
                  <div className="space-y-2 py-1">
                    {searchMutation.data.results.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{result.title}</p>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {result.size != null && (
                              <span>{formatBytes(result.size)}</span>
                            )}
                            {result.seeders != null && (
                              <span className="text-green-500">
                                {result.seeders} seeders
                              </span>
                            )}
                            {result.indexer && <span>{result.indexer}</span>}
                            <Badge variant="outline" className="text-xs capitalize">
                              {result.type}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleDownload(result)}
                          disabled={downloadMutation.isPending && downloadingId === result.id}
                        >
                          {downloadMutation.isPending && downloadingId === result.id ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          <span className="ml-1.5">Download</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSearchDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
