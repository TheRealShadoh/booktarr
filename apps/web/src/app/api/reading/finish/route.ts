import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ReadingProgressService } from '@/lib/services/reading-progress';
import { finishReadingSchema } from '@/lib/validators/reading';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const readingProgressService = new ReadingProgressService();

/**
 * POST /api/reading/finish
 * Finish reading a book
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
    const validatedData = finishReadingSchema.parse(body);

    const progress = await readingProgressService.finishReading(
      session.user.id,
      validatedData.bookId,
      validatedData.rating,
      validatedData.review
    );

    logger.info('Reading finished', {
      userId: session.user.id,
      bookId: validatedData.bookId,
      rating: validatedData.rating,
      favorite: validatedData.favorite,
    });

    return NextResponse.json(progress);
  } catch (error) {
    logger.error('Finish reading error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
