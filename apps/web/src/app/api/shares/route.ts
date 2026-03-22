import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ShareService } from '@/lib/services/shares';
import { createShareSchema } from '@/lib/validators/shares';
import { handleError, Errors } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const shareService = new ShareService();

export async function GET(req: Request) {
  try {
    const clientId = getClientIdentifier(req);
    const rl = await rateLimit(clientId, 'api');
    if (!rl.success) throw Errors.rateLimitExceeded(rl.retryAfter);

    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();

    const shares = await shareService.getSharesForUser(session.user.id);
    return NextResponse.json(shares);
  } catch (error) {
    return handleError(error).toResponse();
  }
}

export async function POST(req: Request) {
  try {
    const clientId = getClientIdentifier(req);
    const rl = await rateLimit(clientId, 'api');
    if (!rl.success) throw Errors.rateLimitExceeded(rl.retryAfter);

    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();

    const body = await req.json();
    const { email, permission } = createShareSchema.parse(body);

    const share = await shareService.createShare(session.user.id, email, permission);

    logger.info('Library share created', {
      ownerId: session.user.id,
      recipientEmail: email,
      permission,
    });

    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
