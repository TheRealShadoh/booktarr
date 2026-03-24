import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MonitoringService } from '@/lib/services/monitoring';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const monitoringService = new MonitoringService();

const activityQuerySchema = z.object({
  eventType: z.string().max(100).optional(),
  unreadOnly: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const markReadSchema = z.object({
  activityIds: z.array(z.string().uuid()).min(1).max(500),
});

/**
 * GET /api/monitoring/activity
 * Retrieve the activity feed for the authenticated user.
 *
 * Query parameters:
 *   eventType   - filter to a specific event type string
 *   unreadOnly  - 'true' to return only unread entries
 *   limit       - page size (default 50, max 200)
 *   offset      - page offset (default 0)
 *
 * Response also includes the total unread count for badge display.
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
    const { eventType, unreadOnly, limit, offset } = activityQuerySchema.parse({
      eventType: searchParams.get('eventType') ?? undefined,
      unreadOnly: searchParams.get('unreadOnly') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });

    const [items, unreadCount] = await Promise.all([
      monitoringService.getActivityFeed(
        session.user.id,
        { eventType, unreadOnly },
        limit,
        offset
      ),
      monitoringService.getUnreadCount(session.user.id),
    ]);

    return NextResponse.json({ items, unreadCount, limit, offset });
  } catch (error) {
    logger.error('GET /api/monitoring/activity error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}

/**
 * PATCH /api/monitoring/activity
 * Mark one or more activity entries as read.
 * Body: { activityIds: string[] }
 */
export async function PATCH(req: Request) {
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

    const body = await req.json();
    const { activityIds } = markReadSchema.parse(body);

    await monitoringService.markActivitiesRead(activityIds);

    logger.info('Activity entries marked read', {
      userId: session.user.id,
      count: activityIds.length,
    });

    return NextResponse.json({ success: true, marked: activityIds.length });
  } catch (error) {
    logger.error('PATCH /api/monitoring/activity error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
