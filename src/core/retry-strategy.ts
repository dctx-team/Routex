/**
 * 重试策略模块
 * 实现指数退避、抖动和错误分类
 */

import { logger } from '../utils/logger';
import { RoutexError } from './errors';

/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries: number;        // 最大重试次数
  baseDelay: number;          // 基础延迟（毫秒）
  maxDelay: number;           // 最大延迟（毫秒）
  exponentialBase: number;    // 指数基数
  jitterEnabled: boolean;     // 是否启用抖动
  jitterFactor: number;       // 抖动因子（0-1）
}

/**
 * HTTP 错误
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
 * 默认重试配置
 */
const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,           // 1 秒
  maxDelay: 30000,           // 30 秒
  exponentialBase: 2,        // 2^n
  jitterEnabled: true,
  jitterFactor: 0.25,        // ±25% 抖动
};

/**
 * 重试策略类
 */
export class RetryStrategy {
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // 从环境变量读取配置
    this.loadFromEnv();

    logger.debug({
      config: this.config,
    }, '🔄 Retry strategy initialized');
  }

  /**
   * 从环境变量加载配置
   */
  private loadFromEnv() {
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
   * 计算重试延迟（指数退避 + 抖动）
   */
  calculateDelay(attempt: number): number {
    // 指数退避: baseDelay * (exponentialBase ^ (attempt - 1))
    const exponentialDelay = this.config.baseDelay *
      Math.pow(this.config.exponentialBase, attempt - 1);

    // 限制最大延迟
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);

    // 添加抖动（±jitterFactor% 随机波动）
    if (this.config.jitterEnabled) {
      const jitterRange = cappedDelay * this.config.jitterFactor;
      const jitter = (Math.random() * 2 - 1) * jitterRange;
      return Math.floor(Math.max(0, cappedDelay + jitter));
    }

    return cappedDelay;
  }

  /**
   * 判断错误是否可重试
   */
  isRetriable(error: Error): boolean {
    // 1. 网络错误 - 可重试
    if (this.isNetworkError(error)) {
      logger.debug({
        error: error.message,
      }, '🔄 Network error is retriable');
      return true;
    }

    // 2. HTTP 错误码判断
    if (error instanceof HTTPError) {
      return this.isRetriableHTTPError(error);
    }

    // 3. 特定错误类型
    if (error instanceof RoutexError) {
      // RoutexError 可以携带 retriable 标志
      const retriableError = error as RetriableError;
      return retriableError.retriable !== false;
    }

    // 4. 超时错误 - 可重试
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      logger.debug({
        error: error.message,
      }, '🔄 Timeout error is retriable');
      return true;
    }

    // 默认可重试（保守策略）
    logger.debug({
      error: error.message,
    }, '🔄 Unknown error, treating as retriable');
    return true;
  }

  /**
   * 判断是否为网络错误
   */
  private isNetworkError(error: Error): boolean {
    const networkErrorCodes = [
      'ECONNREFUSED',   // 连接拒绝
      'ECONNRESET',     // 连接重置
      'ETIMEDOUT',      // 超时
      'ENOTFOUND',      // DNS 查找失败
      'ENETUNREACH',    // 网络不可达
      'EHOSTUNREACH',   // 主机不可达
      'EPIPE',          // 管道破裂
      'EAI_AGAIN',      // DNS 临时失败
    ];

    return networkErrorCodes.some(code => error.message.includes(code));
  }

  /**
   * 判断 HTTP 错误是否可重试
   */
  private isRetriableHTTPError(error: HTTPError): boolean {
    const status = error.status;

    // 408 请求超时 - 可重试
    if (status === 408) {
      logger.debug({
        status,
      }, '🔄 HTTP 408 (Request Timeout) is retriable');
      return true;
    }

    // 429 限流 - 可重试
    if (status === 429) {
      logger.debug({
        status,
      }, '🔄 HTTP 429 (Rate Limited) is retriable');
      return true;
    }

    // 5xx 服务器错误 - 可重试
    if (status >= 500 && status < 600) {
      logger.debug({
        status,
      }, '🔄 HTTP 5xx (Server Error) is retriable');
      return true;
    }

    // 4xx 客户端错误（除 408, 429）- 不可重试
    if (status >= 400 && status < 500) {
      logger.debug({
        status,
      }, '❌ HTTP 4xx (Client Error) is not retriable');
      return false;
    }

    // 其他情况默认可重试
    return true;
  }

  /**
   * 获取最大重试次数
   */
  getMaxRetries(): number {
    return this.config.maxRetries;
  }

  /**
   * 获取重试配置
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * 记录重试信息
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
   * 记录重试耗尽
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
 * 全局默认重试策略实例
 */
export const defaultRetryStrategy = new RetryStrategy();

/**
 * 重试装饰器工厂
 * 可用于包装任何异步函数，自动添加重试逻辑
 */
export function withRetry<T>(
  fn: () => Promise<T>,
  strategy: RetryStrategy = defaultRetryStrategy,
  context?: any
): Promise<T> {
  return executeWithRetry(fn, strategy, context);
}

/**
 * 执行带重试的异步函数
 */
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  strategy: RetryStrategy,
  context?: any
): Promise<T> {
  let lastError: Error | null = null;
  let attempt = 0;
  const maxRetries = strategy.getMaxRetries();

  while (attempt < maxRetries) {
    attempt++;

    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // 判断是否可重试
      if (!strategy.isRetriable(lastError)) {
        logger.warn({
          error: lastError.message,
          attempt,
        }, '❌ Error is not retriable, aborting');
        throw lastError;
      }

      // 如果还有重试次数，等待后重试
      if (attempt < maxRetries) {
        const delay = strategy.calculateDelay(attempt);
        strategy.logRetry(attempt, delay, lastError, context);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // 重试耗尽
  strategy.logRetryExhausted(attempt, lastError!, context);
  throw lastError;
}

/**
 * 预设重试策略
 */
export const RetryPresets = {
  /**
   * 快速重试（用于低延迟场景）
   */
  fast: new RetryStrategy({
    maxRetries: 2,
    baseDelay: 500,      // 0.5 秒
    maxDelay: 2000,      // 2 秒
    exponentialBase: 2,
    jitterEnabled: true,
  }),

  /**
   * 标准重试（默认）
   */
  standard: defaultRetryStrategy,

  /**
   * 耐心重试（用于高延迟场景）
   */
  patient: new RetryStrategy({
    maxRetries: 5,
    baseDelay: 2000,     // 2 秒
    maxDelay: 60000,     // 60 秒
    exponentialBase: 2,
    jitterEnabled: true,
  }),

  /**
   * 无抖动（用于测试）
   */
  noJitter: new RetryStrategy({
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBase: 2,
    jitterEnabled: false,
  }),
};
