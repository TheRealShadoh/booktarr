import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ShareService } from '@/lib/services/shares';
import { updateShareSchema } from '@/lib/validators/shares';
import { handleError, Errors } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const shareService = new ShareService();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();

    const { id } = await params;
    const body = await req.json();
    const { action } = updateShareSchema.parse(body);

    const share = await shareService.updateShareStatus(id, session.user.id, action);

    logger.info('Library share updated', {
      shareId: id,
      userId: session.user.id,
      action,
    });

    return NextResponse.json(share);
  } catch (error) {
    return handleError(error).toResponse();
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();

    const { id } = await params;
    const share = await shareService.revokeShare(id, session.user.id);

    logger.info('Library share revoked', {
      shareId: id,
      userId: session.user.id,
    });

    return NextResponse.json(share);
  } catch (error) {
    return handleError(error).toResponse();
  }
}
