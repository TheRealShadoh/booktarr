import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { books, editions, userBooks } from '@booktarr/database';
import { eq } from 'drizzle-orm';
import { handleError, Errors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();

    // Get all user's books with editions
    const userBookEntries = await db
      .select()
      .from(userBooks)
      .where(eq(userBooks.userId, session.user.id));

    // Build book data for each entry
    const bookData = await Promise.all(
      userBookEntries.map(async (ub) => {
        const [edition] = await db
          .select()
          .from(editions)
          .where(eq(editions.id, ub.editionId))
          .limit(1);
        if (!edition) return null;
        const [book] = await db
          .select()
          .from(books)
          .where(eq(books.id, edition.bookId))
          .limit(1);
        if (!book) return null;
        return { userBook: ub, edition, book };
      })
    );

    const validBooks = bookData.filter(
      (entry): entry is NonNullable<typeof entry> => entry !== null
    );

    // Find duplicates by normalized title
    const titleMap = new Map<
      string,
      Array<{ userBook: typeof userBookEntries[0]; edition: typeof editions.$inferSelect; book: typeof books.$inferSelect }>
    >();

    for (const entry of validBooks) {
      // Normalize title: lowercase, remove vol/volume numbers, trim
      const normalized = entry.book.title
        .toLowerCase()
        .replace(/,?\s*vol\.?\s*\d+/gi, '')
        .replace(/\s*\(\d+\)\s*/g, '')
        .replace(/\s*\(volume\s*\d+\)\s*/gi, '')
        .replace(/\s*#\d+/g, '')
        .trim();

      if (!titleMap.has(normalized)) {
        titleMap.set(normalized, []);
      }
      titleMap.get(normalized)!.push(entry);
    }

    // Groups with 2+ entries that share the SAME volume number are true duplicates
    const duplicateGroups: Array<{
      normalizedTitle: string;
      volume: string;
      books: Array<{
        userBookId: string;
        bookId: string;
        title: string;
        isbn: string | null;
        coverUrl: string | null;
        createdAt: Date;
      }>;
    }> = [];

    for (const [normalizedTitle, entries] of titleMap) {
      if (entries.length < 2) continue;

      // Group by volume number to find true duplicates (not just different volumes)
      const volMap = new Map<string, typeof entries>();
      for (const entry of entries) {
        // Extract volume number from title
        const volMatch = entry.book.title.match(/vol\.?\s*(\d+)|#(\d+)|\((\d+)\)/i);
        const vol = volMatch
          ? (volMatch[1] || volMatch[2] || volMatch[3])
          : 'none';
        if (!volMap.has(vol)) volMap.set(vol, []);
        volMap.get(vol)!.push(entry);
      }

      for (const [vol, volEntries] of volMap) {
        if (volEntries.length >= 2) {
          duplicateGroups.push({
            normalizedTitle,
            volume: vol,
            books: volEntries.map((e) => ({
              userBookId: e.userBook.id,
              bookId: e.book.id,
              title: e.book.title,
              isbn: e.edition.isbn13 ?? e.edition.isbn10 ?? null,
              coverUrl: e.edition.coverUrl ?? null,
              createdAt: e.userBook.createdAt,
            })),
          });
        }
      }
    }

    return NextResponse.json({
      duplicateGroups,
      totalDuplicates: duplicateGroups.reduce(
        (sum, g) => sum + g.books.length - 1,
        0
      ),
    });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
