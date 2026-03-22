import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ShareService } from '@/lib/services/shares';
import { handleError, Errors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const shareService = new ShareService();

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();

    const count = await shareService.getPendingCountForUser(session.user.id);
    return NextResponse.json({ count });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
