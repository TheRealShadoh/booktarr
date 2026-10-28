'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { BookCard } from '@/components/books/book-card';
import { CoverImage } from '@/components/books/cover-image';
import { BookGridSkeleton, BOOK_GRID_CLASS } from '@/components/books/book-grid-skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { Layers, Library, Plus, FileUp, Users, ChevronDown, Loader2, SearchX } from 'lucide-react';
import { CSVImportDialog } from '@/components/import/csv-import-dialog';
import { AddBookDialog } from '@/components/books/add-book-dialog';
import { AdvancedSearch, SearchFilters } from '@/components/search/advanced-search';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
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
  'title-az': 'Title A–Z',
  'title-za': 'Title Z–A',
  'author-az': 'Author A–Z',
};

const PAGE_SIZE = 100;
const GROUP_BY_SERIES_KEY = 'booktarr:library:groupBySeries';

type AnnotatedBook = BookWithRelations & { _sharedFrom?: string };

interface SeriesGroup {
  seriesId: string;
  seriesName: string;
  coverUrl: string | null;
  books: AnnotatedBook[];
}

function buildBookParams(filters: SearchFilters, offset: number): URLSearchParams {
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
  params.append('limit', String(PAGE_SIZE));
  params.append('offset', String(offset));
  return params;
}

// Persisted "group by series" preference, read via useSyncExternalStore so the
// server render (false) and client render agree without a setState-in-effect.
const groupByListeners = new Set<() => void>();
function subscribeGroupBy(cb: () => void) {
  groupByListeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    groupByListeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}
function readGroupBy(): boolean {
  try {
    return localStorage.getItem(GROUP_BY_SERIES_KEY) === 'true';
  } catch {
    return false;
  }
}
function writeGroupBy(value: boolean) {
  try {
    localStorage.setItem(GROUP_BY_SERIES_KEY, String(value));
  } catch {
    /* ignore */
  }
  groupByListeners.forEach((cb) => cb());
}

function SharedFromBadge({ name }: { name?: string }) {
  if (!name) return null;
  return (
    <div className="absolute right-2 top-2 z-10">
      <Badge className="bg-purple-600 text-white shadow-sm">From {name}</Badge>
    </div>
  );
}

