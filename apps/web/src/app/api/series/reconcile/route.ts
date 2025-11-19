import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { VolumeReconciliationService } from '@/lib/services/volume-reconciliation';

/**
 * POST /api/series/reconcile
 * Reconcile all series volumes - populate seriesVolumes table for existing series
 * This is useful for backfilling data after upgrading to the volume tracking system
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Series Reconciliation] Starting reconciliation of all series volumes...');

    const reconciliationService = new VolumeReconciliationService();
    const result = await reconciliationService.reconcileAllSeries();

    console.log(`[Series Reconciliation] Complete: ${result.processed} series processed, ${result.errors} errors`);

    return NextResponse.json({
      success: true,
      message: `Reconciled ${result.processed} series with ${result.errors} errors`,
      ...result,
    });
  } catch (error) {
    logger.error('[Series Reconciliation] Error:', error as Error);
    return NextResponse.json(
      {
        error: 'Failed to reconcile series volumes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
