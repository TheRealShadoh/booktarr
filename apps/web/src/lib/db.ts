import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@booktarr/database';
import { logger } from './logger';

// Lazy initialization to avoid requiring DATABASE_URL during build time
type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let dbInstance: DrizzleDb | null = null;
let clientInstance: postgres.Sql | null = null;

/**
 * Initialize database connection (called automatically on first access)
 */
function initializeDb() {
  if (dbInstance) {
    return; // Already initialized
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Log connection initialization (no sensitive data)
  logger.info('Initializing database connection', {
    poolSize: parseInt(process.env.DB_POOL_SIZE || '20', 10),
    environment: process.env.NODE_ENV,
  });

  // Create PostgreSQL connection with production-ready settings
  // Neon requires SSL, and connection pooler has specific requirements
  clientInstance = postgres(process.env.DATABASE_URL, {
    max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    idle_timeout: 20,
    connect_timeout: 30,
    ssl: 'require',
    onnotice: (notice) => {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('PostgreSQL notice', { notice: notice.message });
      }
    },
  });

  dbInstance = drizzle(clientInstance, { schema });
}

/**
 * Database instance with lazy initialization
 * Automatically initializes on first access
 */
export const db = new Proxy({} as DrizzleDb, {
  get(target, prop) {
    if (!dbInstance) {
      initializeDb();
    }
    return (dbInstance as any)[prop];
  },
}) as DrizzleDb;

/**
 * Database client for health checks
 * Automatically initializes on first access
 */
export const dbClient = new Proxy({} as postgres.Sql, {
  get(target, prop) {
    if (!clientInstance) {
      initializeDb();
    }
    return (clientInstance as any)[prop];
  },
});
