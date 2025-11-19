/**
 * Startup Validation
 * Validates environment and dependencies before application starts
 */

import { db, dbClient } from './db';
import { logger } from './logger';
import { sql } from 'drizzle-orm';

export interface ValidationError {
  component: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate all required environment variables
 */
function validateEnvironment(): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required environment variables
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ];

  for (const envVar of required) {
    if (!process.env[envVar]) {
      errors.push({
        component: 'Environment',
        message: `Missing required environment variable: ${envVar}`,
        severity: 'error',
      });
    }
  }

  // Validate NEXTAUTH_SECRET strength
  if (process.env.NEXTAUTH_SECRET) {
    if (process.env.NEXTAUTH_SECRET.length < 32) {
      errors.push({
        component: 'Security',
        message: 'NEXTAUTH_SECRET must be at least 32 characters for production',
        severity: 'error',
      });
    }

    // Warn about weak defaults
    const weakSecrets = [
      'your_nextauth_secret_here',
      'change_in_production',
      'dev_secret',
      'test_secret',
    ];

    if (weakSecrets.some(weak => process.env.NEXTAUTH_SECRET?.toLowerCase().includes(weak))) {
      errors.push({
        component: 'Security',
        message: 'NEXTAUTH_SECRET appears to be a default/weak value',
        severity: 'error',
      });
    }
  }

  // Validate database URL format
  if (process.env.DATABASE_URL) {
    if (!process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://')) {
      errors.push({
        component: 'Database',
        message: 'DATABASE_URL must be a PostgreSQL connection string',
        severity: 'error',
      });
    }

    // Warn about weak database passwords
    const weakPasswords = ['password', '123456', 'admin', 'booktarr_dev_password'];
    const urlMatch = process.env.DATABASE_URL.match(/:([^@]+)@/);
    if (urlMatch && weakPasswords.some(weak => urlMatch[1].includes(weak))) {
      errors.push({
        component: 'Security',
        message: 'Database password appears to be weak or default',
        severity: process.env.NODE_ENV === 'production' ? 'error' : 'warning',
      });
    }
  }

  // Validate NEXTAUTH_URL format
  if (process.env.NEXTAUTH_URL) {
    try {
      const url = new URL(process.env.NEXTAUTH_URL);

      if (process.env.NODE_ENV === 'production' && url.protocol === 'http:') {
        errors.push({
          component: 'Security',
          message: 'NEXTAUTH_URL must use HTTPS in production',
          severity: 'error',
        });
      }
    } catch (e) {
      errors.push({
        component: 'Environment',
        message: 'NEXTAUTH_URL is not a valid URL',
        severity: 'error',
      });
    }
  }

  // Optional but recommended
  const recommended = [
    'REDIS_URL',
    'S3_ENDPOINT',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY',
  ];

  for (const envVar of recommended) {
    if (!process.env[envVar]) {
      errors.push({
        component: 'Environment',
        message: `Recommended environment variable not set: ${envVar}`,
        severity: 'warning',
      });
    }
  }

  return errors;
}

/**
 * Validate database connection and schema
 */
async function validateDatabase(): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  try {
    // Test connection
    await db.execute(sql`SELECT 1 as healthy`);
    logger.info('Database connection test passed');

    // Check if tables exist (basic schema validation)
    const tableCheckResult = await db.execute(sql`
      SELECT COUNT(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);

    const tableCount = (tableCheckResult[0] as any)?.table_count || 0;

    if (tableCount === 0) {
      errors.push({
        component: 'Database',
        message: 'No tables found in database. Please run migrations.',
        severity: 'error',
      });
    } else {
      logger.info(`Database schema validation passed (${tableCount} tables found)`);
    }

    // Check PostgreSQL version
    const versionResult = await db.execute(sql`SHOW server_version`);
    const version = (versionResult[0] as any)?.server_version;
    logger.info(`PostgreSQL version: ${version}`);

    // Verify required extensions
    const extensionsResult = await db.execute(sql`
      SELECT extname
      FROM pg_extension
      WHERE extname IN ('uuid-ossp', 'pg_trgm')
    `);

    const extensions = extensionsResult.map((row: any) => row.extname);

    if (!extensions.includes('uuid-ossp')) {
      errors.push({
        component: 'Database',
        message: 'Required PostgreSQL extension "uuid-ossp" is not installed',
        severity: 'error',
      });
    }

    if (!extensions.includes('pg_trgm')) {
      errors.push({
        component: 'Database',
        message: 'PostgreSQL extension "pg_trgm" is not installed (fuzzy search will not work)',
        severity: 'warning',
      });
    }

  } catch (error) {
    logger.error('Database validation failed', error as Error);
    errors.push({
      component: 'Database',
      message: `Database connection failed: ${(error as Error).message}`,
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Validate Redis connection (if configured)
 */
async function validateRedis(): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  if (!process.env.REDIS_URL) {
    // Redis is optional
    return errors;
  }

  try {
    // Redis client would go here
    // For now, just log that it's configured
    logger.info('Redis URL is configured');
  } catch (error) {
    errors.push({
      component: 'Redis',
      message: `Redis connection failed: ${(error as Error).message}`,
      severity: 'warning', // Redis is optional
    });
  }

  return errors;
}

/**
 * Run all startup validations
 */
export async function validateStartup(): Promise<ValidationResult> {
  logger.info('Running startup validation...');

  const errors: ValidationError[] = [];

  // Environment validation (synchronous)
  errors.push(...validateEnvironment());

  // Database validation (asynchronous)
  const dbErrors = await validateDatabase();
  errors.push(...dbErrors);

  // Redis validation (asynchronous)
  const redisErrors = await validateRedis();
  errors.push(...redisErrors);

  // Separate errors from warnings
  const criticalErrors = errors.filter(e => e.severity === 'error');
  const warnings = errors.filter(e => e.severity === 'warning');

  // Log results
  if (criticalErrors.length > 0) {
    logger.error('❌ Startup validation failed with errors:', { errors: criticalErrors });
    criticalErrors.forEach(err => {
      logger.error(`  [${err.component}] ${err.message}`);
    });
  }

  if (warnings.length > 0) {
    logger.warn('⚠️  Startup validation completed with warnings:', { warnings });
    warnings.forEach(warn => {
      logger.warn(`  [${warn.component}] ${warn.message}`);
    });
  }

  if (criticalErrors.length === 0 && warnings.length === 0) {
    logger.info('✅ Startup validation passed successfully');
  }

  return {
    success: criticalErrors.length === 0,
    errors: criticalErrors,
    warnings,
  };
}
