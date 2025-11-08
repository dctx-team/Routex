/**
 * 
 * 
 */

import { logger } from '../utils/logger';
import { RoutexError } from './errors';

/**
 * 
 */
export interface RetryConfig {
  maxRetries: number;        // 
  baseDelay: number;          // 
  maxDelay: number;           // 
  exponentialBase: number;    // 
  jitterEnabled: boolean;     // 
  jitterFactor: number;       // 0-1
}

/**
 * HTTP 
 */
export class HTTPError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'HTTPError';
  }
}

/**
 * Extended error interface for retriable flag
 */
interface RetriableError extends Error {
  retriable?: boolean;
}

/**
 * 
 */
const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,           // 1 
  maxDelay: 30000,           // 30 
  exponentialBase: 2,        // 2^n
  jitterEnabled: true,
  jitterFactor: 0.25,        // ±25% 
};

/**
 * 
 */
export class RetryStrategy {
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // 
    this.loadFromEnv;

    logger.debug({
      config: this.config,
    }, '🔄 Retry strategy initialized');
  }

  /**
   * 
   */
  private loadFromEnv {
    if (process.env.RETRY_MAX_ATTEMPTS) {
      this.config.maxRetries = Number(process.env.RETRY_MAX_ATTEMPTS);
    }
    if (process.env.RETRY_BASE_DELAY) {
      this.config.baseDelay = Number(process.env.RETRY_BASE_DELAY);
    }
    if (process.env.RETRY_MAX_DELAY) {
      this.config.maxDelay = Number(process.env.RETRY_MAX_DELAY);
    }
    if (process.env.RETRY_EXPONENTIAL_BASE) {
      this.config.exponentialBase = Number(process.env.RETRY_EXPONENTIAL_BASE);
    }
    if (process.env.RETRY_JITTER_ENABLED) {
      this.config.jitterEnabled = process.env.RETRY_JITTER_ENABLED === 'true';
    }
  }

  /**
   *  + 
   */
  calculateDelay(attempt: number): number {
    // : baseDelay * (exponentialBase ^ (attempt - 1))
    const exponentialDelay = this.config.baseDelay *
      Math.pow(this.config.exponentialBase, attempt - 1);

    // 
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);

    // ±jitterFactor% 
    if (this.config.jitterEnabled) {
      const jitterRange = cappedDelay * this.config.jitterFactor;
      const jitter = (Math.random * 2 - 1) * jitterRange;
      return Math.floor(Math.max(0, cappedDelay + jitter));
    }

    return cappedDelay;
  }

  /**
   * 
   */
  isRetriable(error: Error): boolean {
    // 1.
    if (this.isNetworkError(error)) {
      logger.debug({
        error: error.message,
      }, '🔄 Network error is retriable');
      return true;
    }

    // 2. HTTP 
    if (error instanceof HTTPError) {
      return this.isRetriableHTTPError(error);
    }

    // 3. 
    if (error instanceof RoutexError) {
      // RoutexError  retriable 
      const retriableError = error as RetriableError;
      return retriableError.retriable !== false;
    }

    // 4.
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      logger.debug({
        error: error.message,
      }, '🔄 Timeout error is retriable');
      return true;
    }

    // 
    logger.debug({
      error: error.message,
    }, '🔄 Unknown error, treating as retriable');
    return true;
  }

  /**
   * 
   */
  private isNetworkError(error: Error): boolean {
    const networkErrorCodes = [
      'ECONNREFUSED',   // 
      'ECONNRESET',     // 
      'ETIMEDOUT',      // 
      'ENOTFOUND',      // DNS 
      'ENETUNREACH',    // 
      'EHOSTUNREACH',   // 
      'EPIPE',          // 
      'EAI_AGAIN',      // DNS 
    ];

    return networkErrorCodes.some(code => error.message.includes(code));
  }

  /**
   *  HTTP 
   */
  private isRetriableHTTPError(error: HTTPError): boolean {
    const status = error.status;

    // 408
    if (status === 408) {
      logger.debug({
        status,
      }, '🔄 HTTP 408 (Request Timeout) is retriable');
      return true;
    }

    // 429
    if (status === 429) {
      logger.debug({
        status,
      }, '🔄 HTTP 429 (Rate Limited) is retriable');
      return true;
    }

    // 5xx
    if (status >= 500 && status < 600) {
      logger.debug({
        status,
      }, '🔄 HTTP 5xx (Server Error) is retriable');
      return true;
    }

    // 502, 503, 504  -  5xx 
    if ([502, 503, 504].includes(status)) {
      logger.debug({
        status,
      }, '🔄 HTTP gateway error is retriable');
      return true;
    }

    // 4xx  408, 429- 
    if (status >= 400 && status < 500) {
      logger.debug({
        status,
      }, '❌ HTTP 4xx (Client Error) is not retriable');
      return false;
    }

    // 
    return true;
  }

  /**
   * 
   */
  getMaxRetries: number {
    return this.config.maxRetries;
  }

  /**
   * 
   */
  getConfig: RetryConfig {
    return { ...this.config };
  }

  /**
   * 
   */
  logRetry(attempt: number, delay: number, error: Error, context?: any) {
    logger.warn({
      attempt,
      maxRetries: this.config.maxRetries,
      delay,
      error: error.message,
      errorType: error.name,
      retriable: this.isRetriable(error),
      ...context,
    }, `⚠️  Retry attempt ${attempt}/${this.config.maxRetries} (waiting ${delay}ms)`);
  }

  /**
   * 
   */
  logRetryExhausted(totalAttempts: number, error: Error, context?: any) {
    logger.error({
      totalAttempts,
      maxRetries: this.config.maxRetries,
      error: error.message,
      errorType: error.name,
      ...context,
    }, '❌ Retry attempts exhausted');
  }
}

