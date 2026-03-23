'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { BookCard } from '@/components/books/book-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Layers } from 'lucide-react';
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

type SortOption = 'recently-added' | 'title-az' | 'title-za' | 'author-az';

const SORT_LABELS: Record<SortOption, string> = {
  'recently-added': 'Recently Added',
  'title-az': 'Title A-Z',
  'title-za': 'Title Z-A',
  'author-az': 'Author A-Z',
};

const GROUP_BY_SERIES_KEY = 'booktarr:library:groupBySeries';

interface SeriesGroup {
  seriesId: string;
  seriesName: string;
  coverUrl: string | null;
  ownedVolumes: number;
  totalVolumes: number;
}

function SeriesGroupCard({ group, onClick }: { group: SeriesGroup; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);
  const cover = imgError || !group.coverUrl ? '/placeholder-book.svg' : group.coverUrl;

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="relative aspect-[2/3] bg-muted">
          <Image
            src={cover}
            alt={group.seriesName}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            onError={() => setImgError(true)}
            loading="lazy"
          />
          <div className="absolute right-2 top-2">
            <Badge className="bg-indigo-600 text-white text-xs">Series</Badge>
          </div>
        </div>
        <div className="p-4 space-y-1">
          <h3 className="line-clamp-2 font-semibold text-sm">{group.seriesName}</h3>
          <p className="text-xs text-muted-foreground">
            {group.ownedVolumes} of {group.totalVolumes > 0 ? group.totalVolumes : '?'} volumes
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LibraryPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortBy, setSortBy] = useState<SortOption>('recently-added');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddBookDialog, setShowAddBookDialog] = useState(false);
  const [showShared, setShowShared] = useState(false);
  const [groupBySeries, setGroupBySeries] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(GROUP_BY_SERIES_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(GROUP_BY_SERIES_KEY, String(groupBySeries));
  }, [groupBySeries]);

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
      if (filters.genres && filters.genres.length > 0) params.append('genre', filters.genres[0]);

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
          const ownerId = (share as unknown as { user?: { id: string } }).user?.id ?? share.ownerId ?? '';
          if (!ownerId) return null;
          const response = await fetch(`/api/shares/books/${encodeURIComponent(ownerId)}`);
          if (!response.ok) return null;
          const data = await response.json() as { books: BookWithRelations[]; sharedFrom?: { name?: string; email?: string } };
          return {
            ownerId,
            ownerName: data.sharedFrom?.name ?? data.sharedFrom?.email ?? 'Unknown',
            books: data.books,
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

  const unsortedBooks: AnnotatedBook[] = [...ownBooks, ...sharedBooks];

  const allBooks: AnnotatedBook[] = [...unsortedBooks].sort((a, b) => {
    switch (sortBy) {
      case 'title-az':
        return a.book.title.localeCompare(b.book.title);
      case 'title-za':
        return b.book.title.localeCompare(a.book.title);
      case 'author-az': {
        const authorA = a.authors?.[0]?.name ?? '';
        const authorB = b.authors?.[0]?.name ?? '';
        return authorA.localeCompare(authorB);
      }
      case 'recently-added':
      default:
        return 0; // server already returns desc by createdAt
    }
  });

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

      <div className="flex items-center gap-3">
        <AdvancedSearch onSearch={setFilters} initialFilters={filters} />
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[160px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
              <SelectItem key={key} value={key}>
                {SORT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={groupBySeries ? 'default' : 'outline'}
          size="sm"
          className="shrink-0 gap-1"
          onClick={() => setGroupBySeries((prev) => !prev)}
          title="Group by Series"
        >
          <Layers className="h-4 w-4" />
          <span className="hidden sm:inline">Group by Series</span>
        </Button>
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

      {allBooks.length > 0 && !groupBySeries && (
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

      {allBooks.length > 0 && groupBySeries && (() => {
        // Group books with a series together; ungrouped books render individually
        const seriesMap = new Map<string, { group: SeriesGroup; books: AnnotatedBook[] }>();
        const ungroupedBooks: AnnotatedBook[] = [];

        for (const book of allBooks) {
          if (book.series?.id) {
            const sid = book.series.id;
            if (!seriesMap.has(sid)) {
              seriesMap.set(sid, {
                group: {
                  seriesId: sid,
                  seriesName: book.series.name,
                  coverUrl: book.edition.coverUrl ?? null,
                  ownedVolumes: 0,
                  totalVolumes: 0,
                },
                books: [],
              });
            }
            const entry = seriesMap.get(sid)!;
            entry.books.push(book);
            entry.group.ownedVolumes = entry.books.length;
            // Use first book's cover if not yet set
            if (!entry.group.coverUrl) {
              entry.group.coverUrl = book.edition.coverUrl ?? null;
            }
          } else {
            ungroupedBooks.push(book);
          }
        }

        // Set totalVolumes to ownedVolumes as a floor (we don't have total from this query)
        seriesMap.forEach((entry) => {
          entry.group.totalVolumes = entry.group.ownedVolumes;
        });

        const seriesGroups = Array.from(seriesMap.values());

        return (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {seriesGroups.map(({ group }) => (
              <SeriesGroupCard
                key={group.seriesId}
                group={group}
                onClick={() => router.push(`/series/${group.seriesId}`)}
              />
            ))}
            {ungroupedBooks.map((book: AnnotatedBook) => (
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
        );
      })()}
    </div>
  );
}
