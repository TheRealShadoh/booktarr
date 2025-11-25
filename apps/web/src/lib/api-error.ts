/**
 * API Error Handler
 * Standardized error handling for API routes
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from './logger';

/**
 * Standard API error codes
 */
export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server errors (5xx)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Convert error to JSON response
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }

  /**
   * Convert error to Next.js response
   */
  toResponse() {
    return NextResponse.json(this.toJSON(), { status: this.statusCode });
  }
}

/**
 * Error factory methods
 */
export const Errors = {
  badRequest: (message: string, details?: any) =>
    new ApiError(message, 400, ErrorCode.BAD_REQUEST, details),

  unauthorized: (message: string = 'Unauthorized') =>
    new ApiError(message, 401, ErrorCode.UNAUTHORIZED),

  forbidden: (message: string = 'Forbidden') =>
    new ApiError(message, 403, ErrorCode.FORBIDDEN),

  notFound: (resource: string = 'Resource') =>
    new ApiError(`${resource} not found`, 404, ErrorCode.NOT_FOUND),

  conflict: (message: string) =>
    new ApiError(message, 409, ErrorCode.CONFLICT),

  validation: (message: string, details?: any) =>
    new ApiError(message, 400, ErrorCode.VALIDATION_ERROR, details),

  rateLimitExceeded: (retryAfter?: number) =>
    new ApiError(
      'Too many requests',
      429,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      retryAfter ? { retryAfter } : undefined
    ),

  internalServerError: (message: string = 'Internal server error') =>
    new ApiError(message, 500, ErrorCode.INTERNAL_SERVER_ERROR),

  databaseError: (message: string = 'Database error') =>
    new ApiError(message, 500, ErrorCode.DATABASE_ERROR),

  externalApiError: (service: string, details?: any) =>
    new ApiError(
      `External API error: ${service}`,
      502,
      ErrorCode.EXTERNAL_API_ERROR,
      details
    ),

  serviceUnavailable: (message: string = 'Service temporarily unavailable') =>
    new ApiError(message, 503, ErrorCode.SERVICE_UNAVAILABLE),
};

/**
 * Handle different types of errors and convert to ApiError
 */
export function handleError(error: unknown): ApiError {
  // Already an ApiError
  if (error instanceof ApiError) {
    return error;
  }

  // Zod validation error
  if (error instanceof ZodError) {
    return Errors.validation('Validation failed', {
      issues: error.issues.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    });
  }

  // Database errors
  if (error instanceof Error) {
    // PostgreSQL errors
    if ('code' in error) {
      const pgError = error as any;
      switch (pgError.code) {
        case '23505': // Unique violation
          return Errors.conflict('Resource already exists');
        case '23503': // Foreign key violation
          return Errors.badRequest('Referenced resource does not exist');
        case '23502': // Not null violation
          return Errors.badRequest('Required field is missing');
        default:
          return Errors.databaseError(
            process.env.NODE_ENV === 'development'
              ? error.message
              : 'Database error occurred'
          );
      }
    }

    // Generic error
    return Errors.internalServerError(
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'An unexpected error occurred'
    );
  }

  // Unknown error
  return Errors.internalServerError('An unexpected error occurred');
}

/**
 * Async error handler wrapper for API routes
 * Catches and handles errors automatically
 */
export function withErrorHandler(
  handler: (request: Request, context?: any) => Promise<Response>
) {
  return async (request: Request, context?: any): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      // Log the error
      logger.error('API route error', error as Error, {
        path: new URL(request.url).pathname,
        method: request.method,
      });

      // Convert to ApiError and return response
      const apiError = handleError(error);
      return apiError.toResponse();
    }
  };
}

/**
 * Assert condition or throw error
 */
export function assert(
  condition: any,
  error: ApiError | string
): asserts condition {
  if (!condition) {
    throw typeof error === 'string' ? Errors.badRequest(error) : error;
  }
}
