/**
 * Zod 验证中间件
 * Zod Validation Middleware
 */

import type { Context, Next } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../core/errors';
import { logger } from '../utils/logger';

/**
 * 验证请求体
 * Validate request body
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const validated = schema.parse(body);

      // 将验证后的数据存储到 context
      c.set('validatedBody', validated);

      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // 格式化 Zod 错误信息
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        logger.warn({
          errors: formattedErrors,
          path: c.req.path,
        }, '⚠️  Validation failed');

        throw new ValidationError('Validation failed', formattedErrors);
      }
      throw error;
    }
  };
}

/**
 * 验证查询参数
 * Validate query parameters
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return async (c: Context, next: Next) => {
    try {
      const query = c.req.query();
      const validated = schema.parse(query);

      // 将验证后的数据存储到 context
      c.set('validatedQuery', validated);

      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        throw new ValidationError('Query validation failed', formattedErrors);
      }
      throw error;
    }
  };
}

/**
 * 验证路径参数
 * Validate path parameters
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return async (c: Context, next: Next) => {
    try {
      const params = c.req.param();
      const validated = schema.parse(params);

      // 将验证后的数据存储到 context
      c.set('validatedParams', validated);

      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        throw new ValidationError('Path parameter validation failed', formattedErrors);
      }
      throw error;
    }
  };
}
