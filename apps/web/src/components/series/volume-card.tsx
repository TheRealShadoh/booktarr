'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Heart } from 'lucide-react';

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
  onAddToCollection?: (volumeNumber: number) => void;
  onMarkAsWanted?: (volumeNumber: number) => void;
}

export function VolumeCard({ volume, seriesId, onAddToCollection, onMarkAsWanted }: VolumeCardProps) {
  const statusConfig = {
    owned: {
      badge: <Badge className="bg-green-500">Owned</Badge>,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    wanted: {
      badge: <Badge className="bg-blue-500">Wanted</Badge>,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    missing: {
      badge: <Badge variant="outline" className="text-gray-500">Missing</Badge>,
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
    },
  };

  const config = statusConfig[volume.status];

  const CardWrapper = volume.owned && volume.book ? Link : 'div';
  const cardProps = volume.owned && volume.book
    ? { href: `/library/${volume.book.id}` }
    : {};

  return (
    <CardWrapper {...(cardProps as any)}>
      <Card className={`${config.bgColor} ${config.borderColor} border-2 transition-all ${
        volume.owned && volume.book ? 'cursor-pointer hover:shadow-md' : ''
      }`}>
        <CardContent className="p-4">
          {/* Volume Number Badge */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-700">#{volume.volumeNumber}</span>
            </div>
            {config.badge}
          </div>

          {/* Cover Image */}
          <div className="relative aspect-[2/3] bg-gray-200 rounded-md overflow-hidden mb-3">
            <Image
              src={volume.coverUrl || "/placeholder-book.svg"}
              alt={`Volume ${volume.volumeNumber}`}
              fill
              className="object-cover"
              sizes="200px"
            />
          </div>

          {/* Volume Title */}
          <div className="min-h-[3rem] mb-3">
            {volume.volumeName && (
              <p className="text-sm font-medium line-clamp-2 mb-1">{volume.volumeName}</p>
            )}
            {volume.owned && volume.book && (
              <p className="text-xs text-muted-foreground line-clamp-2">{volume.book.title}</p>
            )}
            {!volume.owned && !volume.volumeName && (
              <p className="text-xs text-muted-foreground italic">Volume {volume.volumeNumber}</p>
            )}
          </div>

          {/* Action Buttons */}
          {!volume.owned && (
            <div className="flex flex-col gap-2">
              {onAddToCollection && (
                <Button
                  size="sm"
                  variant="default"
                  className="w-full"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAddToCollection(volume.volumeNumber);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add to Collection
                </Button>
              )}
              {!volume.wanted && onMarkAsWanted && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onMarkAsWanted(volume.volumeNumber);
                  }}
                >
                  <Heart className="h-4 w-4 mr-1" />
                  Add to Wishlist
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </CardWrapper>
  );
}
