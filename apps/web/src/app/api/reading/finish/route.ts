import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ReadingProgressService } from '@/lib/services/reading-progress';

const readingProgressService = new ReadingProgressService();

/**
 * POST /api/reading/finish
 * Finish reading a book
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { bookId, rating, review } = body;

    if (!bookId) {
      return NextResponse.json({ error: 'Missing bookId' }, { status: 400 });
    }

    const progress = await readingProgressService.finishReading(
      session.user.id,
      bookId,
      rating,
      review
    );

    return NextResponse.json(progress);
  } catch (error) {
    logger.error('Finish reading error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to finish reading' },
      { status: 500 }
    );
  }
}
