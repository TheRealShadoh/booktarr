import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ReadingProgressService } from '@/lib/services/reading-progress';

const readingProgressService = new ReadingProgressService();

/**
 * GET /api/reading/stats
 * Get reading statistics for the user
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await readingProgressService.getReadingStats(session.user.id);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Get reading stats error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get reading stats' },
      { status: 500 }
    );
  }
}
