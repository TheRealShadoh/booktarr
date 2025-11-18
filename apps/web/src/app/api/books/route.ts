import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BookService } from '@/lib/services/books';

const bookService = new BookService();

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const author = searchParams.get('author') || undefined;
    const readingStatus = searchParams.get('readingStatus') || undefined;
    const format = searchParams.get('format') || undefined;
    const minRating = searchParams.get('minRating')
      ? parseFloat(searchParams.get('minRating')!)
      : undefined;
    const yearMin = searchParams.get('yearMin')
      ? parseInt(searchParams.get('yearMin')!, 10)
      : undefined;
    const yearMax = searchParams.get('yearMax')
      ? parseInt(searchParams.get('yearMax')!, 10)
      : undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await bookService.getUserBooks(session.user.id, {
      status,
      search,
      author,
      readingStatus,
      format,
      minRating,
      yearMin,
      yearMax,
      limit,
      offset,
    });

    return NextResponse.json({
      books: result.books,
      pagination: {
        limit,
        offset,
        total: result.total,
      },
    });
  } catch (error) {
    console.error('GET /api/books error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const result = await bookService.createBook({
      ...body,
      userId: session.user.id,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/books error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
