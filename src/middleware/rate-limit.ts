/**
 * Rate Limiter Middleware
 * 
 *
 *  API 
 */

import type { Context, Next } from 'hono';
import { logger } from '../utils/logger';

/**
 * 
 */
export interface RateLimitConfig {
  // 
  windowMs: number;
  // 
  max: number;
  //  IP
  keyGenerator?: (c: Context) => string;
  // 
  message?: string;
  // 
  skip?: (c: Context) => boolean;
  // 
  standardHeaders?: boolean;
  // 
  store?: RateLimitStore;
}

/**
 * 
 */
export interface RateLimitStore {
  increment(key: string): Promise<number>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
  resetAll: Promise<void>;
}

/**
 * 
 */
export class MemoryStore implements RateLimitStore {
  private hits = new Map<string, { count: number; resetTime: number }>;
  private windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
    this.startCleanupTimer;
  }

  async increment(key: string): Promise<number> {
    const now = Date.now;
    const record = this.hits.get(key);

    if (!record || now > record.resetTime) {
      // 
      this.hits.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return 1;
    }

    // 
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

  async resetAll: Promise<void> {
    this.hits.clear;
  }

  /**
   * 
   */
  getStats {
    return {
      totalKeys: this.hits.size,
      keys: Array.from(this.hits.entries).map(([key, value]) => ({
        key,
        count: value.count,
        resetsIn: Math.max(0, value.resetTime - Date.now),
      })),
    };
  }

  /**
   * 
   */
  private startCleanupTimer {
    setInterval( => {
      const now = Date.now;
      for (const [key, record] of this.hits.entries) {
        if (now > record.resetTime) {
          this.hits.delete(key);
        }
      }
    }, this.windowMs);
  }
}

/**
 * 
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs = 60000, //  1 
    max = 100, //  100 
    keyGenerator = (c) => c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
    message = 'Too many requests, please try again later.',
    skip =  => false,
    standardHeaders = true,
  } = config;

  //  windowMs MemoryStore 
  const store = config.store || new MemoryStore(windowMs);

  return async (c: Context, next: Next) => {
    // 
    if (skip(c)) {
      return next;
    }

    // 
    const key = keyGenerator(c);

    // 
    const hits = await store.increment(key);

    // 
    const resetTime = Date.now + windowMs;

    // 
    if (standardHeaders) {
      c.header('X-RateLimit-Limit', max.toString);
      c.header('X-RateLimit-Remaining', Math.max(0, max - hits).toString);
      c.header('X-RateLimit-Reset', new Date(resetTime).toISOString);
    }

    // 
    if (hits > max) {
      logger.warn({
        key,
        hits,
        max,
        path: c.req.path,
      }, '🚫 Rate limit exceeded');

      c.header('Retry-After', Math.ceil(windowMs / 1000).toString);

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

    // 
    return next;
  };
}

/**
 * 
 */
export const RateLimitPresets = {
  /**
   *
   */
  strict: {
    windowMs: 60000, // 1 
    max: 10, // 10
  },

  /**
   *  -  API
   */
  standard: {
    windowMs: 60000, // 1 
    max: 100, // 100
  },

  /**
   *
   */
  lenient: {
    windowMs: 60000, // 1 
    max: 1000, // 1000
  },

  /**
   * 
   */
  hourly: {
    windowMs: 3600000, // 1 
    max: 1000, // 1000
  },

  /**
   * 
   */
  auth: {
    windowMs: 900000, // 15 
    max: 5, // 5 
  },
};

/**
 * 
 */
export function createRateLimiters {
  return {
    //
    strict: rateLimit({
      ...RateLimitPresets.strict,
      message: 'Too many requests. Maximum 10 requests per minute.',
    }),

    //
    standard: rateLimit({
      ...RateLimitPresets.standard,
      message: 'Too many requests. Maximum 100 requests per minute.',
    }),

    //
    lenient: rateLimit({
      ...RateLimitPresets.lenient,
      message: 'Too many requests. Maximum 1000 requests per minute.',
    }),

    // 
    proxy: rateLimit({
      windowMs: 60000,
      max: 60, // 60
      keyGenerator: (c) => {
        //  API key 
        const apiKey = c.req.header('x-api-key') || c.req.header('authorization');
        if (apiKey) {
          return `api:${apiKey.substring(0, 10)}`;
        }
        //  IP
        return c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
      },
      message: 'Too many proxy requests. Maximum 60 requests per minute.',
    }),
  };
}

/**
 *  API 
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

  const stores = new Map<string, RateLimitStore>;

  return async (c: Context, next: Next) => {
    const apiKey = c.req.header('x-api-key') || c.req.header('authorization');

    if (!apiKey) {
      //  API key
      return rateLimit({
        windowMs: defaultWindowMs,
        max: defaultMax,
      })(c, next);
    }

    //  API key 
    const limit = limits.get(apiKey) || { max: defaultMax, windowMs: defaultWindowMs };

    //  API key 
    if (!stores.has(apiKey)) {
      stores.set(apiKey, new MemoryStore(limit.windowMs));
    }

    const store = stores.get(apiKey)!;

    return rateLimit({
      windowMs: limit.windowMs,
      max: limit.max,
      keyGenerator:  => apiKey,
      store,
    })(c, next);
  };
}
