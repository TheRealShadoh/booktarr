import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BookService } from '@/lib/services/books';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const bookService = new BookService();

/**
 * GET /api/books/enrich
 * Check how many books need enrichment
 */
export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await rateLimit(identifier, 'api');

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Reset': rateLimitResult.resetAt?.toISOString() || '',
          },
        }
      );
    }

    const booksNeedingEnrichment = await bookService.getBooksNeedingEnrichment(100);

    logger.info('Books needing enrichment checked', {
      userId: session.user.id,
      count: booksNeedingEnrichment.length,
    });

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
    logger.error('GET /api/books/enrich error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
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

    // Apply bulk operation rate limiting (5 per 10 minutes)
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await rateLimit(identifier, 'bulk');

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many bulk enrichment requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Reset': rateLimitResult.resetAt?.toISOString() || '',
          },
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const batchSize = Math.min(
      parseInt(searchParams.get('batchSize') || '10'),
      50 // Max batch size
    );

    logger.info('Starting batch enrichment', {
      userId: session.user.id,
      batchSize,
    });

    const result = await bookService.enrichBooksInBatch(batchSize);

    logger.info('Batch enrichment complete', {
      userId: session.user.id,
      ...result,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('POST /api/books/enrich error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
