import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ImportListService } from '@/lib/services/import-lists';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const importListService = new ImportListService();

/**
 * POST /api/monitoring/imports/[id]/sync
 * Manually trigger a sync of a single import list.
 * Returns the sync result with counts of imported/skipped/errored series.
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

    const identifier = getClientIdentifier(req);
    const rateLimitResult = await rateLimit(identifier, 'api');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      );
    }

    const { id } = await params;

    logger.info('Manual import list sync triggered', {
      userId: session.user.id,
      importListId: id,
    });

    const result = await importListService.syncImportList(id, session.user.id);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error('POST /api/monitoring/imports/[id]/sync error:', error as Error);
    return handleError(error).toResponse();
  }
}
