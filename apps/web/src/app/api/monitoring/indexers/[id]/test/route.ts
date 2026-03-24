import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MonitoringService } from '@/lib/services/monitoring';
import { IndexerManager, type IndexerConfig } from '@/lib/services/indexers';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { db } from '@/lib/db';
import { indexers } from '@booktarr/database';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const monitoringService = new MonitoringService();

const indexerIdParamSchema = z.object({
  id: z.string().uuid('Invalid indexer ID'),
});

/**
 * POST /api/monitoring/indexers/[id]/test
 * Test connectivity to an indexer by performing a lightweight capabilities
 * query (Torznab/Newznab ?t=caps, or a HEAD request for plain RSS feeds).
 *
 * On success the indexer's lastChecked timestamp is updated.
 *
 * Note: The actual probe logic will be wired up via IndexerService.
 * The route structure, auth, and ownership checks are complete and ready
 * for integration.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the bulk bucket — test calls make outbound network requests.
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await rateLimit(identifier, 'bulk');

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

    const indexer = await monitoringService.getIndexerById(validatedId, session.user.id);

    if (!indexer) {
      return NextResponse.json({ error: 'Indexer not found' }, { status: 404 });
    }

    logger.info('Indexer test requested', {
      userId: session.user.id,
      indexerId: validatedId,
      indexerType: indexer.type,
      url: indexer.url,
    });

    const manager = new IndexerManager();
    const testConfig: IndexerConfig = {
      id: indexer.id,
      name: indexer.name,
      type: indexer.type as IndexerConfig['type'],
      url: indexer.url,
      apiKey: indexer.apiKey,
      categories: indexer.categories as string[] | null,
      supportsSearch: indexer.supportsSearch,
      priority: indexer.priority,
      enabled: indexer.enabled,
    };

    let success = false;
    let message: string;
    const now = new Date();

    try {
      success = await manager.testIndexer(testConfig);
      message = success ? 'Connection successful.' : 'Indexer responded but returned no usable data.';
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }

    // Always update lastChecked so the UI reflects when a test was last run.
    await db
      .update(indexers)
      .set({ lastChecked: now, updatedAt: now })
      .where(and(eq(indexers.id, validatedId), eq(indexers.userId, session.user.id)));

    return NextResponse.json({
      success,
      message,
      indexerId: validatedId,
      indexerType: indexer.type,
      lastChecked: now.toISOString(),
    });
  } catch (error) {
    const { id } = await params;
    logger.error(`POST /api/monitoring/indexers/${id}/test error:`, error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
