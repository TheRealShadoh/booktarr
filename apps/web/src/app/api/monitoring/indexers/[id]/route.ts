import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MonitoringService } from '@/lib/services/monitoring';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const monitoringService = new MonitoringService();

const indexerIdParamSchema = z.object({
  id: z.string().uuid('Invalid indexer ID'),
});

const updateIndexerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(['torznab', 'newznab', 'rss']).optional(),
  url: z.string().url().max(1000).optional(),
  apiKey: z.string().max(255).nullable().optional(),
  categories: z.array(z.string().max(20)).max(50).nullable().optional(),
  supportsSearch: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  enabled: z.boolean().optional(),
});

/**
 * PATCH /api/monitoring/indexers/[id]
 * Update an indexer configuration.
 * Only the authenticated user's own indexers may be updated.
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
    const { id: validatedId } = indexerIdParamSchema.parse({ id });

    const body = await req.json();
    const updates = updateIndexerSchema.parse(body);

    const updated = await monitoringService.updateIndexer(
      validatedId,
      session.user.id,
      updates
    );

    if (!updated) {
      return NextResponse.json({ error: 'Indexer not found' }, { status: 404 });
    }

    logger.info('Indexer updated', {
      userId: session.user.id,
      indexerId: validatedId,
    });

    return NextResponse.json({
      ...updated,
      apiKey: updated.apiKey ? '••••••••' : null,
    });
  } catch (error) {
    const { id } = await params;
    logger.error(`PATCH /api/monitoring/indexers/${id} error:`, error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}

/**
 * DELETE /api/monitoring/indexers/[id]
 * Remove an indexer configuration.
 * Only the authenticated user's own indexers may be deleted.
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
    const { id: validatedId } = indexerIdParamSchema.parse({ id });

    const deleted = await monitoringService.deleteIndexer(validatedId, session.user.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Indexer not found' }, { status: 404 });
    }

    logger.info('Indexer deleted', {
      userId: session.user.id,
      indexerId: validatedId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const { id } = await params;
    logger.error(`DELETE /api/monitoring/indexers/${id} error:`, error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
