import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@booktarr/database';
import { registerSchema } from '@/lib/validators/auth';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { handleError, Errors } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST to register', methods: ['POST'] },
    { status: 200 }
  );
}

export async function POST(req: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error: 'Database not configured. Please set DATABASE_URL environment variable.',
          setupRequired: true,
        },
        { status: 503 }
      );
    }

    // Rate limiting (3 per hour)
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await rateLimit(identifier, 'register');

    if (!rateLimitResult.success) {
      throw Errors.rateLimitExceeded(rateLimitResult.retryAfter);
    }

    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hash(validatedData.password, 12);

    const [newUser] = await db
      .insert(users)
      .values({
        email: validatedData.email,
        name: validatedData.name || null,
        passwordHash,
        role: 'user',
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      });

    logger.info('User registered successfully', {
      userId: newUser.id,
      email: newUser.email,
    });

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Registration error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
