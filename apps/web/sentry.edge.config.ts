/**
 * Sentry Edge Runtime Configuration
 * This file configures Sentry for Edge Runtime (middleware)
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,

  // Adjust this value in production
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console
  debug: false,

  // Edge runtime has limited integrations
  integrations: [],

  beforeSend(event, hint) {
    // Filter out development errors
    if (ENVIRONMENT === 'development') {
      return null;
    }

    return event;
  },
});
