/**
 * Sentry Server Configuration
 * Error tracking for server-side (Node.js) code
 *
 * To enable Sentry:
 * 1. Install: npm install @sentry/nextjs --workspace=apps/web
 * 2. Set SENTRY_DSN in .env
 * 3. Uncomment the code below
 */

/*
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Lower sample rate on server to reduce load
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive environment variables
      if (event.contexts?.runtime?.env) {
        const env = { ...event.contexts.runtime.env };
        const sensitiveKeys = [
          'DATABASE_URL',
          'NEXTAUTH_SECRET',
          'GOOGLE_CLIENT_SECRET',
          'GITHUB_CLIENT_SECRET',
          'REDIS_PASSWORD',
          'S3_SECRET_ACCESS_KEY',
        ];

        sensitiveKeys.forEach(key => {
          if (env[key]) env[key] = '[Filtered]';
        });

        event.contexts.runtime.env = env;
      }

      // Remove sensitive request data
      if (event.request?.data) {
        const data = { ...event.request.data };
        if (data.password) data.password = '[Filtered]';
        if (data.token) data.token = '[Filtered]';
        if (data.secret) data.secret = '[Filtered]';
        event.request.data = data;
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
    ],

    // Configure integrations
    integrations: [
      // Add PostgreSQL integration if available
      // new Sentry.Integrations.Postgres(),
    ],
  });
}
*/

// Export a no-op if Sentry is not configured
export const sentryEnabled = false;
