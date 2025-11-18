import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SeriesService } from '@/lib/services/series';

const seriesService = new SeriesService();

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const series = await seriesService.getSeries(session.user.id, {
      search,
      status,
      limit,
      offset,
    });

    return NextResponse.json({
      series,
      pagination: {
        limit,
        offset,
        total: series.length,
      },
    });
  } catch (error) {
    console.error('GET /api/series error:', error);
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

    const series = await seriesService.createSeries(body);

    return NextResponse.json(series, { status: 201 });
  } catch (error) {
    console.error('POST /api/series error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
