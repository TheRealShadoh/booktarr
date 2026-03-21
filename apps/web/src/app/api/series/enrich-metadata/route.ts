import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { SeriesMetadataEnrichmentService } from '@/lib/services/series-metadata-enrichment';
import { handleError, Errors } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

/**
 * POST /api/series/enrich-metadata
 * Enrich all series with metadata from external APIs (AniList, Google Books)
 * Fetches cover images, total volumes, descriptions, and status
 */
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

    logger.info('[Series Enrichment] Starting metadata enrichment');

    const enrichmentService = new SeriesMetadataEnrichmentService();
    const result = await enrichmentService.enrichAllSeries();

    logger.info('[Series Enrichment] Complete', { updated: result.updated, processed: result.processed, errors: result.errors });

    return NextResponse.json({
      success: true,
      message: `Enriched ${result.updated} of ${result.processed} series with ${result.errors} errors`,
      ...result,
    });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
