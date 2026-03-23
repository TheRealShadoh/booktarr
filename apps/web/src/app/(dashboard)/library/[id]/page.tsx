'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BookDetailHeader } from '@/components/books/book-detail-header';
import { BookMetadataCard } from '@/components/books/book-metadata-card';
import { BookEditionsManager } from '@/components/books/book-editions-manager';
import { BookRecommendations } from '@/components/books/book-recommendations';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { id: bookId } = use(params);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch book details
  const { data, isLoading, error } = useQuery({
    queryKey: ['book', bookId],
    queryFn: async () => {
      const response = await fetch(`/api/books/${bookId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Book not found');
        }
        throw new Error('Failed to fetch book details');
      }
      return response.json();
    },
  });

  // Fetch reading progress
  const { data: readingProgressData } = useQuery({
    queryKey: ['reading-progress', bookId],
    queryFn: async () => {
      const response = await fetch(`/api/reading/progress?bookId=${bookId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!data,
  });

  // Delete book mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete book');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({
        title: 'Book removed',
        description: 'The book has been removed from your library.',
      });
      router.push('/library');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" disabled>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Library
        </Button>

        <div className="flex flex-col md:flex-row gap-6">
          <Skeleton className="aspect-[2/3] w-48 md:w-64 rounded-lg" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>

        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/library')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Library
        </Button>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-destructive mb-4">
                {error instanceof Error ? error.message : 'Failed to load book details'}
              </p>
              <Button onClick={() => router.push('/library')}>
                Return to Library
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { book, authors, editions } = data;

  // Find primary edition (first owned, or first overall)
  const primaryEdition =
    editions.find((e: { userStatus?: string }) => e.userStatus === 'owned') || editions[0];

  // Get user status from any edition
  const userStatus = editions.find((e: { userStatus?: string }) => e.userStatus)?.userStatus;

  const readingProgress = readingProgressData || null;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.push('/library')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Library
      </Button>

      {/* Book Header */}
      <BookDetailHeader
        book={book}
        authors={authors}
        coverUrl={primaryEdition?.coverUrl || primaryEdition?.coverThumbnailUrl}
        primaryEdition={primaryEdition}
        userStatus={userStatus}
        readingProgress={readingProgress}
        onDelete={() => setShowDeleteDialog(true)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Library</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &ldquo;{book.title}&rdquo; from your library?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Description */}
      {book.description && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Description</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {book.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <BookMetadataCard book={book} edition={primaryEdition} />

      {/* Editions */}
      <BookEditionsManager bookId={book.id} editions={editions} />

      {/* Recommendations */}
      <BookRecommendations
        bookId={book.id}
        categories={book.categories}
        authorName={authors?.[0]?.name}
      />
    </div>
  );
}
