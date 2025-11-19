import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BookService } from '@/lib/services/books';

const bookService = new BookService();

export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await bookService.clearAllBooks(session.user.id);

    return NextResponse.json({
      success: true,
      message: 'All books have been removed from your library'
    });
  } catch (error) {
    logger.error('DELETE /api/books/clear error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
