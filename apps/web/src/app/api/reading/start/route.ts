import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ReadingProgressService } from '@/lib/services/reading-progress';

const readingProgressService = new ReadingProgressService();

/**
 * POST /api/reading/start
 * Start reading a book
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { bookId, totalPages } = body;

    if (!bookId) {
      return NextResponse.json({ error: 'Missing bookId' }, { status: 400 });
    }

    const progress = await readingProgressService.startReading(
      session.user.id,
      bookId,
      totalPages
    );

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Start reading error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start reading' },
      { status: 500 }
    );
  }
}
