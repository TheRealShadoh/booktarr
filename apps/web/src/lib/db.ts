import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@booktarr/database';

// Use the Neon type as the canonical DB interface — both drivers are
// API-compatible at runtime, and this avoids union-type overload issues.
type DbInstance = ReturnType<typeof drizzleNeon<typeof schema>>;

let dbInstance: DbInstance | null = null;

/** Neon URLs use their pooler hostname */
function isNeonUrl(url: string): boolean {
  return url.includes('neon.tech') || url.includes('neon.database');
}

function getDb(): DbInstance {
  if (dbInstance) return dbInstance;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const url = process.env.DATABASE_URL;

  if (isNeonUrl(url)) {
    // Neon serverless HTTP driver (used on Vercel)
    dbInstance = drizzleNeon(url, { schema });
  } else {
    // Standard postgres-js driver (local Docker, self-hosted)
    const client = postgres(url, { max: 10, idle_timeout: 20 });
    dbInstance = drizzlePostgres(client, { schema }) as unknown as DbInstance;
  }

  return dbInstance;
}

export const db = new Proxy({} as DbInstance, {
  get(_, prop) {
    const instance = getDb();
    return (instance as unknown as Record<string, unknown>)[prop as string];
  },
}) as DbInstance;
