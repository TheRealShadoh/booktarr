import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { CSVImportService } from '@/lib/services/csv-import';
import { handleError, Errors } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

// Increase function timeout for large CSV imports
export const maxDuration = 300; // 5 minutes (Vercel Pro plan)

const csvImportService = new CSVImportService();

export const dynamic = 'force-dynamic';

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

    logger.info('[CSV Import] Processing synchronously', { totalRows });

    let result;

    if (format === 'handylib') {
      result = await csvImportService.importHandyLibCSV(
        csvContent,
        session.user.id,
        {
          skipDuplicates,
          enrichMetadata,
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

    logger.info('[CSV Import] Complete', { success: result.success, failed: result.failed, totalRows });

    return NextResponse.json({
      success: result.success,
      failed: result.failed,
      totalRows,
      errors: result.errors.slice(0, 20), // Return at most 20 error details
      message: `Import complete: ${result.success} books imported, ${result.failed} failed`,
    });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
