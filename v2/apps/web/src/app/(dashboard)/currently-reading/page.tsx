'use client';

import { useQuery } from '@tanstack/react-query';
import { BookCard } from '@/components/books/book-card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CurrentlyReadingPage() {
  const { data: booksData, isLoading: booksLoading } = useQuery({
    queryKey: ['currently-reading'],
    queryFn: async () => {
      const response = await fetch('/api/reading/currently-reading');
      if (!response.ok) throw new Error('Failed to fetch currently reading books');
      return response.json();
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['reading-stats'],
    queryFn: async () => {
      const response = await fetch('/api/reading/stats');
      if (!response.ok) throw new Error('Failed to fetch reading stats');
      return response.json();
    },
  });

  const isLoading = booksLoading || statsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          Currently Reading
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your reading progress and keep up with your goals
        </p>
      </div>

      {/* Reading Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
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

        {isLoading && (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[2/3] w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && booksData && booksData.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No books in progress</CardTitle>
              <CardDescription>
                Start reading a book from your library to track your progress here!
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!isLoading && booksData && booksData.length > 0 && (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {booksData.map((book: any) => (
              <BookCard
                key={book.readingProgress.id}
                book={book}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
