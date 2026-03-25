import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MonitoringService } from '@/lib/services/monitoring';
import type { BookFormat } from '@/lib/services/monitoring';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const monitoringService = new MonitoringService();

/** Valid format identifiers in their canonical order */
const FORMAT_VALUES = ['hardcover', 'paperback', 'ebook', 'audiobook', 'manga'] as const;

const createProfileSchema = z.object({
  name: z.string().min(1).max(255),
  formatPreferences: z
    .array(z.enum(FORMAT_VALUES))
    .min(1, 'At least one format is required'),
  isDefault: z.boolean().default(false),
});

/**
 * GET /api/monitoring/profiles
 * Return all quality profiles for the authenticated user, ordered by
 * default-first then name.
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

    const profiles = await monitoringService.listQualityProfiles(session.user.id);

    return NextResponse.json({ profiles, total: profiles.length });
  } catch (error) {
    logger.error('GET /api/monitoring/profiles error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}

/**
 * POST /api/monitoring/profiles
 * Create a new quality profile for the authenticated user.
 * If isDefault is true, any previously-default profile is demoted first.
 */
export async function POST(req: Request) {
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
    const input = createProfileSchema.parse(body);

    const created = await monitoringService.createQualityProfile(
      session.user.id,
      {
        name: input.name,
        formatPreferences: input.formatPreferences as BookFormat[],
        isDefault: input.isDefault,
      }
    );

    logger.info('Quality profile created', {
      userId: session.user.id,
      profileId: created.id,
      name: created.name,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logger.error('POST /api/monitoring/profiles error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
