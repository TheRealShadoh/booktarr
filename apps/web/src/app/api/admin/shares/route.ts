import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ShareService } from '@/lib/services/shares';
import { adminForceShareSchema } from '@/lib/validators/shares';
import { handleError, Errors } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const shareService = new ShareService();

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();
    if (session.user.role !== 'admin') throw Errors.forbidden('Admin access required');

    const body = await req.json();
    const { ownerEmail, recipientEmail, permission } = adminForceShareSchema.parse(body);

    const share = await shareService.adminForceShare(ownerEmail, recipientEmail, permission);

    logger.info('Admin force share created', {
      adminId: session.user.id,
      ownerEmail,
      recipientEmail,
      permission,
    });

    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
