/**
 * Volume Reconciliation Service
 *
 * Manages the seriesVolumes table to track ALL expected volumes in a series,
 * including those not yet owned. This enables proper completion tracking
 * and identification of missing volumes.
 */

import { logger } from '@/lib/logger';
import { db } from '../db';
import { series, seriesVolumes, seriesBooks, books } from '@booktarr/database';
import { eq, and, sql } from 'drizzle-orm';

export class VolumeReconciliationService {
  /**
   * Populate seriesVolumes entries for a series based on totalVolumes
   * Creates entries for volumes 1-N where N is totalVolumes
   */
  async populateExpectedVolumes(seriesId: string): Promise<void> {
    // Get series metadata
    const seriesData = await db.query.series.findFirst({
      where: eq(series.id, seriesId),
    });

    if (!seriesData) {
      logger.info(`[Volume Reconciliation] Series ${seriesId} not found, skipping`);
      return;
    }

    // If totalVolumes is set, create entries for all expected volumes
    if (seriesData.totalVolumes && seriesData.totalVolumes > 0) {
      logger.info(`[Volume Reconciliation] Populating expected volumes for "${seriesData.name}"`, { totalVolumes: seriesData.totalVolumes });

      // Create volume entries for 1 to totalVolumes
      for (let volumeNum = 1; volumeNum <= seriesData.totalVolumes; volumeNum++) {
        // Check if volume entry already exists
        const existing = await db.query.seriesVolumes.findFirst({
          where: and(
            eq(seriesVolumes.seriesId, seriesId),
            eq(seriesVolumes.volumeNumber, volumeNum)
          ),
        });

        if (!existing) {
          // Create new volume entry
          await db.insert(seriesVolumes).values({
            seriesId,
            volumeNumber: volumeNum,
            released: true, // Assume released if within totalVolumes
            announced: false,
          });
          logger.info(`[Volume Reconciliation] Created volume entry ${volumeNum} for series ${seriesData.name}`);
        }
      }
    } else {
      logger.info(`[Volume Reconciliation] Series "${seriesData.name}" has no totalVolumes set, will populate from owned books`);
    }

    // Always link owned books to their volume entries (creates entries if they don't exist)
    await this.linkOwnedBooksToVolumes(seriesId);
  }

  /**
   * Link existing books in seriesBooks to their corresponding seriesVolumes entries
   * Sets the bookId field on seriesVolumes records
   */
  async linkOwnedBooksToVolumes(seriesId: string): Promise<void> {
    // Get all books linked to this series (separate queries to avoid joins)
    const seriesBookEntries = await db
      .select()
      .from(seriesBooks)
      .where(eq(seriesBooks.seriesId, seriesId));

    const ownedBooks = await Promise.all(
      seriesBookEntries.map(async (sb) => {
        const [book] = await db.select().from(books).where(eq(books.id, sb.bookId)).limit(1);
        return book ? { seriesBook: sb, book } : null;
      })
    );

    const validOwnedBooks = ownedBooks.filter(Boolean) as { seriesBook: typeof seriesBookEntries[0]; book: typeof books.$inferSelect }[];

    logger.info(`[Volume Reconciliation] Linking owned books to volume entries`, { count: validOwnedBooks.length });

    for (const { seriesBook, book } of validOwnedBooks) {
      // Find or create the corresponding seriesVolumes entry
      const volumeEntry = await db.query.seriesVolumes.findFirst({
        where: and(
          eq(seriesVolumes.seriesId, seriesId),
          eq(seriesVolumes.volumeNumber, seriesBook.volumeNumber)
        ),
      });

      if (volumeEntry) {
        // Update existing volume entry with book link
        await db
          .update(seriesVolumes)
          .set({
            bookId: book.id,
            title: seriesBook.volumeName || book.title,
            updatedAt: new Date(),
          })
          .where(eq(seriesVolumes.id, volumeEntry.id));

        logger.info(`[Volume Reconciliation] Linked book "${book.title}" to volume ${seriesBook.volumeNumber}`);
      } else {
        // Create new volume entry if it doesn't exist (for series without totalVolumes set)
        await db.insert(seriesVolumes).values({
          seriesId,
          volumeNumber: seriesBook.volumeNumber,
          title: seriesBook.volumeName || book.title,
          bookId: book.id,
          released: true,
          announced: false,
        });

        logger.info(`[Volume Reconciliation] Created and linked volume ${seriesBook.volumeNumber} for "${book.title}"`);
      }
    }
  }

  /**
   * Reconcile volumes after a book is added to a series
   * Ensures the volume entry exists and is linked to the book
   */
  async reconcileAfterBookAdded(seriesId: string, bookId: string, volumeNumber: number, volumeName?: string): Promise<void> {
    // Find or create volume entry
    const volumeEntry = await db.query.seriesVolumes.findFirst({
      where: and(
        eq(seriesVolumes.seriesId, seriesId),
        eq(seriesVolumes.volumeNumber, volumeNumber)
      ),
    });

    // Get book details
    const book = await db.query.books.findFirst({
      where: eq(books.id, bookId),
    });

    if (!book) {
      logger.error(`[Volume Reconciliation] Book ${bookId} not found`, new Error('Book not found'), { bookId });
      return;
    }

    if (volumeEntry) {
      // Update existing entry
      await db
        .update(seriesVolumes)
        .set({
          bookId: book.id,
          title: volumeName || book.title,
          updatedAt: new Date(),
        })
        .where(eq(seriesVolumes.id, volumeEntry.id));

      logger.info(`[Volume Reconciliation] Updated volume ${volumeNumber} with book "${book.title}"`);
    } else {
      // Create new entry
      await db.insert(seriesVolumes).values({
        seriesId,
        volumeNumber,
        title: volumeName || book.title,
        bookId: book.id,
        released: true,
        announced: false,
      });

      logger.info(`[Volume Reconciliation] Created volume ${volumeNumber} with book "${book.title}"`);
    }
  }

  /**
   * Reconcile all series volumes
   * Useful for initial setup or fixing data inconsistencies
   */
  async reconcileAllSeries(): Promise<{ processed: number; errors: number }> {
    const allSeries = await db.select().from(series);

    let processed = 0;
    let errors = 0;

    for (const seriesData of allSeries) {
      try {
        await this.populateExpectedVolumes(seriesData.id);
        processed++;
      } catch (error) {
        logger.error(`[Volume Reconciliation] Error reconciling series "${seriesData.name}":`, error instanceof Error ? error : new Error(String(error)));
        errors++;
      }
    }

    logger.info('[Volume Reconciliation] Reconciliation complete', { processed, errors });
    return { processed, errors };
  }
}
