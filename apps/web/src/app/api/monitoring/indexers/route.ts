import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MonitoringService } from '@/lib/services/monitoring';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const monitoringService = new MonitoringService();

const createIndexerSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['torznab', 'newznab', 'rss']),
  url: z.string().url().max(1000),
  apiKey: z.string().max(255).optional(),
  categories: z.array(z.string().max(20)).max(50).optional(),
  supportsSearch: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(0),
  enabled: z.boolean().default(true),
});

/**
 * GET /api/monitoring/indexers
 * List all indexers configured for the authenticated user,
 * ordered by priority (descending) then name.
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

    const indexerList = await monitoringService.listIndexers(session.user.id);

    // Mask API keys before returning to the client.
    const masked = indexerList.map((idx) => ({
      ...idx,
      apiKey: idx.apiKey ? '••••••••' : null,
    }));

    return NextResponse.json({ items: masked, total: masked.length });
  } catch (error) {
    logger.error('GET /api/monitoring/indexers error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}

/**
 * POST /api/monitoring/indexers
 * Create a new indexer configuration for the authenticated user.
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
    const input = createIndexerSchema.parse(body);

    const created = await monitoringService.createIndexer(session.user.id, input);

    logger.info('Indexer created', {
      userId: session.user.id,
      indexerId: created.id,
      type: created.type,
    });

    return NextResponse.json(
      { ...created, apiKey: created.apiKey ? '••••••••' : null },
      { status: 201 }
    );
  } catch (error) {
    logger.error('POST /api/monitoring/indexers error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
