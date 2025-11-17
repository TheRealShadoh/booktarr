import { NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/security/rate-limit';
import { isValidEmail } from '@/lib/security/validation';
import { logger } from '@/lib/logger';

/**
 * Login endpoint with rate limiting
 */
export async function POST(req: Request) {
  try {
    // Check rate limit
    const identifier = getRateLimitIdentifier(req);
    const rateLimit = await checkRateLimit(identifier, 'auth');

    if (!rateLimit.allowed) {
      logger.warn('Rate limit exceeded for login', {
        identifier,
        msBeforeNext: rateLimit.msBeforeNext,
      });

      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil(rateLimit.msBeforeNext / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(rateLimit.msBeforeNext / 1000).toString(),
          },
        }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Login logic would go here
    // This is a placeholder - actual auth handled by NextAuth

    return NextResponse.json({
      message: 'Login endpoint - use NextAuth for authentication',
    });
  } catch (error) {
    logger.error('Login error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
