import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@booktarr/database';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

console.log('[DB] ========== ENVIRONMENT DEBUG ==========');
console.log('[DB] NODE_ENV:', process.env.NODE_ENV);
console.log('[DB] DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
console.log('[DB] All DATABASE* vars:', Object.keys(process.env).filter(k => k.includes('DATABASE')));
console.log('[DB] All NEXT* vars:', Object.keys(process.env).filter(k => k.startsWith('NEXT')));
console.log('[DB] Total env vars count:', Object.keys(process.env).length);
console.log('[DB] Sample vars:', Object.keys(process.env).slice(0, 10));
console.log('[DB] ==========================================');

// Create PostgreSQL connection
const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Export Drizzle instance
export const db = drizzle(client, { schema });
