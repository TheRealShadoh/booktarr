import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ReadingProgressService } from '@/lib/services/reading-progress';
import { readingStatsQuerySchema } from '@/lib/validators/reading';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const readingProgressService = new ReadingProgressService();

/**
 * GET /api/reading/stats
 * Get reading statistics for the user
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

    // Validate query params
    const validatedParams = readingStatsQuerySchema.parse({
      year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined,
      month: searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined,
    });

    const stats = await readingProgressService.getReadingStats(session.user.id, validatedParams);

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Get reading stats error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
