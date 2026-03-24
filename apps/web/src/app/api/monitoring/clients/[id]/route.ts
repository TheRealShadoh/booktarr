import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MonitoringService } from '@/lib/services/monitoring';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const monitoringService = new MonitoringService();

const clientIdParamSchema = z.object({
  id: z.string().uuid('Invalid client ID'),
});

const updateClientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(['deluge', 'sabnzbd', 'transmission', 'qbittorrent', 'nzbget']).optional(),
  host: z.string().url().max(1000).optional(),
  username: z.string().max(255).nullable().optional(),
  password: z.string().max(255).nullable().optional(),
  apiKey: z.string().max(255).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  enabled: z.boolean().optional(),
});

/**
 * PATCH /api/monitoring/clients/[id]
 * Update a download client configuration.
 * Only the authenticated user's own clients may be updated.
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
    const { id: validatedId } = clientIdParamSchema.parse({ id });

    const body = await req.json();
    const updates = updateClientSchema.parse(body);

    const updated = await monitoringService.updateDownloadClient(
      validatedId,
      session.user.id,
      updates
    );

    if (!updated) {
      return NextResponse.json({ error: 'Download client not found' }, { status: 404 });
    }

    logger.info('Download client updated', {
      userId: session.user.id,
      clientId: validatedId,
    });

    return NextResponse.json({
      ...updated,
      password: updated.password ? '••••••••' : null,
      apiKey: updated.apiKey ? '••••••••' : null,
    });
  } catch (error) {
    const { id } = await params;
    logger.error(`PATCH /api/monitoring/clients/${id} error:`, error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}

/**
 * DELETE /api/monitoring/clients/[id]
 * Remove a download client configuration.
 * Only the authenticated user's own clients may be deleted.
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
    const { id: validatedId } = clientIdParamSchema.parse({ id });

    const deleted = await monitoringService.deleteDownloadClient(
      validatedId,
      session.user.id
    );

    if (!deleted) {
      return NextResponse.json({ error: 'Download client not found' }, { status: 404 });
    }

    logger.info('Download client deleted', {
      userId: session.user.id,
      clientId: validatedId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const { id } = await params;
    logger.error(`DELETE /api/monitoring/clients/${id} error:`, error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
