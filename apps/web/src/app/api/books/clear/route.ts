import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BookService } from '@/lib/services/books';
import { handleError, Errors } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const bookService = new BookService();

const clearBooksSchema = z.object({
  confirm: z.literal('DELETE_ALL'),
});

export async function DELETE(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      throw Errors.unauthorized();
    }

    // Require confirmation
    const body = await req.json().catch(() => ({}));
    clearBooksSchema.parse(body);

    // Apply bulk operation rate limiting (5 per 10 minutes)
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await rateLimit(identifier, 'bulk');

    if (!rateLimitResult.success) {
      throw Errors.rateLimitExceeded(rateLimitResult.retryAfter);
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
