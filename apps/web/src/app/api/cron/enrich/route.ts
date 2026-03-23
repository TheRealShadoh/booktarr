import { NextResponse } from 'next/server';
import { BookService } from '@/lib/services/books';
import { SeriesMetadataEnrichmentService } from '@/lib/services/series-metadata-enrichment';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/enrich
 * Automatic enrichment cron job - enriches unenriched books and series
 * Called by Vercel Cron every hour
 * Also callable manually for testing
 */
export async function GET(req: Request) {
  try {
    // Verify cron secret if set (Vercel sends this header)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow without secret for manual testing, but log warning
      logger.warn('[Cron] No valid CRON_SECRET, proceeding anyway');
    }

    const bookService = new BookService();
    const seriesService = new SeriesMetadataEnrichmentService();

    // Enrich up to 3 books per cron run (Hobby plan has 10s timeout)
    let bookResult = { enriched: 0, failed: 0, processed: 0 };
    try {
      bookResult = await bookService.enrichBooksInBatch(3);
      logger.info('[Cron] Book enrichment complete', bookResult);
    } catch (err) {
      logger.error('[Cron] Book enrichment failed', err instanceof Error ? err : new Error(String(err)));
    }

    // Enrich only 1 series per cron run to stay within timeout
    let seriesResult = { processed: 0, updated: 0, errors: 0 };
    try {
      // Get one unenriched series and enrich it
      const { sql: sqlFn } = await import('drizzle-orm');
      const { series } = await import('@booktarr/database');
      const [unenriched] = await db.select({ id: series.id }).from(series)
        .where(sqlFn`${series.metadataLastUpdated} IS NULL OR ${series.totalVolumes} IS NULL`)
        .limit(1);
      if (unenriched) {
        await seriesService.enrichSeries(unenriched.id);
        seriesResult = { processed: 1, updated: 1, errors: 0 };
      }
      logger.info('[Cron] Series enrichment complete', seriesResult);
    } catch (err) {
      logger.error('[Cron] Series enrichment failed', err instanceof Error ? err : new Error(String(err)));
    }

    return NextResponse.json({
      success: true,
      books: bookResult,
      series: seriesResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[Cron] Enrichment cron failed', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
