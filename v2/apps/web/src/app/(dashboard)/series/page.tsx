'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { SeriesCard } from '@/components/series/series-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export default function SeriesPage() {
  const [search, setSearch] = useState('');

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Series</h1>
          <p className="text-muted-foreground">
            {data?.series.length || 0} series in your collection
          </p>
        </div>

        <Button>Create Series</Button>
      </div>

      <Input
        placeholder="Search series..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

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
        <div className="rounded-md bg-red-50 p-4 text-red-800">
          Failed to load series. Please try again.
        </div>
      )}

      {data?.series.length === 0 && !isLoading && (
        <div className="rounded-lg border-2 border-dashed py-12 text-center">
          <p className="text-muted-foreground">
            No series found. Create your first series to get started!
          </p>
          <Button className="mt-4">Create Series</Button>
        </div>
      )}

      {data?.series && data.series.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.series.map((series: unknown) => (
            <SeriesCard
              key={(series as { id: string }).id}
              series={series as Parameters<typeof SeriesCard>[0]['series']}
            />
          ))}
        </div>
      )}
    </div>
  );
}
