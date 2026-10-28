'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CoverImage } from '@/components/books/cover-image';
import { BookOpen, Trash2, Headphones, ExternalLink, Layers } from 'lucide-react';
import { useState } from 'react';
import { ReadingProgressDialog } from '@/components/reading/reading-progress-dialog';
import type { ReadingStatus } from '@/lib/services/reading-progress';

interface BookDetailHeaderProps {
  book: {
    id: string;
    title: string;
    subtitle?: string | null;
    description?: string | null;
  };
  authors: Array<{
    name: string;
  }>;
  coverUrl?: string | null;
  primaryEdition?: {
    format?: string | null;
  };
  series?: {
    id: string;
    name: string;
    volumeNumber: number;
    volumeName?: string | null;
  } | null;
  userStatus?: string | null;
  readingProgress?: {
    status: ReadingStatus;
    currentPage?: number;
    totalPages?: number;
    rating?: number;
    review?: string;
  } | null;
  onDelete?: () => void;
}

const statusColors: Record<string, string> = {
  owned: 'bg-green-600 text-white',
  wanted: 'bg-blue-600 text-white',
  missing: 'bg-zinc-700 text-white',
  loaned: 'bg-amber-600 text-white',
};

const readingStatusColors: Record<string, string> = {
  want_to_read: 'bg-blue-600 text-white',
  currently_reading: 'bg-orange-600 text-white',
  finished: 'bg-green-600 text-white',
  dnf: 'bg-red-600 text-white',
  on_hold: 'bg-yellow-600 text-white',
};

const readingStatusLabels: Record<string, string> = {
  want_to_read: 'Want to Read',
  currently_reading: 'Currently Reading',
  finished: 'Finished',
  dnf: 'Did Not Finish',
  on_hold: 'On Hold',
};

export function BookDetailHeader({
  book,
  authors,
  coverUrl,
  primaryEdition,
  series,
  userStatus,
  readingProgress,
  onDelete,
}: BookDetailHeaderProps) {
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const description = book.description?.trim();
  const longDescription = (description?.length ?? 0) > 600;

  return (
    <>
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Cover Image */}
        <div className="shrink-0">
          <div className="relative aspect-[2/3] w-44 overflow-hidden rounded-lg bg-muted shadow-lg md:w-56">
            <CoverImage
              src={coverUrl}
              alt={book.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 176px, 224px"
              priority
            />
          </div>
        </div>

        {/* Book Info */}
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">{book.title}</h1>
            {book.subtitle && (
              <p className="mt-1 text-lg text-muted-foreground">{book.subtitle}</p>
            )}
            {authors.length > 0 && (
              <p className="mt-2 text-base text-muted-foreground">
                by {authors.map((a) => a.name).join(', ')}
              </p>
            )}
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {userStatus && (
              <Badge className={statusColors[userStatus] || 'bg-zinc-700 text-white'}>
                {userStatus.charAt(0).toUpperCase() + userStatus.slice(1)}
              </Badge>
            )}
            {primaryEdition?.format && (
              <Badge variant="outline" className="capitalize">
                {primaryEdition.format}
              </Badge>
            )}
            {readingProgress && (
              <Badge className={readingStatusColors[readingProgress.status] || 'bg-zinc-700 text-white'}>
                {readingStatusLabels[readingProgress.status] || readingProgress.status}
              </Badge>
            )}
            {series && (
              <Badge variant="secondary" asChild>
                <Link href={`/series/${series.id}`} className="gap-1">
                  <Layers className="h-3 w-3" aria-hidden="true" />
                  {series.name} #{series.volumeNumber}
                </Link>
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowProgressDialog(true)}>
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              {readingProgress ? 'Update progress' : 'Start reading'}
            </Button>
            {primaryEdition?.format === 'ebook' && (
              <Button variant="outline" asChild>
                <a href="https://read.amazon.com/" target="_blank" rel="noopener noreferrer">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  Read on Kindle
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </Button>
            )}
            {primaryEdition?.format === 'audiobook' && (
              <Button variant="outline" asChild>
                <a href="https://www.audible.com/library" target="_blank" rel="noopener noreferrer">
                  <Headphones className="h-4 w-4" aria-hidden="true" />
                  Listen on Audible
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Remove
              </Button>
            )}
          </div>

          {/* Description */}
          {description && (
            <div className="space-y-2 pt-2">
              <p
                className={`whitespace-pre-line text-sm leading-relaxed text-muted-foreground ${
                  longDescription && !descExpanded ? 'line-clamp-6' : ''
                }`}
              >
                {description}
              </p>
              {longDescription && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-sm"
                  onClick={() => setDescExpanded((v) => !v)}
                  aria-expanded={descExpanded}
                >
                  {descExpanded ? 'Show less' : 'Read more'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

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
