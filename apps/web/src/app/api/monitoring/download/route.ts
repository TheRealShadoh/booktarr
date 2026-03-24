import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MonitoringService } from '@/lib/services/monitoring';
import { DownloadClientManager } from '@/lib/services/download-clients';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { db } from '@/lib/db';
import { downloadQueue } from '@booktarr/database';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const monitoringService = new MonitoringService();

const downloadRequestSchema = z.object({
  downloadUrl: z.string().url().max(2000),
  clientId: z.string().uuid('Invalid download client ID'),
  title: z.string().min(1).max(500),
  seriesId: z.string().uuid().optional(),
  volumeNumber: z.number().int().positive().optional(),
  indexerName: z.string().max(255).optional(),
  releaseTitle: z.string().max(500).optional(),
  size: z.number().int().positive().optional(),
});

/**
 * POST /api/monitoring/download
 * Send a search result to a configured download client.
 *
 * Body:
 *   downloadUrl   - magnet link or NZB URL from an indexer result
 *   clientId      - UUID of the download client to use
 *   title         - human-readable book/volume title
 *   seriesId      - optional series UUID for queue association
 *   volumeNumber  - optional volume number
 *   indexerName   - optional name of the source indexer
 *   releaseTitle  - optional exact release name from the indexer
 *   size          - optional file size in bytes
 *
 * Note: The actual client dispatch logic will be wired up via
 * DownloadClientService once that service is implemented. The route creates
 * a download_queue row in 'searching' state immediately and will transition
 * it to 'snatched' once the client service confirms dispatch.
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
    const input = downloadRequestSchema.parse(body);

    // Verify the referenced download client belongs to this user.
    const client = await monitoringService.getDownloadClientById(
      input.clientId,
      session.user.id
    );

    if (!client) {
      return NextResponse.json(
        { error: 'Download client not found' },
        { status: 404 }
      );
    }

    if (!client.enabled) {
      return NextResponse.json(
        { error: 'Download client is disabled' },
        { status: 422 }
      );
    }

    // Create a download queue entry immediately so the UI can track progress.
    const [queueEntry] = await db
      .insert(downloadQueue)
      .values({
        userId: session.user.id,
        seriesId: input.seriesId ?? null,
        bookTitle: input.title,
        volumeNumber: input.volumeNumber ?? null,
        indexerName: input.indexerName ?? null,
        downloadClientId: input.clientId,
        downloadUrl: input.downloadUrl,
        releaseTitle: input.releaseTitle ?? null,
        size: input.size ?? null,
        status: 'searching',
      })
      .returning();

    const manager = new DownloadClientManager();
    let sendError: string | null = null;

    try {
      const sendResult = await manager.sendToClient(
        input.clientId,
        input.downloadUrl,
        input.title
      );

      await db
        .update(downloadQueue)
        .set({ status: 'snatched', externalId: sendResult.remoteId, updatedAt: new Date() })
        .where(eq(downloadQueue.id, queueEntry.id));
    } catch (err) {
      sendError = err instanceof Error ? err.message : String(err);

      await db
        .update(downloadQueue)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(downloadQueue.id, queueEntry.id));

      logger.error(
        'DownloadClientManager.sendToClient failed',
        err instanceof Error ? err : new Error(String(err)),
        { queueId: queueEntry.id, clientId: input.clientId }
      );
    }

    logger.info('Download queued', {
      userId: session.user.id,
      queueId: queueEntry.id,
      clientId: input.clientId,
      clientType: client.type,
      title: input.title,
    });

    await monitoringService.logActivity({
      userId: session.user.id,
      eventType: 'download_started',
      entityType: input.seriesId ? 'series' : 'book',
      entityId: input.seriesId ?? queueEntry.id,
      entityName: input.title,
      details: {
        queueId: queueEntry.id,
        clientName: client.name,
        clientType: client.type,
        volumeNumber: input.volumeNumber,
        releaseTitle: input.releaseTitle,
        size: input.size,
      },
    });

    // Re-fetch the queue entry so the response reflects the final status
    // ('snatched' on success, 'failed' on dispatch error).
    const [updatedEntry] = await db
      .select()
      .from(downloadQueue)
      .where(eq(downloadQueue.id, queueEntry.id))
      .limit(1);

    return NextResponse.json(
      {
        success: sendError === null,
        queueEntry: updatedEntry ?? queueEntry,
        ...(sendError !== null && { error: sendError }),
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('POST /api/monitoring/download error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
