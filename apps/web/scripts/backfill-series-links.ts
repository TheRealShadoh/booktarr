/**
 * Backfill script to link existing books to their series
 * This fixes the issue where books were imported but not linked to series records
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(__dirname, '../.env.local') });

import { db } from '../src/lib/db';
import { books, series, seriesBooks } from '../src/lib/db.schema';
import { eq } from 'drizzle-orm';
import { SeriesParserService } from '../src/lib/services/series-parser';
import { SeriesService } from '../src/lib/services/series';

const parser = new SeriesParserService();
const seriesService = new SeriesService();

async function backfillSeriesLinks() {
  console.log('Starting series links backfill...');

  // Get all books
  const allBooks = await db.select().from(books);
  console.log(`Found ${allBooks.length} books to process`);

  let linked = 0;
  let skipped = 0;
  let errors = 0;

  for (const book of allBooks) {
    try {
      // Try to parse series info from the book title
      const parsed = parser.parseTitle(book.title);

      if (parsed && parsed.seriesName) {
        console.log(`Processing: "${book.title}"`);
        console.log(`  → Parsed series: "${parsed.seriesName}", volume: ${parsed.volumeNumber}`);

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
          console.log(`  ✓ Already linked, skipping`);
          skipped++;
        } else {
          // Link the book to the series
          await seriesService.addBookToSeries({
            seriesId: seriesRecord.id,
            bookId: book.id,
            volumeNumber: parsed.volumeNumber || 1,
            volumeName: parsed.volumeName,
          });

          console.log(`  ✓ Linked to series "${seriesRecord.name}" as volume ${parsed.volumeNumber || 1}`);
          linked++;
        }
      } else {
        // No series info could be parsed
        skipped++;
      }
    } catch (error) {
      console.error(`  ✗ Error processing "${book.title}":`, error);
      errors++;
    }
  }

  console.log(`\\n=== Backfill Complete ===`);
  console.log(`Linked: ${linked}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

backfillSeriesLinks()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
