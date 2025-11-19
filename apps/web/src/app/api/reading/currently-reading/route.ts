import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ReadingProgressService } from '@/lib/services/reading-progress';

const readingProgressService = new ReadingProgressService();

/**
 * GET /api/reading/currently-reading
 * Get currently reading books for the user
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const books = await readingProgressService.getCurrentlyReading(session.user.id);

    return NextResponse.json(books);
  } catch (error) {
    logger.error('Get currently reading error:', error as Error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get currently reading books' },
      { status: 500 }
    );
  }
}
