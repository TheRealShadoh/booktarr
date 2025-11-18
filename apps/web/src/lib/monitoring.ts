/**
 * Performance monitoring and error tracking
 * Integrates with services like Sentry, DataDog, etc.
 */

import { logger } from './logger';

export interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class Monitor {
  private timers: Map<string, number> = new Map();

  /**
   * Start a performance timer
   */
  startTimer(name: string) {
    this.timers.set(name, performance.now());
  }

  /**
   * End a performance timer and log the duration
   */
  endTimer(name: string, metadata?: Record<string, any>) {
    const startTime = this.timers.get(name);
    if (startTime === undefined) {
      logger.warn(`Timer "${name}" was not started`);
      return;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    logger.metric(name, duration, 'ms', metadata);

    return duration;
  }

  /**
   * Track an error with context
   */
  captureError(error: Error, context?: Record<string, any>) {
    logger.error('Error captured', error, context);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: context });
      // Example: DataDog.logger.error(error.message, { error, ...context });
    }
  }

  /**
   * Track API request performance
   */
  trackApiRequest(options: {
    method: string;
    path: string;
    statusCode: number;
    duration: number;
    userId?: string;
  }) {
    logger.metric('api_request', options.duration, 'ms', {
      method: options.method,
      path: options.path,
      statusCode: options.statusCode,
      userId: options.userId,
    });
  }

  /**
   * Track database query performance
   */
  trackDbQuery(options: {
    query: string;
    duration: number;
    rowCount?: number;
  }) {
    logger.metric('db_query', options.duration, 'ms', {
      query: options.query.substring(0, 100), // Truncate long queries
      rowCount: options.rowCount,
    });
  }

  /**
   * Track user action
   */
  trackUserAction(action: string, userId: string, properties?: Record<string, any>) {
    logger.track(action, { userId, ...properties });

    // In production, send to analytics service
    if (process.env.NODE_ENV === 'production') {
      // Example: analytics.track(userId, action, properties);
    }
  }

  /**
   * Health check - returns system health metrics
   */
  async getHealthMetrics() {
    // Check if running in Node.js (not Edge Runtime)
    const isNode = typeof process !== 'undefined' && process.versions?.node;

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: isNode ? process.uptime() : undefined,
      memory: isNode ? process.memoryUsage() : undefined,
      nodeVersion: isNode ? process.version : undefined,
    };
  }
}

export const monitor = new Monitor();

/**
 * Higher-order function to monitor async function performance
 */
export function withMonitoring<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    monitor.startTimer(name);
    try {
      const result = await fn(...args);
      monitor.endTimer(name, { success: true });
      return result;
    } catch (error) {
      monitor.endTimer(name, { success: false });
      monitor.captureError(error as Error, { function: name, args });
      throw error;
    }
  }) as T;
}
