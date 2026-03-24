'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookCard } from '@/components/books/book-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AddBookDialog } from '@/components/books/add-book-dialog';
import { BookMarked } from 'lucide-react';

export default function WishlistPage() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['books', { status: 'wanted' }],
    queryFn: async () => {
      const response = await fetch('/api/books?status=wanted');
      if (!response.ok) throw new Error('Failed to fetch wishlist');
      return response.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wishlist</h1>
          <p className="text-muted-foreground">
            {data?.books?.length || 0} books you want to read
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>Add to Wishlist</Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[2/3] w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-md bg-destructive/10 p-4 text-destructive">
          <span>Failed to load wishlist. Please try again.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {data?.books?.length === 0 && !isLoading && !error && (
        <div className="rounded-xl border border-muted py-16 text-center">
          <BookMarked className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-semibold">Save books you want to read</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your wishlist is empty. Add books you are looking forward to.
          </p>
          <Button className="mt-6" onClick={() => setAddDialogOpen(true)}>Add to Wishlist</Button>
        </div>
      )}

      {data?.books && data.books.length > 0 && (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {data.books.map((book: unknown) => (
            <BookCard
              key={(book as { userBook: { id: string } }).userBook.id}
              book={book as Parameters<typeof BookCard>[0]['book']}
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
