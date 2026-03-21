import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Force dynamic rendering so environment variables are available at runtime
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  try {
    const session = await auth();

    if (session) {
      redirect('/library');
    } else {
      redirect('/login');
    }
  } catch (error) {
    // If auth fails (e.g., database connection error), redirect to login
    logger.error('Auth error:', error instanceof Error ? error : new Error(String(error)));
    redirect('/login');
  }
}
