/**
 * Rate Limiting Utility
 * Uses rate-limiter-flexible for production-grade rate limiting
 */

import { RateLimiterMemory } from 'rate-limiter-flexible';
import { logger } from './logger';

/**
 * Rate limiter configurations
 */
const rateLimiters = {
  // Strict rate limiting for authentication endpoints (5 attempts per 15 min)
  login: new RateLimiterMemory({
    points: 5,
    duration: 900, // 15 minutes
    blockDuration: 900, // Block for 15 minutes after limit
  }),

  // Moderate rate limiting for registration (3 per hour)
  register: new RateLimiterMemory({
    points: 3,
    duration: 3600, // 1 hour
    blockDuration: 3600,
  }),

  // General API rate limiting (100 requests per minute)
  api: new RateLimiterMemory({
    points: 100,
    duration: 60, // 1 minute
  }),

  // Stricter limit for expensive search operations (20 per minute)
  search: new RateLimiterMemory({
    points: 20,
    duration: 60,
  }),

  // Very strict for bulk operations (5 per 10 minutes)
  bulk: new RateLimiterMemory({
    points: 5,
    duration: 600,
  }),
};

/**
 * Rate limit types
 */
export type RateLimiterType = keyof typeof rateLimiters;

/**
 * Rate limit result
 */
export interface RateLimitResult {
  success: boolean;
  remaining?: number;
  resetAt?: Date;
  retryAfter?: number; // seconds
}

/**
 * Apply rate limiting
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param limiterType - Type of rate limiter to use
 * @returns Rate limit result
 */
export async function rateLimit(
  identifier: string,
  limiterType: RateLimiterType = 'api'
): Promise<RateLimitResult> {
  try {
    const limiter = rateLimiters[limiterType];
    const result = await limiter.consume(identifier);

    return {
      success: true,
      remaining: result.remainingPoints,
      resetAt: new Date(Date.now() + result.msBeforeNext),
    };
  } catch (error: any) {
    // Rate limit exceeded
    const retryAfter = Math.ceil(error.msBeforeNext / 1000);

    logger.warn('Rate limit exceeded', {
      identifier,
      limiterType,
      retryAfter,
    });

    return {
      success: false,
      retryAfter,
      resetAt: new Date(Date.now() + error.msBeforeNext),
    };
  }
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header if available, falls back to direct IP
 * @param request - Next.js request object
 * @returns Client identifier (IP address)
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (for reverse proxy/load balancer)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',');
    return ips[0].trim();
  }

  // Try other common headers
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to connection remote address (not available in Edge runtime)
  // For serverless/edge, we might not have direct access to IP
  // In that case, use a fallback that won't block legitimate users
  return 'unknown-client';
}

/**
 * Rate limit middleware wrapper
 * Use this to wrap API route handlers with rate limiting
 */
export function withRateLimit(
  limiterType: RateLimiterType,
  handler: (request: Request) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    const identifier = getClientIdentifier(request);
    const result = await rateLimit(identifier, limiterType);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: result.retryAfter,
          resetAt: result.resetAt,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(result.retryAfter),
            'X-RateLimit-Reset': result.resetAt?.toISOString() || '',
          },
        }
      );
    }

    // Add rate limit headers to response
    const response = await handler(request);

    // Clone response to add headers
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Limit', String(rateLimiters[limiterType].points));
    headers.set('X-RateLimit-Remaining', String(result.remaining || 0));
    headers.set('X-RateLimit-Reset', result.resetAt?.toISOString() || '');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
