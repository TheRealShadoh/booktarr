import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BookService } from '@/lib/services/books';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const bookService = new BookService();

export async function DELETE(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply bulk operation rate limiting (5 per 10 minutes)
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await rateLimit(identifier, 'bulk');

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many bulk operations. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Reset': rateLimitResult.resetAt?.toISOString() || '',
          },
        }
      );
    }

    await bookService.clearAllBooks(session.user.id);

    logger.warn('All books cleared', {
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'All books have been removed from your library',
    });
  } catch (error) {
    logger.error('DELETE /api/books/clear error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
