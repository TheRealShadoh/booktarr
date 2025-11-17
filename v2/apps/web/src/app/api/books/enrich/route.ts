import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BookService } from '@/lib/services/books';

const bookService = new BookService();

/**
 * GET /api/books/enrich
 * Check how many books need enrichment
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const booksNeedingEnrichment = await bookService.getBooksNeedingEnrichment(100);

    return NextResponse.json({
      count: booksNeedingEnrichment.length,
      books: booksNeedingEnrichment.map(({ book, edition }) => ({
        id: book.id,
        title: book.title,
        isbn: edition.isbn13 || edition.isbn10,
        missingFields: {
          description: !book.description,
          cover: !edition.coverUrl,
          pageCount: !book.pageCount,
          publisher: !book.publisher,
        },
      })),
    });
  } catch (error) {
    console.error('GET /api/books/enrich error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/books/enrich
 * Trigger enrichment process for books with missing metadata
 */
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const batchSize = parseInt(searchParams.get('batchSize') || '10');

    console.log(`[Enrichment] Starting batch enrichment (batch size: ${batchSize})`);

    const result = await bookService.enrichBooksInBatch(batchSize);

    console.log(`[Enrichment] Batch complete:`, result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('POST /api/books/enrich error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