function SeriesGroupCard({
  group,
  onBookClick,
  onSeriesClick,
}: {
  group: SeriesGroup;
  onBookClick: (bookId: string) => void;
  onSeriesClick: (seriesId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const sortedBooks = [...group.books].sort(
    (a, b) => (a.series?.volumeNumber ?? 0) - (b.series?.volumeNumber ?? 0)
  );

  // Gaps in the owned sequence (we only know volumes we own from this query)
  const ownedVolNums = new Set(sortedBooks.map((b) => b.series?.volumeNumber ?? 0));
  const maxVol = Math.max(...ownedVolNums, 0);
  const missingVols: number[] = [];
  for (let i = 1; i <= maxVol; i++) {
    if (!ownedVolNums.has(i)) missingVols.push(i);
  }

  if (!expanded) {
    return (
      <Card
        className="group cursor-pointer gap-0 overflow-hidden py-0 transition-all hover:-translate-y-0.5 hover:shadow-lg"
        onClick={() => setExpanded(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(true);
          }
        }}
        aria-label={`Expand ${group.seriesName}`}
      >
        <CardContent className="p-0">
          <div className="relative aspect-[2/3] bg-muted">
            {/* Stacked-cover effect to signal "this is a group" */}
            <div className="absolute inset-x-3 -top-1 h-full rounded-md bg-muted-foreground/20" aria-hidden="true" />
            <div className="absolute inset-x-1.5 top-0.5 h-full rounded-md bg-muted-foreground/30" aria-hidden="true" />
            <div className="absolute inset-0 top-2 overflow-hidden rounded-md">
              <CoverImage
                src={group.coverUrl}
                alt={group.seriesName}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                loading="lazy"
              />
            </div>
            <div className="absolute left-2 top-4">
              <Badge className="bg-primary text-primary-foreground shadow-sm">
                <Layers className="h-3 w-3" aria-hidden="true" />
                {group.books.length} vol{group.books.length === 1 ? '' : 's'}
              </Badge>
            </div>
          </div>
          <div className="space-y-1 p-3">
            <h3 className="line-clamp-2 text-sm font-semibold">{group.seriesName}</h3>
            {missingVols.length > 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {missingVols.length} gap{missingVols.length === 1 ? '' : 's'} in sequence
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Volumes 1–{maxVol || '?'}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full gap-0 overflow-hidden py-0">
      <CardContent className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">{group.seriesName}</h3>
            <p className="text-sm text-muted-foreground">
              {group.books.length} owned
              {missingVols.length > 0 && ` · ${missingVols.length} missing below #${maxVol}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onSeriesClick(group.seriesId)}>
              Series page
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
              Collapse
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {Array.from({ length: maxVol }, (_, i) => i + 1).map((volNum) => {
            const book = sortedBooks.find((b) => b.series?.volumeNumber === volNum);
            if (!book) {
              return (
                <div
                  key={volNum}
                  className="relative flex aspect-[2/3] items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/20 bg-muted/30"
                  aria-label={`Volume ${volNum} missing`}
                >
                  <span className="text-xs font-bold text-muted-foreground/50">#{volNum}</span>
                </div>
              );
            }
            return (
              <button
                key={volNum}
                type="button"
                className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted transition-all hover:ring-2 hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onBookClick(book.book.id)}
                aria-label={`${group.seriesName} volume ${volNum}`}
              >
                <CoverImage
                  src={book.edition.coverUrl || book.edition.coverThumbnailUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="96px"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center">
                  <span className="text-[10px] font-medium text-white">Vol. {volNum}</span>
                </div>
              </button>
            );
          })}
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
  const groupBySeries = useSyncExternalStore(subscribeGroupBy, readGroupBy, () => false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const toggleGroupBySeries = () => writeGroupBy(!groupBySeries);

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['books', filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const response = await fetch(`/api/books?${buildBookParams(filters, pageParam).toString()}`);
      if (!response.ok) throw new Error('Failed to fetch books');
      return response.json() as Promise<BooksApiResponse>;
    },
    getNextPageParam: (lastPage) => {
      const { offset, limit, total } = lastPage.pagination;
      const next = offset + limit;
      return next < total ? next : undefined;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Auto-load the next page when the sentinel scrolls into view
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '600px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Shared libraries (only fetched when the toggle is on)
  const { data: sharesData } = useQuery({
    queryKey: ['shares'],
    queryFn: async () => {
      const response = await fetch('/api/shares');
      if (!response.ok) throw new Error('Failed to fetch shares');
      return response.json() as Promise<{ sent: ShareEntry[]; received: ShareEntry[] }>;
    },
    enabled: showShared,
  });

  const acceptedShares = useMemo(
    () => sharesData?.received.filter((s) => s.status === 'accepted') ?? [],
    [sharesData]
  );

  const { data: sharedBooksData } = useQuery<SharedBooksEntry[]>({
    queryKey: ['shared-books', acceptedShares.map((s) => s.ownerId ?? s.ownerEmail).join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        acceptedShares.map(async (share) => {
          const ownerId =
            (share as unknown as { user?: { id: string } }).user?.id ?? share.ownerId ?? '';
          if (!ownerId) return null;
          const response = await fetch(`/api/shares/books/${encodeURIComponent(ownerId)}`);
          if (!response.ok) return null;
          const payload = (await response.json()) as {
            books: BookWithRelations[];
            sharedFrom?: { name?: string; email?: string };
          };
          return {
            ownerId,
            ownerName: payload.sharedFrom?.name ?? payload.sharedFrom?.email ?? 'Unknown',
            books: payload.books,
          };
        })
      );
      return results.filter((r): r is SharedBooksEntry => r !== null);
    },
    enabled: showShared && acceptedShares.length > 0,
  });

  const ownBooks: AnnotatedBook[] = useMemo(
    () => data?.pages.flatMap((page) => page.books) ?? [],
    [data]
  );
  const sharedBooks: AnnotatedBook[] = useMemo(
    () =>
      showShared
        ? (sharedBooksData ?? []).flatMap((entry) =>
            entry.books.map((book) => ({ ...book, _sharedFrom: entry.ownerName }))
          )
        : [],
    [showShared, sharedBooksData]
  );

  const allBooks: AnnotatedBook[] = useMemo(() => {
    const merged = [...ownBooks, ...sharedBooks];
    if (sortBy === 'recently-added') return merged; // server already orders by createdAt desc
    return merged.sort((a, b) => {
      switch (sortBy) {
        case 'title-az':
          return a.book.title.localeCompare(b.book.title);
        case 'title-za':
          return b.book.title.localeCompare(a.book.title);
        case 'author-az':
          return (a.authors?.[0]?.name ?? '').localeCompare(b.authors?.[0]?.name ?? '');
        default:
          return 0;
      }
    });
  }, [ownBooks, sharedBooks, sortBy]);

  const seriesGroups = useMemo(() => {
    const map = new Map<string, SeriesGroup>();
    const ungrouped: AnnotatedBook[] = [];
    for (const book of allBooks) {
      if (book.series?.id) {
        let group = map.get(book.series.id);
        if (!group) {
          group = {
            seriesId: book.series.id,
            seriesName: book.series.name,
            coverUrl: null,
            books: [],
          };
          map.set(book.series.id, group);
        }
        group.books.push(book);
        if (!group.coverUrl) group.coverUrl = book.edition.coverUrl ?? null;
      } else {
        ungrouped.push(book);
      }
    }
    return { groups: Array.from(map.values()), ungrouped };
  }, [allBooks]);

  const ownTotal = data?.pages[0]?.pagination.total ?? 0;
  const totalCount = ownTotal + sharedBooks.length;
  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== '' && v !== 'all');
  const isEmpty = !isLoading && !error && allBooks.length === 0;

  const bookKey = (book: AnnotatedBook) => `${book._sharedFrom ?? 'own'}-${book.userBook.id}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library"
        description={
          isLoading
            ? 'Loading your collection…'
            : `${totalCount.toLocaleString()} ${totalCount === 1 ? 'book' : 'books'}${
                hasActiveFilters ? ' match your filters' : ' in your collection'
              }`
        }
        actions={
          <>
            <Button
              variant={showShared ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowShared((prev) => !prev)}
              aria-pressed={showShared}
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              Shared
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add Book
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setShowAddBookDialog(true)}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add a single book
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowImportDialog(true)}>
                  <FileUp className="h-4 w-4" aria-hidden="true" />
                  Import from CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <AddBookDialog open={showAddBookDialog} onOpenChange={setShowAddBookDialog} />
      <CSVImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <AdvancedSearch onSearch={setFilters} initialFilters={filters} />
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[165px] shrink-0" aria-label="Sort books">
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
            variant={groupBySeries ? 'secondary' : 'outline'}
            className="shrink-0"
            onClick={toggleGroupBySeries}
            aria-pressed={groupBySeries}
            title="Group by series"
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Group by series</span>
          </Button>
        </div>
      </div>

      {isLoading && <BookGridSkeleton />}

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <span>Couldn&apos;t load your books.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {isEmpty && hasActiveFilters && (
        <EmptyState
          icon={SearchX}
          title="No books match"
          description="Try a different search or clear some filters."
          action={
            <Button variant="outline" onClick={() => setFilters({})}>
              Clear filters
            </Button>
          }
        />
      )}

      {isEmpty && !hasActiveFilters && (
        <EmptyState
          icon={Library}
          title="Your collection is waiting"
          description="Add your first book by ISBN, barcode scan, or title search — or import a CSV from another app."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setShowAddBookDialog(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add a book
              </Button>
              <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                <FileUp className="h-4 w-4" aria-hidden="true" />
                Import CSV
              </Button>
            </div>
          }
        />
      )}

      {allBooks.length > 0 && !groupBySeries && (
        <div className={BOOK_GRID_CLASS}>
          {allBooks.map((book) => (
            <div key={bookKey(book)} className="relative">
              <SharedFromBadge name={book._sharedFrom} />
              <BookCard book={book} onClick={() => router.push(`/library/${book.book.id}`)} />
            </div>
          ))}
        </div>
      )}

      {allBooks.length > 0 && groupBySeries && (
        <div className={BOOK_GRID_CLASS}>
          {seriesGroups.groups.map((group) => (
            <SeriesGroupCard
              key={group.seriesId}
              group={group}
              onBookClick={(bookId) => router.push(`/library/${bookId}`)}
              onSeriesClick={(seriesId) => router.push(`/series/${seriesId}`)}
            />
          ))}
          {seriesGroups.ungrouped.map((book) => (
            <div key={bookKey(book)} className="relative">
              <SharedFromBadge name={book._sharedFrom} />
              <BookCard book={book} onClick={() => router.push(`/library/${book.book.id}`)} />
            </div>
          ))}
        </div>
      )}

      {/* Pagination sentinel + manual fallback */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex flex-col items-center gap-2 py-4">
          <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading…
              </>
            ) : (
              `Load more (${(ownTotal - ownBooks.length).toLocaleString()} remaining)`
            )}
          </Button>
        </div>
      )}
      {!hasNextPage && ownBooks.length > PAGE_SIZE && (
        <p className="py-2 text-center text-xs text-muted-foreground">
          Showing all {ownBooks.length.toLocaleString()} books
        </p>
      )}
    </div>
  );
}
