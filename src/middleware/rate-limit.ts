/**
 * Rate Limiter Middleware
 * 速率限制中间件
 *
 * 提供灵活的速率限制功能，防止 API 滥用
 */

import type { Context, Next } from 'hono';
import { logger } from '../utils/logger';

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  // 时间窗口（毫秒）
  windowMs: number;
  // 窗口内最大请求数
  max: number;
  // 标识符提取函数（默认使用 IP）
  keyGenerator?: (c: Context) => string;
  // 超出限制时的消息
  message?: string;
  // 跳过某些请求的函数
  skip?: (c: Context) => boolean;
  // 是否在响应头中返回限制信息
  standardHeaders?: boolean;
  // 存储类型
  store?: RateLimitStore;
}

/**
 * 速率限制存储接口
 */
export interface RateLimitStore {
  increment(key: string): Promise<number>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
  resetAll(): Promise<void>;
}

/**
 * 内存存储实现
 */
export class MemoryStore implements RateLimitStore {
  private hits = new Map<string, { count: number; resetTime: number }>();
  private windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
    this.startCleanupTimer();
  }

  async increment(key: string): Promise<number> {
    const now = Date.now();
    const record = this.hits.get(key);

    if (!record || now > record.resetTime) {
      // 创建新记录
      this.hits.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return 1;
    }

    // 增加计数
    record.count++;
    return record.count;
  }

  async decrement(key: string): Promise<void> {
    const record = this.hits.get(key);
    if (record && record.count > 0) {
      record.count--;
    }
  }

  async resetKey(key: string): Promise<void> {
    this.hits.delete(key);
  }

  async resetAll(): Promise<void> {
    this.hits.clear();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalKeys: this.hits.size,
      keys: Array.from(this.hits.entries()).map(([key, value]) => ({
        key,
        count: value.count,
        resetsIn: Math.max(0, value.resetTime - Date.now()),
      })),
    };
  }

  /**
   * 定期清理过期记录
   */
  private startCleanupTimer() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.hits.entries()) {
        if (now > record.resetTime) {
          this.hits.delete(key);
        }
      }
    }, this.windowMs);
  }
}

/**
 * 速率限制中间件
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs = 60000, // 默认 1 分钟
    max = 100, // 默认 100 次/分钟
    keyGenerator = (c) => c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
    message = 'Too many requests, please try again later.',
    skip = () => false,
    standardHeaders = true,
    store = new MemoryStore(windowMs),
  } = config;

  return async (c: Context, next: Next) => {
    // 检查是否跳过
    if (skip(c)) {
      return next();
    }

    // 获取标识符
    const key = keyGenerator(c);

    // 增加计数
    const hits = await store.increment(key);

    // 计算重置时间
    const resetTime = Date.now() + windowMs;

    // 设置响应头
    if (standardHeaders) {
      c.header('X-RateLimit-Limit', max.toString());
      c.header('X-RateLimit-Remaining', Math.max(0, max - hits).toString());
      c.header('X-RateLimit-Reset', new Date(resetTime).toISOString());
    }

    // 检查是否超出限制
    if (hits > max) {
      logger.warn({
        key,
        hits,
        max,
        path: c.req.path,
      }, '🚫 Rate limit exceeded');

      c.header('Retry-After', Math.ceil(windowMs / 1000).toString());

      return c.json(
        {
          success: false,
          error: {
            type: 'rate_limit_exceeded',
            message,
          },
        },
        429
      );
    }

    // 继续处理
    return next();
  };
}

/**
 * 预定义的速率限制配置
 */
export const RateLimitPresets = {
  /**
   * 严格限制 - 用于敏感操作
   */
  strict: {
    windowMs: 60000, // 1 分钟
    max: 10, // 10 次/分钟
  },

  /**
   * 标准限制 - 用于一般 API
   */
  standard: {
    windowMs: 60000, // 1 分钟
    max: 100, // 100 次/分钟
  },

  /**
   * 宽松限制 - 用于公共端点
   */
  lenient: {
    windowMs: 60000, // 1 分钟
    max: 1000, // 1000 次/分钟
  },

  /**
   * 按小时限制
   */
  hourly: {
    windowMs: 3600000, // 1 小时
    max: 1000, // 1000 次/小时
  },

  /**
   * 登录限制
   */
  auth: {
    windowMs: 900000, // 15 分钟
    max: 5, // 5 次尝试
  },
};

/**
 * 为不同路径创建速率限制器
 */
export function createRateLimiters() {
  return {
    // 严格限制 - 写操作
    strict: rateLimit({
      ...RateLimitPresets.strict,
      message: 'Too many requests. Maximum 10 requests per minute.',
    }),

    // 标准限制 - 读操作
    standard: rateLimit({
      ...RateLimitPresets.standard,
      message: 'Too many requests. Maximum 100 requests per minute.',
    }),

    // 宽松限制 - 公共端点
    lenient: rateLimit({
      ...RateLimitPresets.lenient,
      message: 'Too many requests. Maximum 1000 requests per minute.',
    }),

    // 代理请求限制
    proxy: rateLimit({
      windowMs: 60000,
      max: 60, // 60 次/分钟
      keyGenerator: (c) => {
        // 使用 API key 作为标识（如果有）
        const apiKey = c.req.header('x-api-key') || c.req.header('authorization');
        if (apiKey) {
          return `api:${apiKey.substring(0, 10)}`;
        }
        // 否则使用 IP
        return c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
      },
      message: 'Too many proxy requests. Maximum 60 requests per minute.',
    }),
  };
}

/**
 * 基于 API 密钥的速率限制
 */
export function apiKeyRateLimit(config: {
  limits: Map<string, { max: number; windowMs: number }>;
  defaultMax?: number;
  defaultWindowMs?: number;
}) {
  const {
    limits,
    defaultMax = 100,
    defaultWindowMs = 60000,
  } = config;

  const stores = new Map<string, RateLimitStore>();

  return async (c: Context, next: Next) => {
    const apiKey = c.req.header('x-api-key') || c.req.header('authorization');

    if (!apiKey) {
      // 无 API key，使用默认限制
      return rateLimit({
        windowMs: defaultWindowMs,
        max: defaultMax,
      })(c, next);
    }

    // 获取该 API key 的限制配置
    const limit = limits.get(apiKey) || { max: defaultMax, windowMs: defaultWindowMs };

    // 为每个 API key 创建独立的存储
    if (!stores.has(apiKey)) {
      stores.set(apiKey, new MemoryStore(limit.windowMs));
    }

    const store = stores.get(apiKey)!;

    return rateLimit({
      windowMs: limit.windowMs,
      max: limit.max,
      keyGenerator: () => apiKey,
      store,
    })(c, next);
  };
}
