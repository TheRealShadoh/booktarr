import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { books, series, seriesBooks } from '@booktarr/database';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { SeriesParserService } from '@/lib/services/series-parser';
import { SeriesService } from '@/lib/services/series';
import { handleError, Errors } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

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

    logger.info('[Backfill] Starting series links backfill for user', { userId: session.user.id });

    const parser = new SeriesParserService();
    const seriesService = new SeriesService();

    // Get all books for the user
    const userBooks = await db.query.userBooks.findMany({
      where: (ub, { eq }) => eq(ub.userId, session.user.id),
      with: {
        edition: {
          with: {
            book: true
          }
        }
      }
    });

    logger.info('[Backfill] Found books to process', { count: userBooks.length });

    let linked = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: Array<{ title: string; error: string }> = [];

    for (const userBook of userBooks) {
      const book = userBook.edition?.book;
      if (!book) {
        skipped++;
        continue;
      }

      try {
        // Try to parse series info from the book title
        const parsed = parser.parseTitle(book.title);

        if (parsed && parsed.seriesName) {
          logger.info(`[Backfill] Processing: "${book.title}"`);
          logger.info('[Backfill] Parsed series info', { seriesName: parsed.seriesName, volumeNumber: parsed.volumeNumber });

          // Find or create the series
          const seriesRecord = await seriesService.findOrCreateSeries(parsed.seriesName);

          // Check if already linked
          const existingLink = await db.query.seriesBooks.findFirst({
            where: (sb, { and, eq }) => and(
              eq(sb.bookId, book.id),
              eq(sb.seriesId, seriesRecord.id)
            )
          });

          if (existingLink) {
            logger.info('[Backfill] Already linked, skipping');
            skipped++;
          } else {
            // Link the book to the series
            await seriesService.addBookToSeries({
              seriesId: seriesRecord.id,
              bookId: book.id,
              volumeNumber: parsed.volumeNumber || 1,
              volumeName: parsed.volumeName,
            });

            logger.info('[Backfill] Linked to series', { seriesName: seriesRecord.name, volumeNumber: parsed.volumeNumber || 1 });
            linked++;
          }
        } else {
          // No series info could be parsed
          skipped++;
        }
      } catch (error) {
        logger.error(`[Backfill]   ✗ Error processing "${book.title}":`, error as Error);
        errors++;
        errorDetails.push({
          title: book.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info('[Backfill] Complete', { linked, skipped, errors });

    return NextResponse.json({
      success: true,
      stats: {
        total: userBooks.length,
        linked,
        skipped,
        errors
      },
      errorDetails: errorDetails.length > 0 ? errorDetails.slice(0, 10) : undefined
    });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
