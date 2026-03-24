'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, BookOpen, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { generateStoreLinks } from '@/lib/utils/store-links';

interface SeriesEntry {
  id: string;
  name: string;
  totalVolumes: number;
  ownedVolumes: number;
  completionPercentage: number;
  status?: string | null;
  monitored?: boolean | null;
}

interface SeriesApiResponse {
  series: SeriesEntry[];
}

interface NextVolumeEntry {
  seriesId: string;
  seriesName: string;
  nextVolume: number;
  releaseDate: string | null;
  status: string | null;
  monitored: boolean;
}

function groupByMonth(entries: NextVolumeEntry[]): Map<string, NextVolumeEntry[]> {
  const grouped = new Map<string, NextVolumeEntry[]>();

  // Separate entries with known dates from TBD entries
  const withDate = entries.filter((e) => e.releaseDate !== null);
  const withoutDate = entries.filter((e) => e.releaseDate === null);

  // Sort by release date ascending
  withDate.sort((a, b) => {
    const da = new Date(a.releaseDate!).getTime();
    const db = new Date(b.releaseDate!).getTime();
    return da - db;
  });

  for (const entry of withDate) {
    const date = new Date(entry.releaseDate!);
    const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!grouped.has(monthKey)) grouped.set(monthKey, []);
    grouped.get(monthKey)!.push(entry);
  }

  if (withoutDate.length > 0) {
    grouped.set('TBD', withoutDate.sort((a, b) => a.seriesName.localeCompare(b.seriesName)));
  }

  return grouped;
}

export default function CalendarPage() {
  const [monitorFilter, setMonitorFilter] = useState<'all' | 'monitored'>('monitored');

  const { data, isLoading, error } = useQuery<SeriesApiResponse>({
    queryKey: ['series', 'calendar'],
    queryFn: async () => {
      const response = await fetch('/api/series?limit=100');
      if (!response.ok) throw new Error('Failed to fetch series');
      return response.json() as Promise<SeriesApiResponse>;
    },
  });

  // Build "next volumes needed" list from incomplete series
  const incompleteSeries = (data?.series ?? []).filter(
    (s) => s.completionPercentage < 100 && s.ownedVolumes > 0
  );

  const nextVolumes: NextVolumeEntry[] = incompleteSeries.map((s) => ({
    seriesId: s.id,
    seriesName: s.name,
    nextVolume: s.ownedVolumes + 1,
    releaseDate: null, // series_volumes release dates are not exposed in the list API
    status: s.status ?? null,
    monitored: s.monitored ?? false,
  }));

  const filteredVolumes =
    monitorFilter === 'monitored'
      ? nextVolumes.filter((v) => v.monitored)
      : nextVolumes;

  const grouped = groupByMonth(filteredVolumes);
  const totalNeeded = filteredVolumes.length;
  const monitoredCount = nextVolumes.filter((v) => v.monitored).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-8 w-8" />
            Release Calendar
          </h1>
          <p className="text-muted-foreground">
            What to buy next &mdash; {totalNeeded} volume{totalNeeded !== 1 ? 's' : ''} needed
            {monitorFilter === 'monitored' ? ' in monitored series' : ' across your tracked series'}
          </p>
        </div>

        {/* Monitored filter toggle */}
        <Button
          variant={monitorFilter === 'monitored' ? 'default' : 'outline'}
          size="sm"
          className="self-start"
          onClick={() =>
            setMonitorFilter(monitorFilter === 'monitored' ? 'all' : 'monitored')
          }
        >
          {monitorFilter === 'monitored' ? (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Monitored Only
              {monitoredCount > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                  {monitoredCount}
                </Badge>
              )}
            </>
          ) : (
            <>
              <EyeOff className="mr-2 h-4 w-4" />
              All Series
            </>
          )}
        </Button>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-32 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          Failed to load series data. Please try again.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && totalNeeded === 0 && !error && (
        <div className="rounded-lg border-2 border-dashed py-16 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            {monitorFilter === 'monitored' && monitoredCount === 0 && nextVolumes.length > 0
              ? 'No monitored series with missing volumes'
              : (data?.series ?? []).length === 0
                ? 'No series tracked yet'
                : 'All tracked series are complete'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {monitorFilter === 'monitored' && nextVolumes.length > 0
              ? 'Toggle to "All Series" to see all missing volumes, or monitor a series to track it here.'
              : (data?.series ?? []).length === 0
                ? 'Add books to your library to see what to buy next.'
                : "Nothing left to buy — your collection is up to date!"}
          </p>
          <Link
            href="/series"
            className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            View all series
          </Link>
        </div>
      )}

      {/* Calendar entries grouped by month */}
      {!isLoading && totalNeeded > 0 && (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([monthLabel, entries]) => (
            <div key={monthLabel} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{monthLabel}</h2>
                <Badge variant="secondary">{entries.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry) => {
                  const storeLinks = generateStoreLinks(
                    null,
                    `${entry.seriesName} Vol. ${entry.nextVolume}`
                  );
                  return (
                    <Card
                      key={entry.seriesId}
                      className="transition-shadow hover:shadow-md h-full"
                    >
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/series/${entry.seriesId}`}>
                            <CardTitle className="text-sm font-semibold line-clamp-2 hover:text-primary transition-colors cursor-pointer">
                              {entry.seriesName}
                            </CardTitle>
                          </Link>
                          {entry.monitored && (
                            <Eye className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" aria-label="Monitored" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Volume {entry.nextVolume}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {entry.releaseDate
                              ? new Date(entry.releaseDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'TBD'}
                          </Badge>
                          {entry.status && entry.status !== 'ongoing' && (
                            <Badge variant="secondary" className="text-xs capitalize">
                              {entry.status}
                            </Badge>
                          )}
                        </div>
                        {/* Store purchase links */}
                        {storeLinks.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {storeLinks.map((link) => (
                              <a
                                key={link.name}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Buy on ${link.name}`}
                                className="inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                              >
                                {link.shortName}
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
