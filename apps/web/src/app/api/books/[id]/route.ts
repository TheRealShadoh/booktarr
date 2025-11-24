import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BookService } from '@/lib/services/books';
import { bookIdParamSchema } from '@/lib/validators/book';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const bookService = new BookService();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await rateLimit(identifier, 'api');

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
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

    const { id } = await params;

    // Validate UUID
    const { id: validatedId } = bookIdParamSchema.parse({ id });

    const book = await bookService.getBookById(validatedId, session.user.id);

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json(book);
  } catch (error) {
    const { id } = await params;
    logger.error(`GET /api/books/${id} error:`, error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await rateLimit(identifier, 'api');

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
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

    const { id } = await params;

    // Validate UUID
    const { id: validatedId } = bookIdParamSchema.parse({ id });

    await bookService.deleteBook(validatedId, session.user.id);

    logger.info('Book deleted', {
      userId: session.user.id,
      bookId: validatedId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const { id } = await params;
    logger.error(`DELETE /api/books/${id} error:`, error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
