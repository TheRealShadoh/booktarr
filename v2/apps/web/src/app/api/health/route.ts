import { NextResponse } from 'next/server';
import { monitor } from '@/lib/monitoring';
import { db } from '@/lib/db';

/**
 * Health check endpoint
 * Returns system health status and metrics
 */
export async function GET() {
  try {
    const startTime = Date.now();

    // Check database connectivity
    let dbStatus = 'healthy';
    let dbLatency = 0;

    try {
      const dbStart = Date.now();
      await db.execute('SELECT 1');
      dbLatency = Date.now() - dbStart;
    } catch (error) {
      dbStatus = 'unhealthy';
      console.error('Database health check failed:', error);
    }

    // Get system metrics
    const metrics = await monitor.getHealthMetrics();

    const responseTime = Date.now() - startTime;

    const health = {
      status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbStatus,
          latency: `${dbLatency}ms`,
        },
        api: {
          status: 'healthy',
          responseTime: `${responseTime}ms`,
        },
      },
      system: {
        uptime: metrics.uptime,
        memory: {
          used: `${Math.round(metrics.memory.heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(metrics.memory.heapTotal / 1024 / 1024)}MB`,
        },
        nodeVersion: metrics.nodeVersion,
      },
    };

    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 : 503,
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
