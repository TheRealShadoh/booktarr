import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MetadataService } from '@/lib/services/metadata';
import { bookSearchSchema } from '@/lib/validators/book';
import { handleError } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const metadataService = new MetadataService();

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply stricter rate limiting for search (20 per minute)
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await rateLimit(identifier, 'search');

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many search requests. Please try again later.',
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
    const validatedData = bookSearchSchema.parse(body);

    let results: any[] = [];

    if (validatedData.isbn) {
      const metadata = await metadataService.enrichByISBN(validatedData.isbn);
      results = metadata ? [metadata] : [];
    } else if (validatedData.title) {
      results = await metadataService.searchByTitle(
        validatedData.title,
        validatedData.author
      );
    } else {
      results = [];
    }

    logger.info('Book search completed', {
      userId: session.user.id,
      isbn: validatedData.isbn,
      title: validatedData.title,
      resultsCount: results.length,
    });

    return NextResponse.json({ results });
  } catch (error) {
    logger.error('POST /api/books/search error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
