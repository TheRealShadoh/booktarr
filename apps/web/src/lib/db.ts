import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@booktarr/database';

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (dbInstance) return dbInstance;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(process.env.DATABASE_URL);
  dbInstance = drizzle(sql, { schema });
  return dbInstance;
}

/**
 * Database instance - uses Neon serverless HTTP driver
 * Works in both Vercel serverless and container environments
 * Lazy-initialized on first access to avoid build-time errors
 */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    const instance = getDb();
    return (instance as unknown as Record<string, unknown>)[prop as string];
  },
}) as ReturnType<typeof drizzle<typeof schema>>;
