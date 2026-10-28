'use client';

import { BulkScanner } from '@/components/books/bulk-scanner';
import { ScanBarcode } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';

export default function ScanPage() {
  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <PageHeader
        icon={ScanBarcode}
        title="Bulk Scan"
        description="Scan several barcodes in a row. Books queue locally and sync when you're ready."
      />

      <BulkScanner />

      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">How it works</p>
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
