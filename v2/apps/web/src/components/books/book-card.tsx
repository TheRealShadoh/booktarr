'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { ReadingProgressCard } from '@/components/reading/reading-progress-card';
import { ReadingProgressDialog } from '@/components/reading/reading-progress-dialog';
import type { ReadingStatus } from '@/components/reading/reading-status-badge';

interface BookCardProps {
  book: {
    book: {
      id: string;
      title: string;
      subtitle?: string | null;
    };
    edition: {
      coverUrl?: string | null;
      coverThumbnailUrl?: string | null;
      format?: string | null;
    };
    authors?: Array<{
      name: string;
    }>;
    userBook: {
      status: string;
    };
    readingProgress?: {
      status: ReadingStatus;
      currentPage?: number;
      totalPages?: number;
      progressPercentage?: number;
      rating?: number;
      review?: string;
    } | null;
  };
  onClick?: () => void;
}

export function BookCard({ book, onClick }: BookCardProps) {
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  const coverUrl =
    book.edition.coverUrl ||
    book.edition.coverThumbnailUrl ||
    '/placeholder-book.png';

  const statusColors: Record<string, string> = {
    owned: 'bg-green-500',
    wanted: 'bg-blue-500',
    missing: 'bg-gray-500',
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowProgressDialog(true);
  };

  return (
    <>
      <Card
        className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
        onClick={onClick}
      >
        <CardContent className="p-0">
          <div className="relative aspect-[2/3] bg-gray-100">
            <Image
              src={coverUrl}
              alt={book.book.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
            <div className="absolute right-2 top-2 flex gap-2">
              <Badge className={statusColors[book.userBook.status] || 'bg-gray-500'}>
                {book.userBook.status}
              </Badge>
            </div>

            {/* Reading progress button overlay */}
            <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleProgressClick}
                className="h-8 w-8 rounded-full p-0"
                title="Update reading progress"
              >
                <BookOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <h3 className="line-clamp-2 font-semibold text-sm">
                {book.book.title}
              </h3>

              {book.authors && book.authors.length > 0 && (
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {book.authors.map((a) => a.name).join(', ')}
                </p>
              )}

              {book.edition.format && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {book.edition.format}
                </p>
              )}
            </div>

            {/* Reading progress display */}
            {book.readingProgress && (
              <ReadingProgressCard
                status={book.readingProgress.status}
                currentPage={book.readingProgress.currentPage}
                totalPages={book.readingProgress.totalPages}
                progressPercentage={book.readingProgress.progressPercentage}
                rating={book.readingProgress.rating}
                compact
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reading progress dialog */}
      <ReadingProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        bookId={book.book.id}
        bookTitle={book.book.title}
        currentProgress={book.readingProgress || undefined}
      />
    </>
  );
}
