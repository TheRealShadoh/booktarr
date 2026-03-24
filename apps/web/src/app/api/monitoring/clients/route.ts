import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MonitoringService } from '@/lib/services/monitoring';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const monitoringService = new MonitoringService();

const createClientSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['deluge', 'sabnzbd', 'transmission', 'qbittorrent', 'nzbget']),
  host: z.string().url().max(1000),
  username: z.string().max(255).optional(),
  password: z.string().max(255).optional(),
  apiKey: z.string().max(255).optional(),
  category: z.string().max(100).default('books'),
  priority: z.number().int().min(0).max(100).default(0),
  enabled: z.boolean().default(true),
});

/**
 * GET /api/monitoring/clients
 * List all download clients configured for the authenticated user,
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

    const clients = await monitoringService.listDownloadClients(session.user.id);

    // Mask passwords and API keys before returning to the client.
    const masked = clients.map((c) => ({
      ...c,
      password: c.password ? '••••••••' : null,
      apiKey: c.apiKey ? '••••••••' : null,
    }));

    return NextResponse.json({ items: masked, total: masked.length });
  } catch (error) {
    logger.error('GET /api/monitoring/clients error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}

/**
 * POST /api/monitoring/clients
 * Create a new download client configuration for the authenticated user.
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
    const input = createClientSchema.parse(body);

    const created = await monitoringService.createDownloadClient(
      session.user.id,
      input
    );

    logger.info('Download client created', {
      userId: session.user.id,
      clientId: created.id,
      type: created.type,
    });

    return NextResponse.json(
      {
        ...created,
        password: created.password ? '••••••••' : null,
        apiKey: created.apiKey ? '••••••••' : null,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('POST /api/monitoring/clients error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
