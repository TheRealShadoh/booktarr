/**
 * Database Package Index
 * Main entry point for the @booktarr/database package
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Create database connection
 * @param connectionString PostgreSQL connection string
 * @returns Drizzle database instance
 */
export function createDatabase(connectionString: string) {
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
}

/**
 * Create database client for migrations
 * @param connectionString PostgreSQL connection string
 */
export function createMigrationClient(connectionString: string) {
  return postgres(connectionString, { max: 1 });
}

// Export all schema tables
export * from './schema';

// Export types
export type Database = ReturnType<typeof createDatabase>;
