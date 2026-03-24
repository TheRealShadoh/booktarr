import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MonitoringService } from '@/lib/services/monitoring';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const monitoringService = new MonitoringService();

const wantedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/monitoring/wanted
 * Return all monitored volumes that the authenticated user does not yet own.
 * Supports pagination via ?limit= and ?offset= query parameters.
 */
export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const { limit, offset } = wantedQuerySchema.parse({
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });

    const allWanted = await monitoringService.getWantedVolumes(session.user.id);

    // Apply in-memory pagination (result set is bounded by the user's monitored
    // series, so this is acceptable without a DB-level LIMIT/OFFSET).
    const page = allWanted.slice(offset, offset + limit);

    return NextResponse.json({
      items: page,
      total: allWanted.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('GET /api/monitoring/wanted error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
