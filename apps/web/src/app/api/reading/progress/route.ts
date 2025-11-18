import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ReadingProgressService } from '@/lib/services/reading-progress';

const readingProgressService = new ReadingProgressService();

/**
 * GET /api/reading/progress
 * Get reading progress for a book
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('bookId');
    const status = searchParams.get('status');

    // If bookId is provided, get progress for that specific book
    if (bookId) {
      const progress = await readingProgressService.getProgressForBook(session.user.id, bookId);
      return NextResponse.json(progress);
    }

    // If status is provided, get books by that status
    if (status) {
      const books = await readingProgressService.getBooksByStatus(
        session.user.id,
        status as any
      );
      return NextResponse.json(books);
    }

    return NextResponse.json({ error: 'Missing bookId or status parameter' }, { status: 400 });
  } catch (error) {
    console.error('Get reading progress error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get reading progress' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reading/progress
 * Create or update reading progress
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { bookId, status, currentPage, totalPages, rating, review, reviewPublic } = body;

    if (!bookId) {
      return NextResponse.json({ error: 'Missing bookId' }, { status: 400 });
    }

    // Get or create progress first
    await readingProgressService.getOrCreateProgress(session.user.id, bookId);

    // Then update it
    const progress = await readingProgressService.updateProgress(session.user.id, bookId, {
      status,
      currentPage,
      totalPages,
      rating,
      review,
      reviewPublic,
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Update reading progress error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update reading progress' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reading/progress
 * Delete reading progress
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json({ error: 'Missing bookId' }, { status: 400 });
    }

    await readingProgressService.deleteProgress(session.user.id, bookId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete reading progress error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete reading progress' },
      { status: 500 }
    );
  }
}
