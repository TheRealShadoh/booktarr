import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MetadataService } from '@/lib/services/metadata';

const metadataService = new MetadataService();

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isbn, title, author } = await req.json();

    if (!isbn && !title) {
      return NextResponse.json(
        { error: 'Either ISBN or title is required' },
        { status: 400 }
      );
    }

    let results;

    if (isbn) {
      const metadata = await metadataService.enrichByISBN(isbn);
      results = metadata ? [metadata] : [];
    } else {
      results = await metadataService.searchByTitle(title, author);
    }

    return NextResponse.json({ results });
  } catch (error) {
    logger.error('POST /api/books/search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
