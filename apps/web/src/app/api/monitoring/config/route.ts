import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MonitoringService } from '@/lib/services/monitoring';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const monitoringService = new MonitoringService();

const updateConfigSchema = z.object({
  autoMonitorNewSeries: z.boolean().optional(),
  searchOnAdd: z.boolean().optional(),
  defaultFormat: z.enum(['physical', 'ebook', 'audiobook', 'any']).optional(),
  notifyOnNewVolume: z.boolean().optional(),
  notifyOnDownloadComplete: z.boolean().optional(),
});

/**
 * GET /api/monitoring/config
 * Return the monitoring configuration for the authenticated user.
 * Creates a default configuration row if one does not exist.
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

    const config = await monitoringService.getMonitoringConfig(session.user.id);

    return NextResponse.json(config);
  } catch (error) {
    logger.error('GET /api/monitoring/config error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}

/**
 * PATCH /api/monitoring/config
 * Update monitoring preferences for the authenticated user.
 * Accepts a partial body — only provided fields are updated.
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
    const updates = updateConfigSchema.parse(body);

    const updated = await monitoringService.updateMonitoringConfig(
      session.user.id,
      updates
    );

    logger.info('Monitoring config updated', { userId: session.user.id, updates });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('PATCH /api/monitoring/config error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
