'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { BookCard } from '@/components/books/book-card';
import { Button } from '@/components/ui/button';
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

export default function LibraryPage() {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddBookDialog, setShowAddBookDialog] = useState(false);

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

      // Load all books (remove pagination limit)
      params.append('limit', '10000');

      const response = await fetch(`/api/books?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch books');
      return response.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Library</h1>
          <p className="text-muted-foreground">
            {data?.pagination?.total || 0} books in your collection
          </p>
        </div>

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
        <div className="rounded-md bg-red-50 p-4 text-red-800">
          Failed to load books. Please try again.
        </div>
      )}

      {data?.books.length === 0 && !isLoading && (
        <div className="rounded-lg border-2 border-dashed py-12 text-center">
          <p className="text-muted-foreground">
            No books found. Add your first book to get started!
          </p>
          <Button className="mt-4" onClick={() => setShowAddBookDialog(true)}>
            Add Book
          </Button>
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
