import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MonitoringService } from '@/lib/services/monitoring';
import { IndexerManager } from '@/lib/services/indexers';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const monitoringService = new MonitoringService();

const searchRequestSchema = z.object({
  title: z.string().min(1).max(500),
  author: z.string().max(255).optional(),
  volumeNumber: z.number().int().positive().optional(),
  seriesId: z.string().uuid().optional(),
});

/**
 * POST /api/monitoring/search
 * Search configured indexers for a specific book or series volume.
 *
 * Body:
 *   title        - book or series title (required)
 *   author       - optional author name to narrow results
 *   volumeNumber - optional volume number (for series searches)
 *   seriesId     - optional series UUID (for logging / activity context)
 *
 * Note: The actual indexer query logic will be wired up via IndexerService
 * once that service is implemented. The route structure and auth/validation
 * are complete and ready for integration.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the stricter 'search' rate limit bucket for potentially expensive
    // outbound indexer queries.
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await rateLimit(identifier, 'search');

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
    const input = searchRequestSchema.parse(body);

    // Fetch enabled indexers for this user so we can report which were queried.
    const enabledIndexers = (await monitoringService.listIndexers(session.user.id)).filter(
      (idx) => idx.enabled
    );

    if (enabledIndexers.length === 0) {
      return NextResponse.json(
        { error: 'No indexers configured. Add an indexer in monitoring settings.' },
        { status: 422 }
      );
    }

    const manager = new IndexerManager();
    const results = await manager.searchForBook(
      session.user.id,
      input.title,
      input.author,
      input.volumeNumber
    );

    logger.info('Indexer search initiated', {
      userId: session.user.id,
      title: input.title,
      volumeNumber: input.volumeNumber,
      indexerCount: enabledIndexers.length,
    });

    await monitoringService.logActivity({
      userId: session.user.id,
      eventType: 'indexer_search',
      entityType: input.seriesId ? 'series' : 'book',
      entityId: input.seriesId ?? session.user.id, // fall back to userId as a stable anchor
      entityName: input.title,
      details: {
        author: input.author,
        volumeNumber: input.volumeNumber,
        indexersQueried: enabledIndexers.map((i) => i.name),
      },
    });

    return NextResponse.json({
      results,
      indexersQueried: enabledIndexers.map((i) => i.name),
      query: input,
    });
  } catch (error) {
    logger.error('POST /api/monitoring/search error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
