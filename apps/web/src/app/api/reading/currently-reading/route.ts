import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ReadingProgressService } from '@/lib/services/reading-progress';
import { handleError, Errors } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

const readingProgressService = new ReadingProgressService();

/**
 * GET /api/reading/currently-reading
 * Get currently reading books for the user
 */
export async function GET(req: Request) {
  try {
    const clientId = getClientIdentifier(req);
    const rateLimitResult = await rateLimit(clientId, 'api');
    if (!rateLimitResult.success) {
      throw Errors.rateLimitExceeded(rateLimitResult.retryAfter);
    }

    const session = await auth();
    if (!session?.user) {
      throw Errors.unauthorized();
    }

    const books = await readingProgressService.getCurrentlyReading(session.user.id);

    return NextResponse.json(books);
  } catch (error) {
    return handleError(error).toResponse();
  }
}
