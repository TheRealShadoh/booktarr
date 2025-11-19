import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BookService } from '@/lib/services/books';
import { bookSearchParamsSchema, createBookSchema } from '@/lib/validators/book';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const bookService = new BookService();

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

    const { searchParams } = new URL(req.url);

    // Convert search params to object and validate
    const rawParams = {
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      author: searchParams.get('author') || undefined,
      readingStatus: searchParams.get('readingStatus') || undefined,
      format: searchParams.get('format') || undefined,
      minRating: searchParams.get('minRating')
        ? parseFloat(searchParams.get('minRating')!)
        : undefined,
      yearMin: searchParams.get('yearMin')
        ? parseInt(searchParams.get('yearMin')!, 10)
        : undefined,
      yearMax: searchParams.get('yearMax')
        ? parseInt(searchParams.get('yearMax')!, 10)
        : undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : undefined,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : undefined,
    };

    // Validate with Zod (will use defaults)
    const validatedParams = bookSearchParamsSchema.parse(rawParams);

    const result = await bookService.getUserBooks(session.user.id, validatedParams);

    return NextResponse.json({
      books: result.books,
      pagination: {
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        total: result.total,
      },
    });
  } catch (error) {
    logger.error('GET /api/books error:', error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();

    // Validate with Zod
    const validatedData = createBookSchema.parse(body);

    const result = await bookService.createBook({
      ...validatedData,
      userId: session.user.id,
    });

    logger.info('Book created', {
      userId: session.user.id,
      bookId: result.id,
      title: result.title,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error('POST /api/books error:', error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
