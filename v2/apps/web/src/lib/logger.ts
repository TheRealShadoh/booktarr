/**
 * Structured logging utility
 * In production, this could integrate with services like:
 * - Datadog
 * - New Relic
 * - Sentry
 * - LogRocket
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    if (this.isDevelopment) {
      // Pretty print in development
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${context ? ` ${JSON.stringify(context)}` : ''}`;
    }

    // JSON format in production for log aggregation
    return JSON.stringify(logEntry);
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatLog('debug', message, context));
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog('info')) {
      console.log(this.formatLog('info', message, context));
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext) {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : undefined,
      };
      console.error(this.formatLog('error', message, errorContext));
    }
  }

  /**
   * Track performance metrics
   */
  metric(name: string, value: number, unit: string = 'ms', context?: LogContext) {
    this.info(`Metric: ${name}`, {
      metric: name,
      value,
      unit,
      ...context,
    });
  }

  /**
   * Track user actions
   */
  track(event: string, properties?: Record<string, any>, context?: LogContext) {
    this.info(`Event: ${event}`, {
      event,
      properties,
      ...context,
    });
  }
}

export const logger = new Logger();
