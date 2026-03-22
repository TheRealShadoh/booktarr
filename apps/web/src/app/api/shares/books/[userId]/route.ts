import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ShareService } from '@/lib/services/shares';
import { BookService } from '@/lib/services/books';
import { handleError, Errors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const shareService = new ShareService();
const bookService = new BookService();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();

    const { userId: ownerId } = await params;

    // Verify accepted share exists
    const share = await shareService.hasAcceptedShare(ownerId, session.user.id);
    if (!share) throw Errors.forbidden('No active share with this user');

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    const result = await bookService.getUserBooks(ownerId, { limit });

    // Get owner info
    const { db } = await import('@/lib/db');
    const { users } = await import('@booktarr/database');
    const { eq } = await import('drizzle-orm');
    const [owner] = await db.select({ id: users.id, name: users.name, email: users.email })
      .from(users).where(eq(users.id, ownerId)).limit(1);

    return NextResponse.json({
      books: result.books,
      sharedFrom: owner,
      permission: share.permission,
      total: result.total,
    });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
