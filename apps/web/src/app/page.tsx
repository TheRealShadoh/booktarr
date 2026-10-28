import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Force dynamic rendering so environment variables are available at runtime
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let signedIn = false;

  try {
    const session = await auth();
    signedIn = !!session;
  } catch (error) {
    // If auth fails (e.g., database connection error), fall through to login.
    // NOTE: redirect() must be called outside the try/catch — it works by
    // throwing a NEXT_REDIRECT error that a catch block would swallow.
    logger.error('Auth error:', error instanceof Error ? error : new Error(String(error)));
  }

  redirect(signedIn ? '/library' : '/login');
}