/**
 * 
 */
export const defaultRetryStrategy = new RetryStrategy;

/**
 * 
 * 
 */
export function withRetry<T>(
  fn:  => Promise<T>,
  strategy: RetryStrategy = defaultRetryStrategy,
  context?: any
): Promise<T> {
  return executeWithRetry(fn, strategy, context);
}

/**
 * 
 */
async function executeWithRetry<T>(
  fn:  => Promise<T>,
  strategy: RetryStrategy,
  context?: any
): Promise<T> {
  let lastError: Error | null = null;
  let attempt = 0;
  const maxRetries = strategy.getMaxRetries;

  while (attempt < maxRetries) {
    attempt++;

    try {
      return await fn;
    } catch (error) {
      lastError = error as Error;

      // 
      if (!strategy.isRetriable(lastError)) {
        logger.warn({
          error: lastError.message,
          attempt,
        }, '❌ Error is not retriable, aborting');
        throw lastError;
      }

      // 
      if (attempt < maxRetries) {
        const delay = strategy.calculateDelay(attempt);
        strategy.logRetry(attempt, delay, lastError, context);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // 
  strategy.logRetryExhausted(attempt, lastError!, context);
  throw lastError;
}

/**
 * 
 */
export const RetryPresets = {
  /**
   * 
   */
  fast: new RetryStrategy({
    maxRetries: 2,
    baseDelay: 500,      // 0.5 
    maxDelay: 2000,      // 2 
    exponentialBase: 2,
    jitterEnabled: true,
  }),

  /**
   * 
   */
  standard: defaultRetryStrategy,

  /**
   * 
   */
  patient: new RetryStrategy({
    maxRetries: 5,
    baseDelay: 2000,     // 2 
    maxDelay: 60000,     // 60 
    exponentialBase: 2,
    jitterEnabled: true,
  }),

  /**
   * 
   */
  noJitter: new RetryStrategy({
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBase: 2,
    jitterEnabled: false,
  }),
};
