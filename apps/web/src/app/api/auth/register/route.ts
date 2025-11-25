import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@booktarr/database';
import { eq } from 'drizzle-orm';
import { registerSchema } from '@/lib/validators/auth';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { handleError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    // Apply rate limiting for registration (3 per hour)
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await rateLimit(identifier, 'register');

    if (!rateLimitResult.success) {
      logger.warn('Registration rate limit exceeded', {
        identifier,
        retryAfter: rateLimitResult.retryAfter,
      });

      return NextResponse.json(
        {
          error: 'Too many registration attempts. Please try again later.',
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

    // Validate input with Zod
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email),
    });

    if (existingUser) {
      logger.warn('Registration attempt with existing email', {
        email: validatedData.email,
      });
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hash(validatedData.password, 12);

    // Create user
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
      {
        status: 201,
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.remaining || 0),
          'X-RateLimit-Reset': rateLimitResult.resetAt?.toISOString() || '',
        },
      }
    );
  } catch (error) {
    logger.error('Registration error:', error as Error);
    const apiError = handleError(error);
    return apiError.toResponse();
  }
}
