import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ImportListService } from '@/lib/services/import-lists';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const importListService = new ImportListService();

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sourceConfig: z.record(z.string(), z.unknown()).optional(),
  autoMonitor: z.boolean().optional(),
  syncInterval: z.number().int().min(1).max(8760).optional(),
  enabled: z.boolean().optional(),
});

/**
 * PATCH /api/monitoring/imports/[id]
 * Update an import list owned by the authenticated user.
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
        { error: 'Too many requests. Please try again later.', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const input = updateSchema.parse(body);

    const updated = await importListService.updateImportList(id, session.user.id, input);
    if (!updated) {
      return NextResponse.json({ error: 'Import list not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('PATCH /api/monitoring/imports/[id] error:', error as Error);
    return handleError(error).toResponse();
  }
}

/**
 * DELETE /api/monitoring/imports/[id]
 * Delete an import list owned by the authenticated user.
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
        { error: 'Too many requests. Please try again later.', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      );
    }

    const { id } = await params;
    const deleted = await importListService.deleteImportList(id, session.user.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Import list not found' }, { status: 404 });
    }

    logger.info('Import list deleted', { userId: session.user.id, importListId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE /api/monitoring/imports/[id] error:', error as Error);
    return handleError(error).toResponse();
  }
}
