import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { SeriesService } from '@/lib/services/series';
import { handleError, Errors } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

const seriesService = new SeriesService();

const addBookSchema = z.object({
  bookId: z.string().uuid('bookId must be a valid UUID'),
  volumeNumber: z.number({ message: 'volumeNumber is required' }),
  volumeName: z.string().optional(),
  partNumber: z.number().optional(),
  arcName: z.string().optional(),
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

    const { id } = await params;
    const body = await req.json();
    const validated = addBookSchema.parse(body);

    const seriesBook = await seriesService.addBookToSeries({
      seriesId: id,
      ...validated,
    });

    return NextResponse.json(seriesBook, { status: 201 });
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

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      throw Errors.badRequest('bookId is required');
    }

    await seriesService.removeBookFromSeries(id, bookId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
