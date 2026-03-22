import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@booktarr/database';
import { handleError, Errors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();

    const allUsers = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users);

    // Exclude current user from the list
    const otherUsers = allUsers.filter((u) => u.id !== session.user.id);

    return NextResponse.json({ users: otherUsers });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
