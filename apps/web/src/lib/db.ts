import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@booktarr/database';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

console.log('[DB] DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
console.log('[DB] All env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE')));

// Create PostgreSQL connection
const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Export Drizzle instance
export const db = drizzle(client, { schema });
