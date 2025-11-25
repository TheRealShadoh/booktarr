/**
 * Sentry Client Configuration
 * Error tracking for client-side (browser) code
 *
 * To enable Sentry:
 * 1. Install: npm install @sentry/nextjs --workspace=apps/web
 * 2. Set NEXT_PUBLIC_SENTRY_DSN in .env
 * 3. Uncomment the code below
 */

/*
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Tracing
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            const data = { ...breadcrumb.data };
            // Remove password fields
            if (data.password) data.password = '[Filtered]';
            if (data.token) data.token = '[Filtered]';
            if (data.secret) data.secret = '[Filtered]';
            return { ...breadcrumb, data };
          }
          return breadcrumb;
        });
      }

      // Remove sensitive data from request data
      if (event.request?.data) {
        const data = { ...event.request.data };
        if (data.password) data.password = '[Filtered]';
        if (data.token) data.token = '[Filtered]';
        event.request.data = data;
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // Probably not actionable
      'Non-Error promise rejection captured',
    ],

    // Only send errors from our domain in production
    allowUrls: process.env.NODE_ENV === 'production'
      ? [/https?:\/\/(www\.)?yourdomain\.com/]
      : undefined,
  });
}
*/

// Export a no-op if Sentry is not configured
export const sentryEnabled = false;
