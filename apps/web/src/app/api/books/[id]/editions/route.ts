import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BookService } from '@/lib/services/books';

const bookService = new BookService();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookId } = await params;
    const body = await req.json();
    const { editionId, status } = body;

    if (!editionId) {
      return NextResponse.json(
        { error: 'Edition ID is required' },
        { status: 400 }
      );
    }

    if (!['owned', 'wanted', 'missing'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: owned, wanted, or missing' },
        { status: 400 }
      );
    }

    const userBook = await bookService.addEditionToCollection(
      session.user.id,
      editionId,
      status
    );

    return NextResponse.json({ success: true, userBook }, { status: 201 });
  } catch (error) {
    logger.error('POST /api/books/[id]/editions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookId } = await params;
    const body = await req.json();
    const { editionId, status } = body;

    if (!editionId) {
      return NextResponse.json(
        { error: 'Edition ID is required' },
        { status: 400 }
      );
    }

    if (!['owned', 'wanted', 'missing'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: owned, wanted, or missing' },
        { status: 400 }
      );
    }

    const userBook = await bookService.updateEditionStatus(
      session.user.id,
      editionId,
      status
    );

    return NextResponse.json({ success: true, userBook });
  } catch (error) {
    logger.error('PATCH /api/books/[id]/editions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookId } = await params;
    const { searchParams } = new URL(req.url);
    const editionId = searchParams.get('editionId');

    if (!editionId) {
      return NextResponse.json(
        { error: 'Edition ID is required' },
        { status: 400 }
      );
    }

    await bookService.removeEditionFromCollection(session.user.id, editionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE /api/books/[id]/editions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
