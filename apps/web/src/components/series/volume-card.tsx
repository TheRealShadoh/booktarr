'use client';

import Link from 'next/link';
import { CoverImage } from '@/components/books/cover-image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Heart, ExternalLink } from 'lucide-react';
import { generateStoreLinks } from '@/lib/utils/store-links';
import { cn } from '@/lib/utils';

interface VolumeCardProps {
  volume: {
    volumeNumber: number;
    volumeName?: string | null;
    coverUrl?: string | null;
    book?: {
      id: string;
      title: string;
    } | null;
    owned: boolean;
    wanted: boolean;
    status: 'owned' | 'wanted' | 'missing';
  };
  seriesId: string;
  seriesName?: string;
  onAddToCollection?: (volumeNumber: number) => void;
  onMarkAsWanted?: (volumeNumber: number) => void;
}

const statusConfig = {
  owned: {
    badge: <Badge className="bg-green-600 text-white">Owned</Badge>,
    card: 'border-green-500/30',
  },
  wanted: {
    badge: <Badge className="bg-blue-600 text-white">Wanted</Badge>,
    card: 'border-blue-500/30',
  },
  missing: {
    badge: (
      <Badge variant="outline" className="text-muted-foreground">
        Missing
      </Badge>
    ),
    card: 'border-dashed',
  },
} as const;

export function VolumeCard({
  volume,
  seriesName,
  onAddToCollection,
  onMarkAsWanted,
}: VolumeCardProps) {
  const config = statusConfig[volume.status];
  const linkToBook = volume.owned && volume.book ? `/library/${volume.book.id}` : null;

  const cover = (
    <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted">
      <CoverImage
        src={volume.coverUrl}
        alt={volume.volumeName ? `${volume.volumeName} cover` : `Volume ${volume.volumeNumber} cover`}
        fill
        className={cn('object-cover', !volume.owned && 'opacity-80 grayscale-[30%]')}
        sizes="(max-width: 640px) 50vw, 200px"
      />
      <div className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-bold text-white">
        #{volume.volumeNumber}
      </div>
      <div className="absolute right-1.5 top-1.5">{config.badge}</div>
    </div>
  );

  const storeLinks =
    !volume.owned && seriesName
      ? generateStoreLinks(null, `${seriesName} Vol. ${volume.volumeNumber}`)
      : [];

  return (
    <Card className={cn('h-full gap-0 py-0 transition-all', config.card, linkToBook && 'hover:-translate-y-0.5 hover:shadow-md')}>
      <CardContent className="flex h-full flex-col gap-3 p-3">
        {linkToBook ? (
          <Link href={linkToBook} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Open ${volume.book?.title ?? `volume ${volume.volumeNumber}`}`}>
            {cover}
          </Link>
        ) : (
          cover
        )}

        <div>
          <p className="line-clamp-2 text-sm font-medium">
            {volume.volumeName || volume.book?.title || `Volume ${volume.volumeNumber}`}
          </p>
        </div>

        {!volume.owned && (
          <div className="mt-auto flex flex-col gap-2">
            {onAddToCollection && (
              <Button size="sm" className="w-full" onClick={() => onAddToCollection(volume.volumeNumber)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add to Collection
              </Button>
            )}
            {!volume.wanted && onMarkAsWanted && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => onMarkAsWanted(volume.volumeNumber)}
              >
                <Heart className="h-4 w-4" aria-hidden="true" />
                Add to Wishlist
              </Button>
            )}
            {storeLinks.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {storeLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Buy on ${link.name}`}
                    className="inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                  >
                    {link.shortName}
                    <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
