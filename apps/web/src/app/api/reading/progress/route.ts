import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ReadingProgressService } from '@/lib/services/reading-progress';
import { updateProgressSchema } from '@/lib/validators/reading';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const readingProgressService = new ReadingProgressService();

const progressQuerySchema = z.object({
  bookId: z.string().uuid().optional(),
  status: z.string().optional(),
});

/**
 * GET /api/reading/progress
 * Get reading progress for a book
 */
export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const validatedParams = progressQuerySchema.parse({
      bookId: searchParams.get('bookId') || undefined,
      status: searchParams.get('status') || undefined,
    });

    // If bookId is provided, get progress for that specific book
    if (validatedParams.bookId) {
      const progress = await readingProgressService.getProgressForBook(
        session.user.id,
        validatedParams.bookId
      );
      return NextResponse.json(progress);
    }

    // If status is provided, get books by that status
    if (validatedParams.status) {
      const books = await readingProgressService.getBooksByStatus(
        session.user.id,
        validatedParams.status as any
      );
      return NextResponse.json(books);
    }

    return NextResponse.json({ error: 'Missing bookId or status parameter' }, { status: 400 });
  } catch (error) {
    logger.error('Get reading progress error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}

/**
 * POST /api/reading/progress
 * Create or update reading progress
 */
export async function POST(req: Request) {
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

    const body = await req.json();

    // Validate with Zod
    const validatedData = updateProgressSchema.parse(body);

    // Get or create progress first
    await readingProgressService.getOrCreateProgress(session.user.id, validatedData.bookId);

    // Then update it
    const progress = await readingProgressService.updateProgress(
      session.user.id,
      validatedData.bookId,
      {
        currentPage: validatedData.currentPage,
        totalPages: validatedData.totalPages,
        progressPercentage: validatedData.progressPercentage,
        notes: validatedData.notes,
      }
    );

    logger.info('Reading progress updated', {
      userId: session.user.id,
      bookId: validatedData.bookId,
      currentPage: validatedData.currentPage,
    });

    return NextResponse.json(progress);
  } catch (error) {
    logger.error('Update reading progress error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}

/**
 * DELETE /api/reading/progress
 * Delete reading progress
 */
export async function DELETE(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('bookId');

    const validatedBookId = z.string().uuid().parse(bookId);

    await readingProgressService.deleteProgress(session.user.id, validatedBookId);

    logger.info('Reading progress deleted', {
      userId: session.user.id,
      bookId: validatedBookId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Delete reading progress error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
