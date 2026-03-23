'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface BookRecommendationsProps {
  bookId: string;
  categories?: string[] | null;
  seriesId?: string | null;
  authorName?: string;
}

interface RecommendedBook {
  book: { id: string; title: string };
  edition: { coverUrl?: string | null; coverThumbnailUrl?: string | null };
  authors?: Array<{ name: string }>;
  series?: { id: string; name: string; volumeNumber: number } | null;
}

export function BookRecommendations({ bookId, categories, seriesId, authorName }: BookRecommendationsProps) {
  // Fetch books from same series (excluding current book)
  const { data: seriesBooks } = useQuery({
    queryKey: ['recommendations-series', seriesId],
    queryFn: async () => {
      if (!seriesId) return [];
      const r = await fetch(`/api/books?limit=10`);
      if (!r.ok) return [];
      const data = await r.json();
      return (data.books || []).filter(
        (b: RecommendedBook) => b.series?.id === seriesId && b.book.id !== bookId
      );
    },
    enabled: !!seriesId,
  });

  // Fetch books by same author
  const { data: authorBooks } = useQuery({
    queryKey: ['recommendations-author', authorName],
    queryFn: async () => {
      if (!authorName) return [];
      const r = await fetch(`/api/books?author=${encodeURIComponent(authorName)}&limit=10`);
      if (!r.ok) return [];
      const data = await r.json();
      return (data.books || []).filter(
        (b: RecommendedBook) => b.book.id !== bookId
      );
    },
    enabled: !!authorName,
  });

  // Search for similar books externally by category
  const { data: externalRecs, isLoading: externalLoading } = useQuery({
    queryKey: ['recommendations-external', categories?.join(',')],
    queryFn: async () => {
      if (!categories?.length) return [];
      const genre = categories[0];
      const r = await fetch('/api/books/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: genre }),
      });
      if (!r.ok) return [];
      const data = await r.json();
      return (data.results || []).slice(0, 5);
    },
    enabled: !!categories?.length,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const hasSeriesBooks = seriesBooks && seriesBooks.length > 0;
  const hasAuthorBooks = authorBooks && authorBooks.length > 0;
  const hasExternalRecs = externalRecs && externalRecs.length > 0;

  if (!hasSeriesBooks && !hasAuthorBooks && !hasExternalRecs && !externalLoading) {
    return null; // No recommendations to show
  }

  return (
    <div className="space-y-6">
      {/* Other books in same series */}
      {hasSeriesBooks && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">More in this series</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {seriesBooks.map((book: RecommendedBook) => (
                <Link
                  key={book.book.id}
                  href={`/library/${book.book.id}`}
                  className="flex-shrink-0 w-24 group"
                >
                  <div className="relative aspect-[2/3] bg-muted rounded overflow-hidden mb-1">
                    <Image
                      src={book.edition.coverUrl || book.edition.coverThumbnailUrl || '/placeholder-book.svg'}
                      alt={book.book.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="96px"
                    />
                  </div>
                  <p className="text-xs truncate">{book.book.title}</p>
                  {book.series && (
                    <p className="text-xs text-muted-foreground">#{book.series.volumeNumber}</p>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other books by same author */}
      {hasAuthorBooks && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">More by {authorName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {authorBooks.map((book: RecommendedBook) => (
                <Link
                  key={book.book.id}
                  href={`/library/${book.book.id}`}
                  className="flex-shrink-0 w-24 group"
                >
                  <div className="relative aspect-[2/3] bg-muted rounded overflow-hidden mb-1">
                    <Image
                      src={book.edition.coverUrl || book.edition.coverThumbnailUrl || '/placeholder-book.svg'}
                      alt={book.book.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="96px"
                    />
                  </div>
                  <p className="text-xs truncate">{book.book.title}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* External recommendations by genre */}
      {(hasExternalRecs || externalLoading) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Discover similar books
            </CardTitle>
          </CardHeader>
          <CardContent>
            {externalLoading ? (
              <div className="flex gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="w-24 aspect-[2/3]" />
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {externalRecs?.map((book: { title: string; authors?: string[]; thumbnailUrl?: string; isbn13?: string }, i: number) => (
                  <div key={`ext-${i}`} className="flex-shrink-0 w-24">
                    <div className="relative aspect-[2/3] bg-muted rounded overflow-hidden mb-1">
                      {book.thumbnailUrl ? (
                        <Image
                          src={book.thumbnailUrl}
                          alt={book.title}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <BookOpen className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs truncate">{book.title}</p>
                    {book.authors?.[0] && (
                      <p className="text-xs text-muted-foreground truncate">{book.authors[0]}</p>
                    )}
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      <ExternalLink className="h-2 w-2 mr-1" />
                      Not in library
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
