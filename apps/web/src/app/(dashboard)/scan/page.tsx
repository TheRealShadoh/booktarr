'use client';

import { BulkScanner } from '@/components/books/bulk-scanner';
import { Smartphone } from 'lucide-react';

export default function ScanPage() {
  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Smartphone className="h-8 w-8" />
          Bulk Scan
        </h1>
        <p className="text-muted-foreground mt-1">
          Scan multiple book barcodes in a row. Books are queued locally and synced when ready.
        </p>
      </div>

      <BulkScanner />

      <div className="rounded-lg border p-4 text-sm text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">How it works:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Tap &quot;Start Bulk Scanning&quot; to open your camera</li>
          <li>Point at book barcodes - each scan adds to the queue</li>
          <li>The camera stays open between scans for rapid scanning</li>
          <li>When done, tap &quot;Done Scanning&quot;</li>
          <li>Review your queue and tap &quot;Sync&quot; to add all books</li>
        </ol>
        <p className="mt-2">
          Scans are saved locally so you can scan offline and sync later when connected.
        </p>
      </div>
    </div>
  );
}
