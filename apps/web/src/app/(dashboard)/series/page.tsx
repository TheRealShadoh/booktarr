'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { SeriesCard } from '@/components/series/series-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SeriesType = 'manga' | 'light_novel' | 'book' | 'comic' | 'other';

export default function SeriesPage() {
  const [search, setSearch] = useState('');
  const [completionFilter, setCompletionFilter] = useState<'all' | 'in-progress' | 'complete'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create Series dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newSeriesType, setNewSeriesType] = useState<SeriesType>('book');

  const { data, isLoading, error } = useQuery({
    queryKey: ['series', { search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await fetch(`/api/series?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch series');
      return response.json();
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/series/reconcile', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to reconcile series');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Reconciliation complete',
        description: `Processed ${data.processed} series with ${data.errors} errors`,
      });
      queryClient.invalidateQueries({ queryKey: ['series'] });
    },
    onError: () => {
      toast({
        title: 'Reconciliation failed',
        description: 'Failed to reconcile series volumes. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const enrichMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/series/enrich-metadata', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to enrich metadata');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Metadata enrichment complete',
        description: `Updated ${data.updated} of ${data.processed} series with metadata`,
      });
      queryClient.invalidateQueries({ queryKey: ['series'] });
    },
    onError: () => {
      toast({
        title: 'Enrichment failed',
        description: 'Failed to fetch series metadata. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const createSeriesMutation = useMutation({
    mutationFn: async ({ name, seriesType }: { name: string; seriesType: SeriesType }) => {
      const response = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, seriesType }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to create series' }));
        throw new Error((err as { error?: string }).error ?? 'Failed to create series');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Series created', description: `"${newSeriesName}" has been created.` });
      queryClient.invalidateQueries({ queryKey: ['series'] });
      setNewSeriesName('');
      setNewSeriesType('book');
      setCreateOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleCreateSeries = () => {
    if (!newSeriesName.trim()) {
      toast({ title: 'Name required', description: 'Please enter a series name.', variant: 'destructive' });
      return;
    }
    createSeriesMutation.mutate({ name: newSeriesName.trim(), seriesType: newSeriesType });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Series</h1>
          <p className="text-muted-foreground">
            {data?.series?.length ?? 0} series in your collection
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => enrichMutation.mutate()}
            disabled={enrichMutation.isPending}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${enrichMutation.isPending ? 'animate-spin' : ''}`}
            />
            {enrichMutation.isPending ? 'Enriching...' : 'Enrich Metadata'}
          </Button>
          <Button
            variant="outline"
            onClick={() => reconcileMutation.mutate()}
            disabled={reconcileMutation.isPending}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${reconcileMutation.isPending ? 'animate-spin' : ''}`}
            />
            {reconcileMutation.isPending ? 'Reconciling...' : 'Reconcile'}
          </Button>
          <Button onClick={() => setCreateOpen(true)}>Create Series</Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search series..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Select
          value={completionFilter}
          onValueChange={(v) => setCompletionFilter(v as 'all' | 'in-progress' | 'complete')}
        >
          <SelectTrigger className="w-[150px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          Failed to load series. Please try again.
        </div>
      )}

      {(() => {
        type RawSeries = Parameters<typeof SeriesCard>[0]['series'];
        const filteredSeries: RawSeries[] = (data?.series ?? [])
          .map((s: unknown) => s as RawSeries)
          .filter((s: RawSeries) => {
            if (completionFilter === 'complete') return s.completionPercentage === 100;
            if (completionFilter === 'in-progress') return s.completionPercentage < 100;
            return true;
          });

        if (filteredSeries.length === 0 && !isLoading) {
          return (
            <div className="rounded-lg border-2 border-dashed py-12 text-center">
              <p className="text-muted-foreground">
                {data?.series?.length === 0
                  ? 'No series found. Create your first series to get started!'
                  : 'No series match the selected filter.'}
              </p>
              {data?.series?.length === 0 && (
                <Button className="mt-4" onClick={() => setCreateOpen(true)}>Create Series</Button>
              )}
            </div>
          );
        }

        return (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSeries.map((series) => (
              <SeriesCard key={series.id} series={series} />
            ))}
          </div>
        );
      })()}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Series</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="series-name">Series Name</Label>
              <Input
                id="series-name"
                placeholder="e.g. The Stormlight Archive"
                value={newSeriesName}
                onChange={(e) => setNewSeriesName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSeries(); }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="series-type">Type</Label>
              <Select
                value={newSeriesType}
                onValueChange={(v) => setNewSeriesType(v as SeriesType)}
              >
                <SelectTrigger id="series-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="book">Book</SelectItem>
                  <SelectItem value="manga">Manga</SelectItem>
                  <SelectItem value="light_novel">Light Novel</SelectItem>
                  <SelectItem value="comic">Comic</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSeries}
              disabled={createSeriesMutation.isPending}
            >
              {createSeriesMutation.isPending ? 'Creating...' : 'Create Series'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
