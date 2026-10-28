'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { SeriesCard } from '@/components/series/series-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Plus, Search, Wrench, Sparkles, Layers, SearchX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [completionFilter, setCompletionFilter] = useState<'all' | 'in-progress' | 'complete'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create Series dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newSeriesType, setNewSeriesType] = useState<SeriesType>('book');

  // Debounce the search box so we don't refetch on every keystroke
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['series', { search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await fetch(`/api/series?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch series');
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
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

  const seriesCount: number = data?.series?.length ?? 0;
  const toolsPending = enrichMutation.isPending || reconcileMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Series"
        description={
          isLoading
            ? 'Loading…'
            : `${seriesCount} ${seriesCount === 1 ? 'series' : 'series'} in your collection`
        }
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={toolsPending}>
                  {toolsPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Wrench className="h-4 w-4" aria-hidden="true" />
                  )}
                  {enrichMutation.isPending
                    ? 'Enriching…'
                    : reconcileMutation.isPending
                      ? 'Reconciling…'
                      : 'Tools'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Maintenance</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => enrichMutation.mutate()}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <div className="flex flex-col">
                    <span>Enrich metadata</span>
                    <span className="text-xs text-muted-foreground">
                      Fetch descriptions, covers and volume counts
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => reconcileMutation.mutate()}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <div className="flex flex-col">
                    <span>Reconcile volumes</span>
                    <span className="text-xs text-muted-foreground">
                      Re-link library books to their series
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create Series
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Search series…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            aria-label="Search series"
          />
        </div>
        <Select
          value={completionFilter}
          onValueChange={(v) => setCompletionFilter(v as 'all' | 'in-progress' | 'complete')}
        >
          <SelectTrigger className="w-[150px] shrink-0" aria-label="Filter by completion">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All series</SelectItem>
            <SelectItem value="in-progress">In progress</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-md bg-destructive/10 p-4 text-destructive">
          <span>Failed to load series. Please try again.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
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

        if (filteredSeries.length === 0 && !isLoading && !error) {
          const nothingAtAll = seriesCount === 0 && !search;
          return nothingAtAll ? (
            <EmptyState
              icon={Layers}
              title="No series yet"
              description="Series are created automatically when you add books that belong to one, or you can create one by hand."
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create Series
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title="No series match"
              description="Try a different search or filter."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchInput('');
                    setCompletionFilter('all');
                  }}
                >
                  Clear search &amp; filters
                </Button>
              }
            />
          );
        }

        return (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                autoFocus
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
