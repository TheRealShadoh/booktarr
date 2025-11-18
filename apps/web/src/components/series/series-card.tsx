import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';

interface SeriesCardProps {
  series: {
    id: string;
    name: string;
    status: string;
    totalVolumes: number;
    ownedVolumes: number;
    completionPercentage: number;
    coverUrl?: string | null;
  };
}

export function SeriesCard({ series }: SeriesCardProps) {
  const statusColors: Record<string, string> = {
    ongoing: 'bg-blue-500',
    completed: 'bg-green-500',
    hiatus: 'bg-yellow-500',
    cancelled: 'bg-red-500',
  };

  return (
    <Link href={`/series/${series.id}`}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex gap-3">
            {/* Small Series Cover Thumbnail */}
            <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded bg-muted">
              {series.coverUrl ? (
                <Image
                  src={series.coverUrl}
                  alt={`${series.name} cover`}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <BookOpen className="h-6 w-6 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Title and Status */}
            <div className="flex flex-1 items-start justify-between">
              <CardTitle className="line-clamp-2 text-lg">{series.name}</CardTitle>
              <Badge className={statusColors[series.status] || 'bg-gray-500'}>
                {series.status}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {series.ownedVolumes} / {series.totalVolumes} volumes
              </span>
            </div>

            <Progress value={series.completionPercentage} className="h-2" />

            <p className="text-center text-xs text-muted-foreground">
              {series.completionPercentage}% complete
            </p>
          </div>

          {series.completionPercentage === 100 && (
            <div className="rounded-md bg-green-50 p-2 text-center text-xs text-green-800">
              Collection complete! 🎉
            </div>
          )}

          {series.completionPercentage < 100 && series.totalVolumes - series.ownedVolumes > 0 && (
            <div className="rounded-md bg-blue-50 p-2 text-center text-xs text-blue-800">
              {series.totalVolumes - series.ownedVolumes} volumes missing
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
