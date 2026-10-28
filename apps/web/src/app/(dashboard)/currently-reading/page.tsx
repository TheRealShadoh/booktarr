'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookCard } from '@/components/books/book-card';
import { BookGridSkeleton, BOOK_GRID_CLASS } from '@/components/books/book-grid-skeleton';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { BookOpen, TrendingUp, Library, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { BookWithRelations, ReadingStats } from '@/types/api';

export default function CurrentlyReadingPage() {
  const router = useRouter();
  const { data: booksData, isLoading: booksLoading } = useQuery({
    queryKey: ['currently-reading'],
    queryFn: async () => {
      const response = await fetch('/api/reading/currently-reading');
      if (!response.ok) throw new Error('Failed to fetch currently reading books');
      return response.json() as Promise<BookWithRelations[]>;
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['reading-stats'],
    queryFn: async () => {
      const response = await fetch('/api/reading/stats');
      if (!response.ok) throw new Error('Failed to fetch reading stats');
      return response.json() as Promise<ReadingStats>;
    },
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpen}
        title="Reading"
        description="Track your reading progress and keep up with your goals"
      />

      {/* Reading Stats Cards */}
      {statsLoading && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Currently Reading</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.currentlyReading}</div>
              <p className="text-xs text-muted-foreground">Active books</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Finished This Year</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.booksFinishedThisYear}</div>
              <p className="text-xs text-muted-foreground">
                {stats.booksFinishedThisMonth} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Books Read</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBooksRead}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Out of 5 stars</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Currently Reading Books */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Active Reads</h2>

        {booksLoading && <BookGridSkeleton count={6} />}

        {!booksLoading && (!booksData || booksData.length === 0) && (
          <EmptyState
            icon={BookOpen}
            title="No books in progress"
            description="Open any book in your library and use “Update Reading Progress” to start tracking it here."
            action={
              <Button variant="outline" asChild>
                <Link href="/library">
                  <Library className="h-4 w-4" aria-hidden="true" />
                  Browse Library
                </Link>
              </Button>
            }
          />
        )}

        {!booksLoading && booksData && booksData.length > 0 && (
          <div className={BOOK_GRID_CLASS}>
            {booksData.map((book: BookWithRelations) => (
              <BookCard
                key={book.readingProgress?.id ?? book.userBook.id}
                book={book}
                onClick={() => router.push(`/library/${book.book.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
