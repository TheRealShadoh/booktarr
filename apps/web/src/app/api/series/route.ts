import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SeriesService } from '@/lib/services/series';
import { seriesSearchParamsSchema, createSeriesSchema } from '@/lib/validators/series';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const seriesService = new SeriesService();

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

    // Validate search params
    const validatedParams = seriesSearchParamsSchema.parse({
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    });

    const series = await seriesService.getSeries(session.user.id, validatedParams);

    return NextResponse.json({
      series,
      pagination: {
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        total: series.length,
      },
    });
  } catch (error) {
    logger.error('GET /api/series error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}

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
    const validatedData = createSeriesSchema.parse(body);

    const series = await seriesService.createSeries(validatedData);

    logger.info('Series created', {
      userId: session.user.id,
      seriesId: series.id,
      name: series.name,
    });

    return NextResponse.json(series, { status: 201 });
  } catch (error) {
    logger.error('POST /api/series error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
