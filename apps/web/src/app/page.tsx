import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

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
    console.error('Auth error:', error);
    redirect('/login');
  }
}
