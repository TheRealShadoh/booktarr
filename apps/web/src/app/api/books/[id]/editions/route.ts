import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { BookService } from '@/lib/services/books';
import { handleError, Errors } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

const bookService = new BookService();

const editionStatusSchema = z.object({
  editionId: z.string().min(1, 'Edition ID is required'),
  status: z.enum(['owned', 'wanted', 'missing'], {
    message: 'Invalid status. Must be: owned, wanted, or missing',
  }),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    await params; // ensure params are resolved (bookId available via route context)
    const body = await req.json();
    const { editionId, status } = editionStatusSchema.parse(body);

    const userBook = await bookService.addEditionToCollection(
      session.user.id,
      editionId,
      status
    );

    return NextResponse.json({ success: true, userBook }, { status: 201 });
  } catch (error) {
    return handleError(error).toResponse();
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    await params; // ensure params are resolved (bookId available via route context)
    const body = await req.json();
    const { editionId, status } = editionStatusSchema.parse(body);

    const userBook = await bookService.updateEditionStatus(
      session.user.id,
      editionId,
      status
    );

    return NextResponse.json({ success: true, userBook });
  } catch (error) {
    return handleError(error).toResponse();
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    await params; // ensure params are resolved (bookId available via route context)
    const { searchParams } = new URL(req.url);
    const editionId = searchParams.get('editionId');

    if (!editionId) {
      throw Errors.badRequest('Edition ID is required');
    }

    await bookService.removeEditionFromCollection(session.user.id, editionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
