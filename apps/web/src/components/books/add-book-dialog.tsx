'use client';

import { useState, lazy, Suspense } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Search, Camera, ArrowLeft, Plus, BookOpen, Headphones } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BarcodeScanner = lazy(() =>
  import('./barcode-scanner').then((mod) => ({ default: mod.BarcodeScanner }))
);

interface AddBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: 'owned' | 'wanted' | 'missing';
}

interface SearchResult {
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  isbn10?: string;
  isbn13?: string;
  pageCount?: number;
  coverUrl?: string;
  thumbnailUrl?: string;
  description?: string;
}

export function AddBookDialog({ open, onOpenChange, defaultStatus = 'owned' }: AddBookDialogProps) {
  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState<'owned' | 'wanted' | 'missing'>(defaultStatus);
  const [format, setFormat] = useState('');
  const [asin, setAsin] = useState('');
  const [asinFormat, setAsinFormat] = useState<'ebook' | 'audiobook'>('ebook');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Search for books (returns results for preview)
  const searchMutation = useMutation({
    mutationFn: async (data: { isbn?: string; title?: string; author?: string }) => {
      const response = await fetch('/api/books/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Search failed');
      }

      return response.json() as Promise<{ results: SearchResult[] }>;
    },
    onSuccess: (data) => {
      if (data.results.length === 0) {
        toast({
          title: 'No results',
          description: 'No books found. Try a different search term.',
          variant: 'destructive',
        });
      } else if (data.results.length === 1) {
        // Single result - add directly
        addFromResult(data.results[0]);
      } else {
        // Multiple results - show picker
        setSearchResults(data.results);
        setShowResults(true);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Search Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add book to library
  const addBookMutation = useMutation({
    mutationFn: async (data: {
      isbn?: string;
      title?: string;
      author?: string;
      status: string;
      edition?: { format?: string; asin?: string };
    }) => {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || error.error || 'Failed to add book');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['series'] });
      toast({
        title: 'Book added!',
        description: `${data.book.title} has been added to your library.`,
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setIsbn('');
    setTitle('');
    setAuthor('');
    setStatus('owned');
    setFormat('');
    setAsin('');
    setAsinFormat('ebook');
    setSearchResults([]);
    setShowResults(false);
    onOpenChange(false);
  };

  const addFromResult = (result: SearchResult) => {
    const bookIsbn = result.isbn13 || result.isbn10;
    addBookMutation.mutate({
      isbn: bookIsbn,
      title: bookIsbn ? undefined : result.title,
      author: bookIsbn ? undefined : result.authors?.[0],
      status,
      edition: format ? { format } : undefined,
    });
  };

  const handleSearchByIsbn = () => {
    if (!isbn.trim()) {
      toast({ title: 'Error', description: 'Please enter an ISBN', variant: 'destructive' });
      return;
    }
    searchMutation.mutate({ isbn: isbn.trim() });
  };

  const handleSearchByTitle = () => {
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Please enter a title', variant: 'destructive' });
      return;
    }
    searchMutation.mutate({ title: title.trim(), author: author.trim() || undefined });
  };

  const handleBarcodeScan = (scannedIsbn: string) => {
    setIsbn(scannedIsbn);
    toast({ title: 'Barcode scanned!', description: `ISBN: ${scannedIsbn}` });
    searchMutation.mutate({ isbn: scannedIsbn });
  };

  const handleScanError = (error: string) => {
    toast({ title: 'Scanner Error', description: error, variant: 'destructive' });
  };

  const handleSearchByAsin = () => {
    if (!asin.trim()) {
      toast({ title: 'Error', description: 'Please enter an ASIN', variant: 'destructive' });
      return;
    }
    // Try searching via the existing search endpoint using ASIN as an identifier
    searchMutation.mutate({ isbn: asin.trim() });
  };

  // Called when the search-by-ASIN attempt returns no results: fall back to
  // creating the book directly with the ASIN stored on the edition.
  const handleAddByAsin = () => {
    if (!asin.trim()) return;
    addBookMutation.mutate({
      isbn: asin.trim(),
      status: 'owned',
      edition: { format: asinFormat, asin: asin.trim() },
    });
  };

  const isPending = searchMutation.isPending || addBookMutation.isPending;

  // Search results picker view
  if (showResults && searchResults.length > 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowResults(false)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              Select a Book
            </DialogTitle>
            <DialogDescription>
              {searchResults.length} results found. Select the correct book to add.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {searchResults.map((result, index) => (
              <Card
                key={`${result.isbn13 || result.isbn10 || result.title}-${index}`}
                className="cursor-pointer transition-colors hover:bg-accent"
                onClick={() => addFromResult(result)}
              >
                <CardContent className="flex gap-4 p-4">
                  <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded bg-muted">
                    {result.coverUrl || result.thumbnailUrl ? (
                      <Image
                        src={result.thumbnailUrl || result.coverUrl || ''}
                        alt={result.title}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold leading-tight truncate">{result.title}</h3>
                    {result.subtitle && (
                      <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                    )}
                    {result.authors?.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.authors.join(', ')}
                      </p>
                    )}
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      {result.publisher && <span>{result.publisher}</span>}
                      {result.publishedDate && <span>{result.publishedDate}</span>}
                      {result.pageCount && <span>{result.pageCount} pages</span>}
                    </div>
                    {(result.isbn13 || result.isbn10) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ISBN: {result.isbn13 || result.isbn10}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 self-center">
                    <Button size="sm" variant="outline" disabled={addBookMutation.isPending}>
                      {addBookMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Render format & status selectors for a given tab
  const renderFormatStatusFields = (idPrefix: string) => (
    <>
      <div className="space-y-2">
        <Label htmlFor={`format-${idPrefix}`}>Format (Optional)</Label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger id={`format-${idPrefix}`}>
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hardcover">Hardcover</SelectItem>
            <SelectItem value="paperback">Paperback</SelectItem>
            <SelectItem value="ebook">E-book</SelectItem>
            <SelectItem value="audiobook">Audiobook</SelectItem>
            <SelectItem value="manga">Manga</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`status-${idPrefix}`}>Ownership Status</Label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as 'owned' | 'wanted' | 'missing')}
        >
          <SelectTrigger id={`status-${idPrefix}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owned">Owned</SelectItem>
            <SelectItem value="wanted">Wanted</SelectItem>
            <SelectItem value="missing">Missing</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a Book</DialogTitle>
          <DialogDescription>
            Search by ISBN, scan a barcode, or search by title to add a book to your library.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="isbn" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="isbn">ISBN Search</TabsTrigger>
            <TabsTrigger value="scan">
              <Camera className="mr-1 h-3 w-3" />
              Scan Barcode
            </TabsTrigger>
            <TabsTrigger value="title">Title Search</TabsTrigger>
            <TabsTrigger value="asin">
              <Headphones className="mr-1 h-3 w-3" />
              Kindle/Audible
            </TabsTrigger>
          </TabsList>

          <TabsContent value="isbn" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="isbn">ISBN</Label>
              <Input
                id="isbn"
                placeholder="Enter ISBN-10 or ISBN-13"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchByIsbn()}
                autoFocus
              />
            </div>

            {renderFormatStatusFields("isbn")}

            <Button onClick={handleSearchByIsbn} className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search and Add
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="scan" className="space-y-4">
            <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
              <BarcodeScanner onScan={handleBarcodeScan} onError={handleScanError} />
            </Suspense>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or enter manually</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="isbn-manual">ISBN (Manual Entry)</Label>
              <Input
                id="isbn-manual"
                placeholder="Enter ISBN-10 or ISBN-13"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchByIsbn()}
              />
            </div>

            {renderFormatStatusFields("scan")}

            <Button
              onClick={handleSearchByIsbn}
              className="w-full"
              disabled={isPending || !isbn.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search and Add
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="title" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter book title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSearchByTitle()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author (Optional)</Label>
              <Input
                id="author"
                placeholder="Enter author name"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchByTitle()}
              />
            </div>

            {renderFormatStatusFields("title")}

            <Button onClick={handleSearchByTitle} className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="asin" className="space-y-4">
            <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground space-y-1">
              <p>Enter an ASIN from your Kindle or Audible library.</p>
              <p>Find your ASIN on the book&apos;s Amazon product page — it appears in the URL after <code className="font-mono text-xs">/dp/</code>.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asin">ASIN</Label>
              <Input
                id="asin"
                placeholder="Enter ASIN e.g. B08N5WRWNW"
                value={asin}
                onChange={(e) => setAsin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchByAsin()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asin-format">Format</Label>
              <Select
                value={asinFormat}
                onValueChange={(v) => setAsinFormat(v as 'ebook' | 'audiobook')}
              >
                <SelectTrigger id="asin-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ebook">Kindle eBook</SelectItem>
                  <SelectItem value="audiobook">Audible Audiobook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSearchByAsin} className="flex-1" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search and Add
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleAddByAsin}
                disabled={isPending || !asin.trim()}
                title="Add directly without metadata lookup"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Directly
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
