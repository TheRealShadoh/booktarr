import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/**/*.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://booktarr:booktarr@localhost:5432/booktarr',
  },
  verbose: true,
  strict: true,
});
