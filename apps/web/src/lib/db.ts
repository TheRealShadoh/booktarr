import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@booktarr/database';

// Use built-in WebSocket in Node.js 22+ (Vercel default)
// Falls back to ws package if available
if (typeof globalThis.WebSocket === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    neonConfig.webSocketConstructor = require('ws');
  } catch {
    // ws not available, will use built-in WebSocket if Node >= 21
  }
}

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

let dbInstance: DbInstance | null = null;

function getDb(): DbInstance {
  if (dbInstance) return dbInstance;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  dbInstance = drizzle({ client: pool, schema });
  return dbInstance;
}

/**
 * Database instance - uses Neon serverless driver with WebSocket Pool
 * Supports full Drizzle ORM query capabilities including joins
 */
export const db = new Proxy({} as DbInstance, {
  get(_, prop) {
    const instance = getDb();
    return (instance as unknown as Record<string, unknown>)[prop as string];
  },
}) as DbInstance;
