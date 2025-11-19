import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SeriesService } from '@/lib/services/series';
import { updateSeriesSchema } from '@/lib/validators/series';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const seriesService = new SeriesService();

const seriesIdParamSchema = z.object({
  id: z.string().uuid('Invalid series ID'),
});

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
    const { id: validatedId } = seriesIdParamSchema.parse({ id });

    const series = await seriesService.getSeriesById(validatedId, session.user.id);

    if (!series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    return NextResponse.json(series);
  } catch (error) {
    const { id } = await params;
    logger.error(`GET /api/series/${id} error:`, error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}

export async function PATCH(
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
    const { id: validatedId } = seriesIdParamSchema.parse({ id });

    const body = await req.json();

    // Validate update data
    const validatedData = updateSeriesSchema.parse(body);

    const updated = await seriesService.updateSeries(validatedId, validatedData);

    logger.info('Series updated', {
      userId: session.user.id,
      seriesId: validatedId,
    });

    return NextResponse.json(updated);
  } catch (error) {
    const { id } = await params;
    logger.error(`PATCH /api/series/${id} error:`, error);
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
    const { id: validatedId } = seriesIdParamSchema.parse({ id });

    await seriesService.deleteSeries(validatedId);

    logger.info('Series deleted', {
      userId: session.user.id,
      seriesId: validatedId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const { id } = await params;
    logger.error(`DELETE /api/series/${id} error:`, error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
