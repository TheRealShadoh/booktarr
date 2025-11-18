'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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

export default function SettingsPage() {
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkEnrichmentStatus = async () => {
    try {
      const response = await fetch('/api/books/enrich');
      if (response.ok) {
        const data = await response.json();
        setEnrichmentStatus({ count: data.count });
      }
    } catch (error) {
      console.error('Error checking enrichment status:', error);
    }
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
      console.error('Error enriching books:', error);
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
      console.error('Error clearing books:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear books. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Check enrichment status on mount
  useEffect(() => {
    checkEnrichmentStatus();
  }, []);

  return (
    <div className="space-y-6">
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
            <p className="text-sm text-muted-foreground">
              Account management features will be available here.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata Sources</CardTitle>
            <CardDescription>Configure where book metadata is fetched from</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Metadata source configuration coming soon.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import & Export</CardTitle>
            <CardDescription>Manage your library data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Data import and export features will be available here.
            </p>
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
