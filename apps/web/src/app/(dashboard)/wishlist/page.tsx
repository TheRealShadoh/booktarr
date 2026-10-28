'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { BookCard } from '@/components/books/book-card';
import { BookGridSkeleton, BOOK_GRID_CLASS } from '@/components/books/book-grid-skeleton';
import { Button } from '@/components/ui/button';
import { AddBookDialog } from '@/components/books/add-book-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Heart, Plus } from 'lucide-react';
import type { BooksApiResponse } from '@/types/api';

export default function WishlistPage() {
  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['books', { status: 'wanted' }],
    queryFn: async () => {
      const response = await fetch('/api/books?status=wanted&limit=100');
      if (!response.ok) throw new Error('Failed to fetch wishlist');
      return response.json() as Promise<BooksApiResponse>;
    },
  });

  const books = data?.books ?? [];
  const total = data?.pagination?.total ?? books.length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Heart}
        title="Wishlist"
        description={isLoading ? 'Loading…' : `${total} ${total === 1 ? 'book' : 'books'} you want`}
        actions={
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add to Wishlist
          </Button>
        }
      />

      {isLoading && <BookGridSkeleton />}

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <span>Couldn&apos;t load your wishlist.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {books.length === 0 && !isLoading && !error && (
        <EmptyState
          icon={Heart}
          title="Save books you want"
          description="Your wishlist is empty. Add the books you're looking forward to and they'll show up here with a Wanted badge."
          action={
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add to Wishlist
            </Button>
          }
        />
      )}

      {books.length > 0 && (
        <div className={BOOK_GRID_CLASS}>
          {books.map((book) => (
            <BookCard
              key={book.userBook.id}
              book={book}
              onClick={() => router.push(`/library/${book.book.id}`)}
            />
          ))}
        </div>
      )}

      <AddBookDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        defaultStatus="wanted"
      />
    </div>
  );
}
