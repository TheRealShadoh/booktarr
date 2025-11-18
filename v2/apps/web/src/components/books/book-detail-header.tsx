'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ReadingProgressDialog } from '@/components/reading/reading-progress-dialog';

interface BookDetailHeaderProps {
  book: {
    id: string;
    title: string;
    subtitle?: string | null;
  };
  authors: Array<{
    name: string;
  }>;
  coverUrl?: string | null;
  primaryEdition?: {
    format?: string | null;
  };
  userStatus?: string | null;
  readingProgress?: {
    status: string;
    currentPage?: number;
    totalPages?: number;
    rating?: number;
  } | null;
  onDelete?: () => void;
}

export function BookDetailHeader({
  book,
  authors,
  coverUrl,
  primaryEdition,
  userStatus,
  readingProgress,
  onDelete,
}: BookDetailHeaderProps) {
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  const statusColors: Record<string, string> = {
    owned: 'bg-green-500',
    wanted: 'bg-blue-500',
    missing: 'bg-gray-500',
  };

  const readingStatusColors: Record<string, string> = {
    want_to_read: 'bg-blue-500',
    currently_reading: 'bg-orange-500',
    finished: 'bg-green-500',
    dnf: 'bg-red-500',
    on_hold: 'bg-yellow-500',
  };

  const readingStatusLabels: Record<string, string> = {
    want_to_read: 'Want to Read',
    currently_reading: 'Currently Reading',
    finished: 'Finished',
    dnf: 'Did Not Finish',
    on_hold: 'On Hold',
  };

  return (
    <>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Cover Image */}
        <div className="shrink-0">
          <div className="relative aspect-[2/3] w-48 md:w-64 bg-muted rounded-lg overflow-hidden shadow-lg">
            <Image
              src={coverUrl || '/placeholder-book.svg'}
              alt={book.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 192px, 256px"
              priority
            />
          </div>
        </div>

        {/* Book Info */}
        <div className="flex-1 space-y-4">
          {/* Title and Subtitle */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">{book.title}</h1>
            {book.subtitle && (
              <p className="text-xl text-muted-foreground mt-1">{book.subtitle}</p>
            )}
          </div>

          {/* Authors */}
          {authors.length > 0 && (
            <p className="text-lg text-muted-foreground">
              by {authors.map((a) => a.name).join(', ')}
            </p>
          )}

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {userStatus && (
              <Badge className={statusColors[userStatus] || 'bg-gray-500'}>
                {userStatus.charAt(0).toUpperCase() + userStatus.slice(1)}
              </Badge>
            )}
            {primaryEdition?.format && (
              <Badge variant="outline">
                {primaryEdition.format}
              </Badge>
            )}
            {readingProgress && (
              <Badge
                className={
                  readingStatusColors[readingProgress.status] || 'bg-gray-500'
                }
              >
                {readingStatusLabels[readingProgress.status] || readingProgress.status}
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setShowProgressDialog(true)}>
              <BookOpen className="mr-2 h-4 w-4" />
              Update Reading Progress
            </Button>
            {onDelete && (
              <Button variant="destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove from Library
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Reading Progress Dialog */}
      <ReadingProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        bookId={book.id}
        bookTitle={book.title}
        currentProgress={readingProgress || undefined}
      />
    </>
  );
}
