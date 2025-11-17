'use client';

import { useQuery } from '@tanstack/react-query';
import { BookCard } from '@/components/books/book-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function WishlistPage() {
  const { data, isLoading, error } = useQuery({
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
        <Button>Add to Wishlist</Button>
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
        <div className="rounded-md bg-red-50 p-4 text-red-800">
          Failed to load wishlist. Please try again.
        </div>
      )}

      {data?.books?.length === 0 && !isLoading && (
        <div className="rounded-lg border-2 border-dashed py-12 text-center">
          <p className="text-muted-foreground">
            Your wishlist is empty. Add books you want to read!
          </p>
          <Button className="mt-4">Add Book</Button>
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
    </div>
  );
}
