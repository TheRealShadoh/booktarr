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

const profileIdParamSchema = z.object({
  id: z.string().uuid('Invalid profile ID'),
});

const FORMAT_VALUES = ['hardcover', 'paperback', 'ebook', 'audiobook', 'manga'] as const;

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  formatPreferences: z.array(z.enum(FORMAT_VALUES)).min(1).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * PATCH /api/monitoring/profiles/[id]
 * Update a quality profile. Only the owning user's profiles may be changed.
 * Promoting a profile to isDefault automatically demotes the current default.
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
    const { id: validatedId } = profileIdParamSchema.parse({ id });

    const body = await req.json();
    const updates = updateProfileSchema.parse(body);

    const updated = await monitoringService.updateQualityProfile(
      validatedId,
      session.user.id,
      {
        ...updates,
        formatPreferences: updates.formatPreferences as BookFormat[] | undefined,
      }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Quality profile not found' }, { status: 404 });
    }

    logger.info('Quality profile updated', {
      userId: session.user.id,
      profileId: validatedId,
    });

    return NextResponse.json(updated);
  } catch (error) {
    const { id } = await params;
    logger.error(`PATCH /api/monitoring/profiles/${id} error:`, error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}

/**
 * DELETE /api/monitoring/profiles/[id]
 * Remove a quality profile. Only the owning user's profiles may be deleted.
 */
export async function DELETE(
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
    const { id: validatedId } = profileIdParamSchema.parse({ id });

    const deleted = await monitoringService.deleteQualityProfile(
      validatedId,
      session.user.id
    );

    if (!deleted) {
      return NextResponse.json({ error: 'Quality profile not found' }, { status: 404 });
    }

    logger.info('Quality profile deleted', {
      userId: session.user.id,
      profileId: validatedId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const { id } = await params;
    logger.error(`DELETE /api/monitoring/profiles/${id} error:`, error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
