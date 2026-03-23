import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { editions, userBooks, readingProgress } from '@booktarr/database';
import { eq, and } from 'drizzle-orm';
import { handleError, Errors } from '@/lib/api-error';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const cleanSchema = z.object({
  userBookIds: z.array(z.string().uuid()),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();

    const body = await req.json();
    const { userBookIds } = cleanSchema.parse(body);

    let deleted = 0;
    for (const ubId of userBookIds) {
      // Verify ownership before deletion
      const [ub] = await db
        .select()
        .from(userBooks)
        .where(
          and(
            eq(userBooks.id, ubId),
            eq(userBooks.userId, session.user.id)
          )
        )
        .limit(1);

      if (ub) {
        // Look up the edition to find bookId for reading progress cleanup
        const [edition] = await db
          .select()
          .from(editions)
          .where(eq(editions.id, ub.editionId))
          .limit(1);

        if (edition) {
          // Delete reading progress for this book before removing ownership
          await db
            .delete(readingProgress)
            .where(
              and(
                eq(readingProgress.bookId, edition.bookId),
                eq(readingProgress.userId, session.user.id)
              )
            );
        }

        // Remove the user's ownership record for this edition
        await db.delete(userBooks).where(eq(userBooks.id, ubId));
        deleted++;
      }
    }

    return NextResponse.json({ deleted });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
