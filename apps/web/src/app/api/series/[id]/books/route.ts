import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SeriesService } from '@/lib/services/series';
import { logger } from '@/lib/logger';

const seriesService = new SeriesService();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const seriesBook = await seriesService.addBookToSeries({
      seriesId: id,
      ...body,
    });

    return NextResponse.json(seriesBook, { status: 201 });
  } catch (error) {
    const { id } = await params;
    logger.error(`POST /api/series/${id}/books error:`, error as Error);
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

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json(
        { error: 'bookId is required' },
        { status: 400 }
      );
    }

    await seriesService.removeBookFromSeries(id, bookId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const { id } = await params;
    logger.error(`DELETE /api/series/${id}/books error:`, error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
