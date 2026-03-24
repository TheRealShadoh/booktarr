import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MonitoringService } from '@/lib/services/monitoring';
import { DownloadClientManager, type ClientTestConfig, type DownloadClientType } from '@/lib/services/download-clients';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const monitoringService = new MonitoringService();

const clientIdParamSchema = z.object({
  id: z.string().uuid('Invalid client ID'),
});

/**
 * POST /api/monitoring/clients/[id]/test
 * Test connectivity to a download client by attempting a lightweight
 * handshake using the client's configured credentials.
 *
 * Note: The actual connectivity probe will be wired up via DownloadClientService.
 * The route structure, auth, and ownership checks are complete and ready for
 * integration.
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

    // Use the bulk bucket — connection tests are infrequent but each one
    // makes an outbound network request.
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
    const { id: validatedId } = clientIdParamSchema.parse({ id });

    const client = await monitoringService.getDownloadClientById(
      validatedId,
      session.user.id
    );

    if (!client) {
      return NextResponse.json({ error: 'Download client not found' }, { status: 404 });
    }

    logger.info('Download client test requested', {
      userId: session.user.id,
      clientId: validatedId,
      clientType: client.type,
      host: client.host,
    });

    const manager = new DownloadClientManager();
    const testConfig: ClientTestConfig = {
      type: client.type as DownloadClientType,
      host: client.host,
      password: client.password,
      apiKey: client.apiKey,
    };

    let success = false;
    let message: string;

    try {
      success = await manager.testClient(testConfig);
      message = success ? 'Connection successful.' : 'Connection test returned a negative result.';
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }

    return NextResponse.json({
      success,
      message,
      clientId: validatedId,
      clientType: client.type,
    });
  } catch (error) {
    const { id } = await params;
    logger.error(`POST /api/monitoring/clients/${id}/test error:`, error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
