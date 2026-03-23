'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, BookOpen } from 'lucide-react';

interface SeriesEntry {
  id: string;
  name: string;
  totalVolumes: number;
  ownedVolumes: number;
  completionPercentage: number;
  status?: string | null;
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
  }));

  const grouped = groupByMonth(nextVolumes);
  const totalNeeded = nextVolumes.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CalendarDays className="h-8 w-8" />
          Release Calendar
        </h1>
        <p className="text-muted-foreground">
          What to buy next - {totalNeeded} volume{totalNeeded !== 1 ? 's' : ''} needed across your tracked series
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-20 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          Failed to load series data. Please try again.
        </div>
      )}

      {!isLoading && totalNeeded === 0 && !error && (
        <div className="rounded-lg border-2 border-dashed py-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {(data?.series ?? []).length === 0
              ? 'No series tracked yet. Add books to your library to see what to buy next.'
              : 'All your tracked series are complete - nothing left to buy!'}
          </p>
          <Link href="/series" className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline">
            View all series
          </Link>
        </div>
      )}

      {!isLoading && totalNeeded > 0 && (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([monthLabel, entries]) => (
            <div key={monthLabel} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{monthLabel}</h2>
                <Badge variant="secondary">{entries.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry) => (
                  <Link key={entry.seriesId} href={`/series/${entry.seriesId}`}>
                    <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm font-semibold line-clamp-2">
                          {entry.seriesName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Volume {entry.nextVolume}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs"
                          >
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
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
