import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@booktarr/database';
import { logger } from './logger';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Log connection initialization (no sensitive data)
logger.info('Initializing database connection', {
  poolSize: parseInt(process.env.DB_POOL_SIZE || '20', 10),
  environment: process.env.NODE_ENV,
});

// Create PostgreSQL connection with production-ready settings
const client = postgres(process.env.DATABASE_URL, {
  max: parseInt(process.env.DB_POOL_SIZE || '20', 10),
  idle_timeout: 30,
  connect_timeout: 15,
  onnotice: (notice) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('PostgreSQL notice', { notice: notice.message });
    }
  },
});

// Export Drizzle instance
export const db = drizzle(client, { schema });

// Export connection client for health checks
export const dbClient = client;
