import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { CSVImportService } from '@/lib/services/csv-import';
import { importJobManager } from '@/lib/services/import-job-manager';

const csvImportService = new CSVImportService();

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const format = formData.get('format') as string || 'handylib';
    const skipDuplicates = formData.get('skipDuplicates') === 'true';
    const enrichMetadata = formData.get('enrichMetadata') === 'true';

    console.log('[CSV Import] Starting import:', { format, skipDuplicates, enrichMetadata, userId: session.user.id });

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      );
    }

    const csvContent = await file.text();
    console.log('[CSV Import] File read, size:', csvContent.length, 'bytes');

    // Parse CSV to get row count
    const rows = csvImportService.parseCSV(csvContent);
    const totalRows = rows.length;

    // Create a job for tracking
    const job = importJobManager.createJob(session.user.id, totalRows);

    console.log('[CSV Import] Created job:', job.id, 'with', totalRows, 'rows');

    // Start import in background (don't await)
    const runImport = async () => {
      try {
        let result;

        if (format === 'handylib') {
          result = await csvImportService.importHandyLibCSV(
            csvContent,
            session.user.id,
            {
              skipDuplicates,
              enrichMetadata,
              onProgress: (processed, success, failed) => {
                importJobManager.updateProgress(job.id, processed, success, failed);
              },
              shouldStop: () => {
                return importJobManager.isPaused(job.id) || importJobManager.isCancelled(job.id);
              },
            }
          );
        } else {
          // Generic CSV with field mapping
          const fieldMapping = JSON.parse(
            (formData.get('fieldMapping') as string) || '{}'
          );

          result = await csvImportService.importGenericCSV(
            csvContent,
            session.user.id,
            fieldMapping,
            {
              skipDuplicates,
              enrichMetadata,
            }
          );
        }

        // Add errors to job
        for (const error of result.errors) {
          importJobManager.addError(job.id, error.row, error.error);
        }

        // Mark job as complete
        importJobManager.completeJob(job.id);

        console.log('[CSV Import] Job completed:', {
          jobId: job.id,
          success: result.success,
          failed: result.failed,
        });
      } catch (error) {
        console.error('[CSV Import] Job failed:', error);
        importJobManager.failJob(
          job.id,
          error instanceof Error ? error.message : 'Import failed'
        );
      }
    };

    // Run in background
    runImport();

    // Return job ID immediately
    return NextResponse.json({
      jobId: job.id,
      totalRows,
      message: 'Import started in background',
    });
  } catch (error) {
    console.error('[CSV Import] Fatal error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Import failed',
      },
      { status: 500 }
    );
  }
}
