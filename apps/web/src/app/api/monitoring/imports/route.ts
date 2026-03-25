import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ImportListService } from '@/lib/services/import-lists';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const importListService = new ImportListService();

const createSchema = z.object({
  name: z.string().min(1).max(255),
  source: z.enum(['anilist_reading', 'anilist_planning', 'manual']),
  sourceConfig: z.record(z.string(), z.unknown()).optional(),
  autoMonitor: z.boolean().default(true),
  syncInterval: z.number().int().min(1).max(8760).default(24),
  enabled: z.boolean().default(true),
});

/**
 * GET /api/monitoring/imports
 * List all import lists configured for the authenticated user.
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
        { error: 'Too many requests. Please try again later.', retryAfter: rateLimitResult.retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Reset': rateLimitResult.resetAt?.toISOString() || '',
          },
        }
      );
    }

    const lists = await importListService.listImportLists(session.user.id);
    return NextResponse.json({ items: lists, total: lists.length });
  } catch (error) {
    logger.error('GET /api/monitoring/imports error:', error as Error);
    return handleError(error).toResponse();
  }
}

/**
 * POST /api/monitoring/imports
 * Create a new import list for the authenticated user.
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
        { error: 'Too many requests. Please try again later.', retryAfter: rateLimitResult.retryAfter },
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
    const input = createSchema.parse(body);

    const created = await importListService.createImportList(session.user.id, input);

    logger.info('Import list created', {
      userId: session.user.id,
      importListId: created.id,
      source: created.source,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logger.error('POST /api/monitoring/imports error:', error as Error);
    return handleError(error).toResponse();
  }
}
