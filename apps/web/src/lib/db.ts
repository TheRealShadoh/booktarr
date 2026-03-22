import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@booktarr/database';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let dbInstance: DrizzleDb | null = null;

function getDb(): DrizzleDb {
  if (dbInstance) return dbInstance;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Use postgres.js with serverless-friendly settings
  // max:1 prevents connection pool issues on serverless
  const client = postgres(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 0,
    connect_timeout: 10,
    ssl: 'require',
    prepare: false, // Required for Neon connection pooler
  });

  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

/**
 * Database instance - uses postgres.js with Neon-compatible settings
 * Lazy-initialized on first access to avoid build-time errors
 */
export const db = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    const instance = getDb();
    return (instance as unknown as Record<string, unknown>)[prop as string];
  },
}) as DrizzleDb;
