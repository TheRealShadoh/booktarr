import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, BookOpen, Globe, Tag, Hash } from 'lucide-react';

interface BookMetadataCardProps {
  book: {
    publisher?: string | null;
    publishedDate?: string | null;
    pageCount?: number | null;
    language?: string | null;
    categories?: string[] | null;
    googleBooksId?: string | null;
    openLibraryId?: string | null;
  };
  edition?: {
    isbn10?: string | null;
    isbn13?: string | null;
  } | null;
}

export function BookMetadataCard({ book, edition }: BookMetadataCardProps) {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Publisher */}
          {book.publisher && (
            <div>
              <p className="text-sm text-muted-foreground">Publisher</p>
              <p className="font-medium">{book.publisher}</p>
            </div>
          )}

          {/* Published Date */}
          {book.publishedDate && (
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Published
              </p>
              <p className="font-medium">{formatDate(book.publishedDate)}</p>
            </div>
          )}

          {/* Page Count */}
          {book.pageCount && (
            <div>
              <p className="text-sm text-muted-foreground">Pages</p>
              <p className="font-medium">{book.pageCount.toLocaleString()}</p>
            </div>
          )}

          {/* Language */}
          {book.language && (
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Language
              </p>
              <p className="font-medium">{book.language.toUpperCase()}</p>
            </div>
          )}
        </div>

        {/* ISBN */}
        {(edition?.isbn13 || edition?.isbn10) && (
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
              <Hash className="h-3 w-3" />
              ISBN
            </p>
            <div className="flex flex-wrap gap-2">
              {edition.isbn13 && (
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  ISBN-13: {edition.isbn13}
                </code>
              )}
              {edition.isbn10 && (
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  ISBN-10: {edition.isbn10}
                </code>
              )}
            </div>
          </div>
        )}

        {/* Categories */}
        {book.categories && book.categories.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
              <Tag className="h-3 w-3" />
              Categories
            </p>
            <div className="flex flex-wrap gap-2">
              {book.categories.map((category) => (
                <Badge key={category} variant="secondary">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* External IDs */}
        {(book.googleBooksId || book.openLibraryId) && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">External IDs</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {book.googleBooksId && (
                <span className="text-muted-foreground">
                  Google Books: <code className="text-foreground">{book.googleBooksId}</code>
                </span>
              )}
              {book.openLibraryId && (
                <span className="text-muted-foreground">
                  OpenLibrary: <code className="text-foreground">{book.openLibraryId}</code>
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
