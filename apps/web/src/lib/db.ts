import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@booktarr/database';
import ws from 'ws';

// Set WebSocket constructor for Node.js environments
neonConfig.webSocketConstructor = ws;

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

export const db = new Proxy({} as DbInstance, {
  get(_, prop) {
    const instance = getDb();
    return (instance as unknown as Record<string, unknown>)[prop as string];
  },
}) as DbInstance;
