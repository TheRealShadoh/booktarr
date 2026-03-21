import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { VolumeReconciliationService } from '@/lib/services/volume-reconciliation';
import { handleError, Errors } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

/**
 * POST /api/series/reconcile
 * Reconcile all series volumes - populate seriesVolumes table for existing series
 * This is useful for backfilling data after upgrading to the volume tracking system
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

    logger.info('[Series Reconciliation] Starting reconciliation of all series volumes');

    const reconciliationService = new VolumeReconciliationService();
    const result = await reconciliationService.reconcileAllSeries();

    logger.info('[Series Reconciliation] Complete', { processed: result.processed, errors: result.errors });

    return NextResponse.json({
      success: true,
      message: `Reconciled ${result.processed} series with ${result.errors} errors`,
      ...result,
    });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
