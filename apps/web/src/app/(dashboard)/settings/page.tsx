'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ShareManager } from '@/components/sharing/share-manager';
import { AddBookDialog } from '@/components/books/add-book-dialog';
import { ExternalLink } from 'lucide-react';

interface DuplicateBook {
  userBookId: string;
  bookId: string;
  title: string;
  isbn: string | null;
  coverUrl: string | null;
  createdAt: string;
}

interface DuplicateGroup {
  normalizedTitle: string;
  volume: string;
  books: DuplicateBook[];
  /** userBookId selected to keep; all others will be deleted */
  keepId?: string;
}

interface DuplicatesResult {
  duplicateGroups: DuplicateGroup[];
  totalDuplicates: number;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [changeName, setChangeName] = useState('');
  const [showAddBook, setShowAddBook] = useState(false);
  const [bookCount, setBookCount] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentStatus, setEnrichmentStatus] = useState<{
    count: number;
    lastRun?: {
      processed: number;
      enriched: number;
      failed: number;
    };
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [duplicatesResult, setDuplicatesResult] = useState<DuplicatesResult | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkEnrichmentStatus = async () => {
    try {
      const response = await fetch('/api/books/enrich');
      if (response.ok) {
        const data = await response.json();
        setEnrichmentStatus({ count: data.count });
      } else {
        // If the status check fails (e.g. rate limit, transient error), assume
        // there may be books needing enrichment so the button stays enabled.
        setEnrichmentStatus({ count: 1 });
      }
    } catch (error) {
      logger.error('Error checking enrichment status:', error instanceof Error ? error : new Error(String(error)));
      // Enable button by default when the status check cannot be completed.
      setEnrichmentStatus({ count: 1 });
    }
  };

  const fetchBookCount = async () => {
    try {
      const response = await fetch('/api/books?limit=1');
      if (response.ok) {
        const data = await response.json();
        setBookCount(data.total ?? data.books?.length ?? 0);
      }
    } catch (error) {
      logger.error('Error fetching book count:', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const fetchAllBooks = async () => {
    const response = await fetch('/api/books?limit=10000');
    if (!response.ok) throw new Error('Failed to fetch books');
    const data = await response.json();
    return (data.books ?? data) as Record<string, unknown>[];
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const books = await fetchAllBooks();
      const headers = ['Title', 'Author', 'ISBN', 'Publisher', 'Format', 'Pages', 'Series', 'Status'];
      const rows = books.map((book) => [
        book.title ?? '',
        book.author ?? '',
        book.isbn ?? '',
        book.publisher ?? '',
        book.format ?? '',
        book.pageCount ?? '',
        book.seriesName ?? '',
        book.status ?? '',
      ]);
      const csvContent = [headers, ...rows]
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'booktarr-library.csv';
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Success', description: `Exported ${books.length} books as CSV` });
    } catch (error) {
      logger.error('Error exporting CSV:', error instanceof Error ? error : new Error(String(error)));
      toast({ title: 'Error', description: 'Failed to export library', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const books = await fetchAllBooks();
      const jsonContent = JSON.stringify(books, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'booktarr-library.json';
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Success', description: `Exported ${books.length} books as JSON` });
    } catch (error) {
      logger.error('Error exporting JSON:', error instanceof Error ? error : new Error(String(error)));
      toast({ title: 'Error', description: 'Failed to export library', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleChangeName = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: 'Coming soon', description: 'Profile updates coming soon' });
  };

  const handleEnrichBooks = async () => {
    setIsEnriching(true);

    try {
      const response = await fetch('/api/books/enrich?batchSize=10', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to enrich books');
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: `Enriched ${result.enriched} out of ${result.processed} books`,
      });

      // Update status
      setEnrichmentStatus({
        count: Math.max(0, (enrichmentStatus?.count || 0) - result.enriched),
        lastRun: {
          processed: result.processed,
          enriched: result.enriched,
          failed: result.failed,
        },
      });

      // Invalidate book queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['books'] });
    } catch (error) {
      logger.error('Error enriching books:', error instanceof Error ? error : new Error(String(error)));
      toast({
        title: 'Error',
        description: 'Failed to enrich books. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const handleClearBooks = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast({
        title: 'Error',
        description: 'Please type DELETE to confirm',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/books/clear', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE_ALL' }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear books');
      }

      toast({
        title: 'Success',
        description: 'All books have been removed from your library',
      });

      // Invalidate all book-related queries
      queryClient.invalidateQueries({ queryKey: ['books'] });

      // Reset and close dialog
      setDeleteConfirmText('');
      setShowDeleteDialog(false);
    } catch (error) {
      logger.error('Error clearing books:', error instanceof Error ? error : new Error(String(error)));
      toast({
        title: 'Error',
        description: 'Failed to clear books. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleScanDuplicates = async () => {
    setIsScanning(true);
    setDuplicatesResult(null);
    setDuplicateGroups([]);
    try {
      const response = await fetch('/api/books/duplicates');
      if (!response.ok) throw new Error('Failed to scan for duplicates');
      const data: DuplicatesResult = await response.json();
      setDuplicatesResult(data);
      // Initialise each group with the newest book pre-selected to keep
      setDuplicateGroups(
        data.duplicateGroups.map((group) => {
          const sorted = [...group.books].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          return { ...group, keepId: sorted[0]?.userBookId };
        })
      );
    } catch (error) {
      logger.error('Error scanning duplicates:', error instanceof Error ? error : new Error(String(error)));
      toast({ title: 'Error', description: 'Failed to scan for duplicates', variant: 'destructive' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleKeepNewest = (groupIndex: number) => {
    setDuplicateGroups((prev) =>
      prev.map((group, i) => {
        if (i !== groupIndex) return group;
        const sorted = [...group.books].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return { ...group, keepId: sorted[0]?.userBookId };
      })
    );
  };

  const getIdsToDelete = (groups: DuplicateGroup[]): string[] =>
    groups.flatMap((group) =>
      group.books
        .filter((b) => b.userBookId !== group.keepId)
        .map((b) => b.userBookId)
    );

  const handleRemoveAllDuplicates = async () => {
    const idsToDelete = getIdsToDelete(duplicateGroups);
    if (idsToDelete.length === 0) {
      toast({ title: 'Nothing to remove', description: 'No duplicates are marked for deletion.' });
      return;
    }
    setIsCleaningDuplicates(true);
    try {
      const response = await fetch('/api/books/duplicates/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userBookIds: idsToDelete }),
      });
      if (!response.ok) throw new Error('Failed to remove duplicates');
      const result = await response.json() as { deleted: number };
      toast({ title: 'Success', description: `Removed ${result.deleted} duplicate ${result.deleted === 1 ? 'entry' : 'entries'}` });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setDuplicatesResult(null);
      setDuplicateGroups([]);
    } catch (error) {
      logger.error('Error removing duplicates:', error instanceof Error ? error : new Error(String(error)));
      toast({ title: 'Error', description: 'Failed to remove duplicates', variant: 'destructive' });
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  // Check enrichment status and book count on mount
  useEffect(() => {
    checkEnrichmentStatus();
    fetchBookCount();
  }, []);

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your BookTarr preferences and account settings
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Name</Label>
              <p className="text-sm font-medium">{session?.user?.name ?? 'Not set'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
              <p className="text-sm font-medium">{session?.user?.email ?? 'Not set'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Role</Label>
              <div>
                <Badge variant="secondary">{(session?.user as { role?: string } | undefined)?.role ?? 'user'}</Badge>
              </div>
            </div>
            <form onSubmit={handleChangeName} className="space-y-2 pt-2">
              <Label htmlFor="change-name">Change Display Name</Label>
              <div className="flex gap-2">
                <Input
                  id="change-name"
                  placeholder="New display name"
                  value={changeName}
                  onChange={(e) => setChangeName(e.target.value)}
                  className="max-w-sm"
                />
                <Button type="submit" variant="outline" disabled={!changeName.trim()}>
                  Save
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata Sources</CardTitle>
            <CardDescription>Where book and series metadata is fetched from</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">Google Books</p>
                  <p className="text-xs text-muted-foreground">Primary source for book metadata, covers, and descriptions</p>
                </div>
                <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">Active</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">OpenLibrary</p>
                  <p className="text-xs text-muted-foreground">Fallback source for ISBN lookups and cover images</p>
                </div>
                <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">Active</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">AniList</p>
                  <p className="text-xs text-muted-foreground">Manga and light novel series metadata, volume counts</p>
                </div>
                <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected Services</CardTitle>
            <CardDescription>Connect your Amazon reading libraries to track eBooks and audiobooks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Kindle &amp; Audible</p>
              <p className="text-sm text-muted-foreground">
                Add books from your Kindle or Audible library using any of the methods below.
              </p>
            </div>

            <div className="space-y-3">
              {/* Method 1 */}
              <div className="rounded-lg border p-3 space-y-2">
                <div>
                  <p className="text-sm font-medium">1. Manual ASIN Entry</p>
                  <p className="text-xs text-muted-foreground">Add books one at a time using their Amazon ASIN identifier.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddBook(true)}
                >
                  Open Add Book Dialog
                </Button>
              </div>

              {/* Method 2 */}
              <div className="rounded-lg border p-3 space-y-2">
                <div>
                  <p className="text-sm font-medium">2. Kindle CSV Export</p>
                  <p className="text-xs text-muted-foreground">Export your entire Kindle library at once using a Chrome extension.</p>
                </div>
                <a
                  href="https://chromewebstore.google.com/detail/cnmmnejiklbbkapmjegmldhaejjiejbo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2 hover:no-underline"
                >
                  Kindle Book List Downloader
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Method 3 */}
              <div className="rounded-lg border p-3 space-y-2">
                <div>
                  <p className="text-sm font-medium">3. Audible CSV Export</p>
                  <p className="text-xs text-muted-foreground">Export your Audible library using a Chrome extension.</p>
                </div>
                <a
                  href="https://github.com/joonaspaakko/audible-library-extractor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2 hover:no-underline"
                >
                  Audible Library Extractor
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Method 4 */}
              <div className="rounded-lg border p-3 space-y-2">
                <div>
                  <p className="text-sm font-medium">4. Amazon Order History</p>
                  <p className="text-xs text-muted-foreground">Download your full Amazon purchase history from the Amazon Privacy Central page.</p>
                </div>
                <a
                  href="https://www.amazon.com/gp/privacycentral"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2 hover:no-underline"
                >
                  Amazon Privacy Central
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import &amp; Export</CardTitle>
            <CardDescription>Manage your library data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Export Library</Label>
              {bookCount !== null && (
                <p className="text-sm text-muted-foreground">
                  Your library contains <span className="font-medium text-foreground">{bookCount}</span> {bookCount === 1 ? 'book' : 'books'}.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : 'Export as CSV'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportJSON}
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : 'Export as JSON'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata Enrichment</CardTitle>
            <CardDescription>Automatically fetch missing book metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Enrich Books</Label>
              <p className="text-sm text-muted-foreground">
                Fetch missing metadata (descriptions, covers, page counts) from Google Books API.
                Rate limited to prevent API throttling.
              </p>
              {enrichmentStatus && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {enrichmentStatus.count} books need enrichment
                  </p>
                  {enrichmentStatus.lastRun && (
                    <p className="text-sm text-muted-foreground">
                      Last run: {enrichmentStatus.lastRun.enriched} enriched, {enrichmentStatus.lastRun.failed} failed
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={handleEnrichBooks}
                  disabled={isEnriching || !enrichmentStatus?.count}
                >
                  {isEnriching ? 'Enriching...' : 'Enrich Next 10 Books'}
                </Button>
                <Button
                  variant="outline"
                  onClick={checkEnrichmentStatus}
                >
                  Refresh Status
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Duplicate Detection</CardTitle>
            <CardDescription>Find and remove duplicate books in your library</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Scan Library</Label>
              <p className="text-sm text-muted-foreground">
                Detects duplicate entries by matching normalized titles and volume numbers.
              </p>
              <Button
                variant="outline"
                onClick={handleScanDuplicates}
                disabled={isScanning}
              >
                {isScanning ? 'Scanning...' : 'Scan for Duplicates'}
              </Button>
            </div>

            {duplicatesResult && (
              <div className="space-y-4">
                <p className="text-sm font-medium">
                  {duplicatesResult.duplicateGroups.length === 0
                    ? 'No duplicates found.'
                    : `Found ${duplicatesResult.duplicateGroups.length} duplicate ${duplicatesResult.duplicateGroups.length === 1 ? 'group' : 'groups'} (${duplicatesResult.totalDuplicates} extra ${duplicatesResult.totalDuplicates === 1 ? 'copy' : 'copies'})`}
                </p>

                {duplicateGroups.map((group, groupIndex) => (
                  <div key={`${group.normalizedTitle}-${group.volume}`} className="rounded-lg border p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {group.books[0]?.title ?? group.normalizedTitle}
                        {group.volume !== 'none' && (
                          <span className="ml-1 text-muted-foreground">Vol. {group.volume}</span>
                        )}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleKeepNewest(groupIndex)}
                      >
                        Keep Newest
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {group.books.map((book) => {
                        const isKept = book.userBookId === group.keepId;
                        return (
                          <div
                            key={book.userBookId}
                            className={`flex items-center gap-3 rounded p-2 text-sm ${isKept ? 'bg-muted/50' : 'opacity-60'}`}
                          >
                            {book.coverUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={book.coverUrl}
                                alt={book.title}
                                className="h-10 w-7 rounded object-cover flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{book.title}</p>
                              {book.isbn && (
                                <p className="text-xs text-muted-foreground">ISBN: {book.isbn}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Added: {new Date(book.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={isKept ? 'default' : 'secondary'}>
                              {isKept ? 'Keep' : 'Remove'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {duplicatesResult.duplicateGroups.length > 0 && (
                  <Button
                    variant="destructive"
                    onClick={handleRemoveAllDuplicates}
                    disabled={isCleaningDuplicates}
                  >
                    {isCleaningDuplicates
                      ? 'Removing...'
                      : (() => {
                          const count = getIdsToDelete(duplicateGroups).length;
                          return `Remove All Duplicates (${count} extra ${count === 1 ? 'copy' : 'copies'})`;
                        })()}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Library Sharing</CardTitle>
            <CardDescription>Share your library with other BookTarr users</CardDescription>
          </CardHeader>
          <CardContent>
            <ShareManager />
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Manage your library data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Clear All Books</Label>
              <p className="text-sm text-muted-foreground">
                Remove all books from your library. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                Clear All Books
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddBookDialog
        open={showAddBook}
        onOpenChange={setShowAddBook}
        defaultStatus="owned"
      />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete all books from your library. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <span className="font-bold">DELETE</span> to confirm
              </Label>
              <Input
                id="confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmText('');
                setShowDeleteDialog(false);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearBooks}
              disabled={deleteConfirmText !== 'DELETE' || isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete All Books'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
