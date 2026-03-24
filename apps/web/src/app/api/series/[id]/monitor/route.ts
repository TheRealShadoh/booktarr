import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MonitoringService } from '@/lib/services/monitoring';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const monitoringService = new MonitoringService();

const seriesIdParamSchema = z.object({
  id: z.string().uuid('Invalid series ID'),
});

const toggleMonitorSchema = z.object({
  monitored: z.boolean(),
});

/**
 * PATCH /api/series/[id]/monitor
 * Toggle monitoring for a series.
 * Body: { monitored: boolean }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { id: validatedId } = seriesIdParamSchema.parse({ id });

    const body = await req.json();
    const { monitored } = toggleMonitorSchema.parse(body);

    await monitoringService.toggleSeriesMonitoring(validatedId, monitored);

    logger.info('Series monitoring toggled', {
      userId: session.user.id,
      seriesId: validatedId,
      monitored,
    });

    return NextResponse.json({ success: true, monitored });
  } catch (error) {
    const { id } = await params;
    logger.error(`PATCH /api/series/${id}/monitor error:`, error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
