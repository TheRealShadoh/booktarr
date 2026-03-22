import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@booktarr/database';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let dbInstance: DrizzleDb | null = null;
let clientInstance: ReturnType<typeof postgres> | null = null;

function initializeDb() {
  if (dbInstance) return;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  clientInstance = postgres(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: 'require',
  });

  dbInstance = drizzle(clientInstance, { schema });
}

export const db = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    if (!dbInstance) initializeDb();
    return (dbInstance as unknown as Record<string, unknown>)[prop as string];
  },
}) as DrizzleDb;

export const dbClient = new Proxy({} as ReturnType<typeof postgres>, {
  get(_, prop) {
    if (!clientInstance) initializeDb();
    return (clientInstance as unknown as Record<string, unknown>)[prop as string];
  },
}) as ReturnType<typeof postgres>;
