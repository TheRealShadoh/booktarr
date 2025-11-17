/**
 * Security headers configuration
 * Implements OWASP security best practices
 */

export interface SecurityHeaders {
  [key: string]: string;
}

/**
 * Get security headers for the application
 */
export function getSecurityHeaders(): SecurityHeaders {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline/eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:", // Allow images from HTTPS sources
      "font-src 'self' data:",
      "connect-src 'self' https://books.googleapis.com https://openlibrary.org",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),

    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Enable XSS filter
    'X-XSS-Protection': '1; mode=block',

    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions policy (formerly Feature Policy)
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
    ].join(', '),

    // HTTPS only in production
    ...(isProd && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }),
  };
}

/**
 * CORS configuration
 */
export function getCorsHeaders(origin?: string): SecurityHeaders {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  const isAllowed = origin && allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}
