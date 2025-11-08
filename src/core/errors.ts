/**
 * Custom error classes for Routex
 */
import { logger } from '../utils/logger';

export class RoutexError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'RoutexError';
  }

  toJSON() {
    return {
      error: {
        type: this.name,
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class ValidationError extends RoutexError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends RoutexError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends RoutexError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id "${id}" not found` : `${resource} not found`,
      'NOT_FOUND',
      404
    );
    this.name = 'NotFoundError';
  }
}

export class ChannelError extends RoutexError {
  constructor(message: string, details?: any) {
    super(message, 'CHANNEL_ERROR', 500, details);
    this.name = 'ChannelError';
  }
}

export class CircuitBreakerError extends RoutexError {
  constructor(channelName: string, until: Date) {
    super(
      `Channel "${channelName}" is circuit broken until ${until.toISOString()}`,
      'CIRCUIT_BREAKER_OPEN',
      503,
      { channelName, until }
    );
    this.name = 'CircuitBreakerError';
  }
}

export class RateLimitError extends RoutexError {
  constructor(channelName: string, until: Date) {
    super(
      `Channel "${channelName}" is rate limited until ${until.toISOString()}`,
      'RATE_LIMITED',
      429,
      { channelName, until }
    );
    this.name = 'RateLimitError';
  }
}

export class NoAvailableChannelError extends RoutexError {
  constructor(model?: string) {
    super(
      model
        ? `No available channel for model "${model}"`
        : 'No available channels',
      'NO_AVAILABLE_CHANNEL',
      503
    );
    this.name = 'NoAvailableChannelError';
  }
}

export class RoutingError extends RoutexError {
  constructor(message: string, details?: any) {
    super(message, 'ROUTING_ERROR', 500, details);
    this.name = 'RoutingError';
  }
}

export class TransformerError extends RoutexError {
  constructor(message: string, transformerName: string) {
    super(message, 'TRANSFORMER_ERROR', 500, { transformerName });
    this.name = 'TransformerError';
  }
}

export class ConfigurationError extends RoutexError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIGURATION_ERROR', 500, details);
    this.name = 'ConfigurationError';
  }
}

export class DatabaseError extends RoutexError {
  constructor(message: string, operation?: string) {
    super(message, 'DATABASE_ERROR', 500, { operation });
    this.name = 'DatabaseError';
  }
}

/**
 * Error handler middleware for Hono
 */
export function errorHandler(err: Error) {
  logger.error(
    {
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
    },
    'Unhandled error'
  );

  if (err instanceof RoutexError) {
    return {
      status: err.statusCode,
      body: err.toJSON(),
    };
  }

  // Default error response
  return {
    status: 500,
    body: {
      error: {
        type: 'InternalServerError',
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production'
          ? 'An internal error occurred'
          : err.message,
      },
    },
  };
}

/**
 * Wrap async functions with error handling
 */
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return ((...args: Parameters<T>) => {
    return Promise.resolve(fn(...args)).catch((err) => {
      throw err instanceof RoutexError ? err : new RoutexError(
        err.message || 'An error occurred',
        'UNKNOWN_ERROR',
        500
      );
    });
  }) as T;
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: any,
  fields: string[],
  resourceName: string = 'Request'
) {
  const missing = fields.filter((field) => data[field] === undefined);
  if (missing.length > 0) {
    throw new ValidationError(
      `${resourceName} is missing required fields: ${missing.join(', ')}`,
      { missing }
    );
  }
}

/**
 * Validate field types
 */
export function validateTypes(
  data: any,
  schema: Record<string, string>
) {
  const errors: string[] = [];

  for (const [field, expectedType] of Object.entries(schema)) {
    const value = data[field];
    if (value !== undefined) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== expectedType) {
        errors.push(`${field} must be ${expectedType}, got ${actualType}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Type validation failed', { errors });
  }
}
