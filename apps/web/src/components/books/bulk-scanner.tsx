'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BarcodeScanner, playScanFeedback } from './barcode-scanner';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, X, Check, Loader2, Trash2 } from 'lucide-react';

interface ScannedItem {
  isbn: string;
  scannedAt: Date;
  status: 'queued' | 'adding' | 'success' | 'error';
  title?: string;
  error?: string;
}

const STORAGE_KEY = 'booktarr-scan-queue';

function loadQueue(): ScannedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored).map((item: ScannedItem) => ({
      ...item,
      scannedAt: new Date(item.scannedAt),
    }));
  } catch {
    return [];
  }
}

function saveQueue(queue: ScannedItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function BulkScanner() {
  const [scanQueue, setScanQueue] = useState<ScannedItem[]>(() => loadQueue());
  const [scanning, setScanning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // A Set that always reflects the current ISBNs in the queue, used inside
  // the scan callback to avoid stale-closure false negatives.
  const scannedISBNsRef = useRef<Set<string>>(
    new Set(loadQueue().map((item) => item.isbn))
  );

  // Persist queue to localStorage and keep the ref in sync
  useEffect(() => {
    saveQueue(scanQueue);
    scannedISBNsRef.current = new Set(scanQueue.map((item) => item.isbn));
  }, [scanQueue]);

  const handleScan = useCallback((isbn: string) => {
    // Duplicate prevention — check the ref so the callback never reads a
    // stale copy of scanQueue even when called from inside the scan interval.
    if (scannedISBNsRef.current.has(isbn)) {
      toast({
        title: 'Already scanned',
        description: `ISBN ${isbn} is already in the queue`,
      });
      return;
    }

    // Update ref immediately so rapid back-to-back scans of the same barcode
    // are caught before the next React render cycle.
    scannedISBNsRef.current.add(isbn);

    setScanQueue(prev => [
      { isbn, scannedAt: new Date(), status: 'queued' },
      ...prev,
    ]);

    toast({
      title: 'Scanned!',
      description: `ISBN: ${isbn} added to queue`,
    });

    // Don't stop scanning - keep the camera running for bulk mode
  }, [toast]);

  const removeFromQueue = (isbn: string) => {
    setScanQueue(prev => prev.filter(item => item.isbn !== isbn));
  };

  const clearQueue = () => {
    setScanQueue([]);
    toast({ title: 'Queue cleared' });
  };

  // Sync all queued books
  const syncMutation = useMutation({
    mutationFn: async () => {
      const queuedItems = scanQueue.filter(item => item.status === 'queued');
      let successCount = 0;
      let failCount = 0;

      for (const item of queuedItems) {
        // Update status to "adding"
        setScanQueue(prev =>
          prev.map(i => i.isbn === item.isbn ? { ...i, status: 'adding' as const } : i)
        );

        try {
          const response = await fetch('/api/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isbn: item.isbn,
              status: 'owned',
            }),
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Failed' }));
            throw new Error(err.error?.message || err.error || 'Failed to add book');
          }

          const data = await response.json();

          setScanQueue(prev =>
            prev.map(i => i.isbn === item.isbn
              ? { ...i, status: 'success' as const, title: data.book?.title }
              : i
            )
          );
          successCount++;
        } catch (error) {
          setScanQueue(prev =>
            prev.map(i => i.isbn === item.isbn
              ? { ...i, status: 'error' as const, error: (error as Error).message }
              : i
            )
          );
          failCount++;
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      return { successCount, failCount };
    },
    onSuccess: ({ successCount, failCount }) => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['series'] });
      toast({
        title: 'Sync complete',
        description: `${successCount} books added${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });
    },
    onSettled: () => {
      setSyncing(false);
    },
  });

  const handleSync = () => {
    setSyncing(true);
    syncMutation.mutate();
  };

  const queuedCount = scanQueue.filter(i => i.status === 'queued').length;
  const successCount = scanQueue.filter(i => i.status === 'success').length;
  const errorCount = scanQueue.filter(i => i.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Scanner */}
      <div>
        {scanning ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Bulk Scan Mode</h3>
              <Badge variant="secondary" className="text-sm">
                {scanQueue.length} scanned
              </Badge>
            </div>
            <BarcodeScanner
              onScan={handleScan}
              onError={(err) => toast({ title: 'Scanner error', description: err, variant: 'destructive' })}
              continuous
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setScanning(false)}
            >
              Done Scanning
            </Button>
          </div>
        ) : (
          <Button onClick={() => setScanning(true)} className="w-full" size="lg">
            <Camera className="mr-2 h-5 w-5" />
            Start Bulk Scanning
          </Button>
        )}
      </div>

      {/* Queue */}
      {scanQueue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Scan Queue ({scanQueue.length})</h3>
            <div className="flex gap-2">
              {queuedCount > 0 && (
                <Button
                  onClick={handleSync}
                  disabled={syncing || queuedCount === 0}
                  size="sm"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Sync {queuedCount} Books
                    </>
                  )}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={clearQueue}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {scanQueue.map((item) => (
              <Card key={item.isbn} className="border">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono truncate">{item.isbn}</p>
                    {item.title && (
                      <p className="text-xs text-muted-foreground truncate">{item.title}</p>
                    )}
                    {item.error && (
                      <p className="text-xs text-destructive truncate">{item.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {item.status === 'queued' && (
                      <Badge variant="secondary">Queued</Badge>
                    )}
                    {item.status === 'adding' && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {item.status === 'success' && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {item.status === 'error' && (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                    {item.status === 'queued' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromQueue(item.isbn)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary */}
          {(successCount > 0 || errorCount > 0) && (
            <div className="flex gap-4 text-sm text-muted-foreground">
              {successCount > 0 && (
                <span className="text-green-500">{successCount} added</span>
              )}
              {errorCount > 0 && (
                <span className="text-destructive">{errorCount} failed</span>
              )}
              {queuedCount > 0 && (
                <span>{queuedCount} pending</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
