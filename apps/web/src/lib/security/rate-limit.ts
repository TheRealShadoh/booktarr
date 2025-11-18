/**
 * Rate limiting for API endpoints
 * Prevents abuse and DDoS attacks
 */

import { RateLimiterMemory } from 'rate-limiter-flexible';

// Different rate limits for different endpoint types
const rateLimiters = {
  // General API endpoints: 100 requests per minute
  api: new RateLimiterMemory({
    points: 100,
    duration: 60,
  }),

  // Authentication endpoints: 5 attempts per 15 minutes
  auth: new RateLimiterMemory({
    points: 5,
    duration: 900, // 15 minutes
  }),

  // Search endpoints: 30 requests per minute
  search: new RateLimiterMemory({
    points: 30,
    duration: 60,
  }),

  // File uploads: 10 per hour
  upload: new RateLimiterMemory({
    points: 10,
    duration: 3600,
  }),
};

export type RateLimitType = keyof typeof rateLimiters;

export interface RateLimitResult {
  allowed: boolean;
  remainingPoints: number;
  msBeforeNext: number;
}

/**
 * Check if a request is rate limited
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'api'
): Promise<RateLimitResult> {
  const limiter = rateLimiters[type];

  try {
    const result = await limiter.consume(identifier);
    return {
      allowed: true,
      remainingPoints: result.remainingPoints,
      msBeforeNext: result.msBeforeNext,
    };
  } catch (error: any) {
    if (error.remainingPoints !== undefined) {
      return {
        allowed: false,
        remainingPoints: error.remainingPoints,
        msBeforeNext: error.msBeforeNext,
      };
    }
    throw error;
  }
}

/**
 * Get identifier for rate limiting
 * Uses IP address or user ID
 */
export function getRateLimitIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Get IP from headers (works with proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  return forwardedFor?.split(',')[0] || realIp || 'unknown';
}
