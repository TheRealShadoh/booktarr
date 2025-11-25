/**
 * Health Check Endpoint
 * Provides detailed health status of all system components
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic'; // Disable caching

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: {
    database: HealthCheckResult;
    redis?: HealthCheckResult;
    storage?: HealthCheckResult;
  };
  version?: string;
}

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  message?: string;
  latency?: number;
  details?: Record<string, any>;
}

/**
 * Check database health
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Simple query to check connection
    await db.execute(sql`SELECT 1 as healthy`);

    // Get connection pool stats (if available)
    const statsResult = await db.execute(sql`
      SELECT
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    const stats = statsResult[0] as any;

    return {
      status: 'healthy',
      latency: Date.now() - startTime,
      details: {
        totalConnections: parseInt(stats?.total_connections || '0'),
        activeConnections: parseInt(stats?.active_connections || '0'),
        idleConnections: parseInt(stats?.idle_connections || '0'),
      },
    };
  } catch (error) {
    logger.error('Database health check failed', error as Error);
    return {
      status: 'unhealthy',
      message: (error as Error).message,
      latency: Date.now() - startTime,
    };
  }
}

/**
 * Check Redis health (if configured)
 */
async function checkRedis(): Promise<HealthCheckResult | undefined> {
  if (!process.env.REDIS_URL) {
    return undefined; // Redis not configured
  }

  const startTime = Date.now();

  try {
    // Redis client check would go here
    // For now, just return healthy if URL is configured
    return {
      status: 'healthy',
      latency: Date.now() - startTime,
      message: 'Redis configured (client not implemented)',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: (error as Error).message,
      latency: Date.now() - startTime,
    };
  }
}

/**
 * Check storage health (MinIO/S3)
 */
async function checkStorage(): Promise<HealthCheckResult | undefined> {
  if (!process.env.S3_ENDPOINT) {
    return undefined; // Storage not configured
  }

  const startTime = Date.now();

  try {
    // S3/MinIO client check would go here
    // For now, just return healthy if endpoint is configured
    return {
      status: 'healthy',
      latency: Date.now() - startTime,
      message: 'Storage configured (client not implemented)',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: (error as Error).message,
      latency: Date.now() - startTime,
    };
  }
}

/**
 * GET /api/health
 * Health check endpoint for monitoring and load balancers
 */
export async function GET() {
  try {
    // Run all health checks
    const [database, redis, storage] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkStorage(),
    ]);

    // Determine overall status
    const checks = { database, redis, storage };
    const hasUnhealthy = Object.values(checks).some(
      check => check && check.status === 'unhealthy'
    );

    const overallStatus: HealthCheck['status'] = hasUnhealthy
      ? 'unhealthy'
      : database.status === 'healthy'
        ? 'healthy'
        : 'degraded';

    const response: HealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database,
        ...(redis && { redis }),
        ...(storage && { storage }),
      },
      version: process.env.npm_package_version || '2.0.0',
    };

    // Return 200 if healthy, 503 if unhealthy
    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('Health check endpoint error', error as Error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: (error as Error).message,
      },
      { status: 503 }
    );
  }
}
