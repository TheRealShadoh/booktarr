'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookCard } from '@/components/books/book-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CSVImportDialog } from '@/components/import/csv-import-dialog';
import { AddBookDialog } from '@/components/books/add-book-dialog';
import { AdvancedSearch, SearchFilters } from '@/components/search/advanced-search';
import type { BooksApiResponse, BookWithRelations } from '@/types/api';

interface ShareEntry {
  id: string;
  status: string;
  permission: string;
  ownerEmail?: string;
  ownerName?: string;
  ownerId?: string;
}

interface SharedBooksEntry {
  ownerId: string;
  ownerName: string;
  books: BookWithRelations[];
}

export default function LibraryPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddBookDialog, setShowAddBookDialog] = useState(false);
  const [showShared, setShowShared] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['books', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.query) params.append('search', filters.query);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.author) params.append('author', filters.author);
      if (filters.readingStatus && filters.readingStatus !== 'all') {
        params.append('readingStatus', filters.readingStatus);
      }
      if (filters.format && filters.format !== 'all') params.append('format', filters.format);
      if (filters.rating?.min) params.append('minRating', filters.rating.min.toString());
      if (filters.year?.min) params.append('yearMin', filters.year.min.toString());
      if (filters.year?.max) params.append('yearMax', filters.year.max.toString());

      params.append('limit', '100');

      const response = await fetch(`/api/books?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch books');
      return response.json() as Promise<BooksApiResponse>;
    },
  });

  // Fetch accepted incoming shares when toggle is on
  const { data: sharesData } = useQuery({
    queryKey: ['shares'],
    queryFn: async () => {
      const response = await fetch('/api/shares');
      if (!response.ok) throw new Error('Failed to fetch shares');
      return response.json() as Promise<{ sent: ShareEntry[]; received: ShareEntry[] }>;
    },
    enabled: showShared,
  });

  // Fetch books for each accepted incoming share
  const acceptedShares = sharesData?.received.filter((s) => s.status === 'accepted') ?? [];

  const { data: sharedBooksData } = useQuery<SharedBooksEntry[]>({
    queryKey: ['shared-books', acceptedShares.map((s) => s.ownerId ?? s.ownerEmail).join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        acceptedShares.map(async (share) => {
          const ownerId = share.ownerId ?? share.ownerEmail ?? '';
          const response = await fetch(`/api/shares/${encodeURIComponent(ownerId)}/books`);
          if (!response.ok) return null;
          const books = await response.json() as BookWithRelations[];
          return {
            ownerId,
            ownerName: share.ownerName ?? share.ownerEmail ?? 'Unknown',
            books,
          };
        })
      );
      return results.filter((r): r is SharedBooksEntry => r !== null);
    },
    enabled: showShared && acceptedShares.length > 0,
  });

  // Build merged book list with owner annotation
  type AnnotatedBook = BookWithRelations & { _sharedFrom?: string };

  const ownBooks: AnnotatedBook[] = data?.books ?? [];
  const sharedBooks: AnnotatedBook[] = showShared
    ? (sharedBooksData ?? []).flatMap((entry) =>
        entry.books.map((book) => ({ ...book, _sharedFrom: entry.ownerName }))
      )
    : [];

  const allBooks: AnnotatedBook[] = [...ownBooks, ...sharedBooks];
  const totalCount = (data?.pagination?.total ?? 0) + sharedBooks.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Library</h1>
          <p className="text-muted-foreground">
            {totalCount} books in your collection
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showShared ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowShared((prev) => !prev)}
          >
            Show Shared
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>Add Book</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setShowAddBookDialog(true)}>
                Add Single Book
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShowImportDialog(true)}>
                Import from CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AddBookDialog open={showAddBookDialog} onOpenChange={setShowAddBookDialog} />
      <CSVImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />

      <AdvancedSearch onSearch={setFilters} initialFilters={filters} />

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
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          Failed to load books. Please try again.
        </div>
      )}

      {allBooks.length === 0 && !isLoading && (
        <div className="rounded-lg border-2 border-dashed py-12 text-center">
          <p className="text-muted-foreground">
            No books found. Add your first book to get started!
          </p>
          <Button className="mt-4" onClick={() => setShowAddBookDialog(true)}>
            Add Book
          </Button>
        </div>
      )}

      {allBooks.length > 0 && (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {allBooks.map((book: AnnotatedBook) => (
            <div key={`${book._sharedFrom ?? 'own'}-${book.userBook.id}`} className="relative">
              {book._sharedFrom && (
                <div className="absolute right-2 top-2 z-10">
                  <Badge className="bg-purple-600 text-white text-xs">
                    From {book._sharedFrom}
                  </Badge>
                </div>
              )}
              <BookCard
                book={book}
                onClick={() => router.push(`/library/${book.book.id}`)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
