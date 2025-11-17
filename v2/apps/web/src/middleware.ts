import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { monitor } from '@/lib/monitoring';

/**
 * Middleware for request logging and monitoring
 */
export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    userAgent: request.headers.get('user-agent'),
  });

  // Clone the request to add custom headers
  const response = NextResponse.next();
  response.headers.set('X-Request-ID', requestId);

  // Log response
  const duration = Date.now() - startTime;
  monitor.trackApiRequest({
    method: request.method,
    path: request.nextUrl.pathname,
    statusCode: response.status,
    duration,
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
