import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@booktarr/database';

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

let dbInstance: DbInstance | null = null;

function getDb(): DbInstance {
  if (dbInstance) return dbInstance;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(process.env.DATABASE_URL);
  dbInstance = drizzle(sql, { schema });
  return dbInstance;
}

/**
 * Database instance - uses Neon HTTP driver
 * IMPORTANT: Only use simple single-table queries or db.select() with
 * explicit column selection. Do NOT use:
 * - db.query.xxx.findMany({ with: ... }) - generates lateral joins
 * - db.select({ table1, table2 }).innerJoin() - column name conflicts
 * Instead: query each table separately and join in application code.
 */
export const db = new Proxy({} as DbInstance, {
  get(_, prop) {
    const instance = getDb();
    return (instance as unknown as Record<string, unknown>)[prop as string];
  },
}) as DbInstance;
