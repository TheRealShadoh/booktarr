import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SeriesMetadataEnrichmentService } from '@/lib/services/series-metadata-enrichment';

/**
 * POST /api/series/enrich-metadata
 * Enrich all series with metadata from external APIs (AniList, Google Books)
 * Fetches cover images, total volumes, descriptions, and status
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Series Enrichment] Starting metadata enrichment...');

    const enrichmentService = new SeriesMetadataEnrichmentService();
    const result = await enrichmentService.enrichAllSeries();

    console.log(`[Series Enrichment] Complete: ${result.updated}/${result.processed} series updated, ${result.errors} errors`);

    return NextResponse.json({
      success: true,
      message: `Enriched ${result.updated} of ${result.processed} series with ${result.errors} errors`,
      ...result,
    });
  } catch (error) {
    logger.error('[Series Enrichment] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to enrich series metadata',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
