import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { CSVImportService } from '@/lib/services/csv-import';
import { importJobManager } from '@/lib/services/import-job-manager';
import { handleError, Errors } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

// Increase function timeout for large CSV imports
export const maxDuration = 300; // 5 minutes (Vercel Pro plan)

const csvImportService = new CSVImportService();

const ALLOWED_FORMATS = ['handylib', 'generic'] as const;

export async function POST(req: Request) {
  try {
    const clientId = getClientIdentifier(req);
    const rateLimitResult = await rateLimit(clientId, 'bulk');
    if (!rateLimitResult.success) {
      throw Errors.rateLimitExceeded(rateLimitResult.retryAfter);
    }

    const session = await auth();
    if (!session?.user) {
      throw Errors.unauthorized();
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const rawFormat = formData.get('format');
    const format = (typeof rawFormat === 'string' && rawFormat.length > 0) ? rawFormat : 'handylib';
    const skipDuplicates = formData.get('skipDuplicates') === 'true';
    const enrichMetadata = formData.get('enrichMetadata') === 'true';

    if (!file || !(file instanceof File)) {
      throw Errors.badRequest('No file provided');
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      throw Errors.badRequest('File must be a CSV');
    }

    if (!ALLOWED_FORMATS.includes(format as typeof ALLOWED_FORMATS[number])) {
      throw Errors.badRequest(`Invalid format. Must be one of: ${ALLOWED_FORMATS.join(', ')}`);
    }

    logger.info('[CSV Import] Starting import', { format, skipDuplicates, enrichMetadata, userId: session.user.id });

    const csvContent = await file.text();
    logger.info('[CSV Import] File read', { sizeBytes: csvContent.length });

    // Parse CSV to get row count
    const rows = csvImportService.parseCSV(csvContent);
    const totalRows = rows.length;

    // Create a job for tracking
    const job = importJobManager.createJob(session.user.id, totalRows);

    logger.info('[CSV Import] Created job', { jobId: job.id, totalRows });

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
          const fieldMappingRaw = formData.get('fieldMapping');
          const fieldMapping = JSON.parse(
            (typeof fieldMappingRaw === 'string' ? fieldMappingRaw : null) ?? '{}'
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

        logger.info('[CSV Import] Job completed', { jobId: job.id, success: result.success, failed: result.failed });
      } catch (error) {
        logger.error('[CSV Import] Job failed:', error as Error);
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
    return handleError(error).toResponse();
  }
}
