import { neon, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleServerless } from 'drizzle-orm/neon-serverless';
import * as schema from '@booktarr/database';

// Use the serverless WebSocket driver for full query support (joins, subqueries)
// The HTTP driver doesn't handle column name conflicts in joins properly
type DbInstance = ReturnType<typeof drizzleServerless<typeof schema>>;

let dbInstance: DbInstance | null = null;

function getDb(): DbInstance {
  if (dbInstance) return dbInstance;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  dbInstance = drizzleServerless(pool, { schema });
  return dbInstance;
}

/**
 * Database instance - uses Neon serverless WebSocket driver
 * Supports full Drizzle ORM query capabilities (joins, relational queries)
 * Lazy-initialized on first access to avoid build-time errors
 */
export const db = new Proxy({} as DbInstance, {
  get(_, prop) {
    const instance = getDb();
    return (instance as unknown as Record<string, unknown>)[prop as string];
  },
}) as DbInstance;
