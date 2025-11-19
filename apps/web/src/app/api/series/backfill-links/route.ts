import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { books, series, seriesBooks } from '@booktarr/database';
import { eq, and } from 'drizzle-orm';
import { SeriesParserService } from '@/lib/services/series-parser';
import { SeriesService } from '@/lib/services/series';

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Backfill] Starting series links backfill for user:', session.user.id);

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

    console.log(`[Backfill] Found ${userBooks.length} books to process`);

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
          console.log(`[Backfill] Processing: "${book.title}"`);
          console.log(`[Backfill]   → Parsed series: "${parsed.seriesName}", volume: ${parsed.volumeNumber}`);

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
            console.log(`[Backfill]   ✓ Already linked, skipping`);
            skipped++;
          } else {
            // Link the book to the series
            await seriesService.addBookToSeries({
              seriesId: seriesRecord.id,
              bookId: book.id,
              volumeNumber: parsed.volumeNumber || 1,
              volumeName: parsed.volumeName,
            });

            console.log(`[Backfill]   ✓ Linked to series "${seriesRecord.name}" as volume ${parsed.volumeNumber || 1}`);
            linked++;
          }
        } else {
          // No series info could be parsed
          skipped++;
        }
      } catch (error) {
        logger.error(`[Backfill]   ✗ Error processing "${book.title}":`, error);
        errors++;
        errorDetails.push({
          title: book.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`[Backfill] Complete - Linked: ${linked}, Skipped: ${skipped}, Errors: ${errors}`);

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
    logger.error('[Backfill] Fatal error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Backfill failed',
      },
      { status: 500 }
    );
  }
}
