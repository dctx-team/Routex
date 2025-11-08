/**
 * 通用查询和参数的 Zod Schema
 * Common Query and Parameter Zod Schemas
 */

import { z } from 'zod';

/**
 * 分页查询参数
 * Pagination query parameters
 */
export const paginationSchema = z.object({
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .positive('Limit must be positive')
    .max(1000, 'Limit must be at most 1000')
    .default(100),

  offset: z.coerce.number()
    .int('Offset must be an integer')
    .nonnegative('Offset must be non-negative')
    .default(0),
});

/**
 * 请求日志查询参数
 * Request log query parameters
 */
export const requestLogQuerySchema = z.object({
  status: z.coerce.number()
    .int()
    .min(100)
    .max(599)
    .optional(),

  channelId: z.string().optional(),

  model: z.string().optional(),

  q: z.string().optional(), // 搜索查询

  since: z.coerce.number().int().positive().optional(), // 时间戳

  until: z.coerce.number().int().positive().optional(), // 时间戳

  limit: z.coerce.number().int().positive().max(1000).default(100),

  offset: z.coerce.number().int().nonnegative().default(0),
}).refine(
  (data) => {
    // 如果同时提供了 since 和 until，确保 since < until
    if (data.since && data.until && data.since >= data.until) {
      return false;
    }
    return true;
  },
  {
    message: 'since must be less than until',
  }
);

/**
 * ID 路径参数验证
 * ID path parameter validation
 */
export const idParamSchema = z.object({
  id: z.string()
    .min(1, 'ID is required')
    .regex(/^[a-zA-Z0-9-_]+$/, 'ID must contain only alphanumeric characters, hyphens, and underscores'),
});

/**
 * 负载均衡策略
 * Load balancer strategy enum
 */
export const loadBalancerStrategySchema = z.enum([
  'priority',
  'round_robin',
  'weighted',
  'least_used',
]);

/**
 * 更新负载均衡策略
 * Update load balancer strategy
 */
export const updateStrategySchema = z.object({
  strategy: loadBalancerStrategySchema,
});

/**
 * 语言环境
 * Locale enum
 */
export const localeSchema = z.enum(['en', 'zh-CN']);

/**
 * 更新语言环境
 * Update locale
 */
export const updateLocaleSchema = z.object({
  locale: localeSchema,
});

/**
 * 日志级别
 * Log level enum
 */
export const logLevelSchema = z.enum([
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
]);

/**
 * 更新日志级别
 * Update log level
 */
export const updateLogLevelSchema = z.object({
  level: logLevelSchema,
});

/**
 * 缓存清理参数
 * Cache invalidation parameters
 */
export const cacheInvalidationSchema = z.object({
  type: z.enum(['channels', 'singleChannel', 'routingRules', 'enabledChannels']).optional(),
});

/**
 * 追踪清理参数
 * Tracing cleanup parameters
 */
export const tracingCleanupSchema = z.object({
  olderThanMs: z.number()
    .int('olderThanMs must be an integer')
    .positive('olderThanMs must be positive')
    .max(86400000, 'Maximum 24 hours')
    .default(3600000), // 默认 1 小时
});

/**
 * 频道导入参数
 * Channel import parameters
 */
export const channelImportSchema = z.object({
  channels: z.array(z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    models: z.array(z.string()).min(1),
    priority: z.number().int().min(0).max(100).optional(),
    weight: z.number().positive().optional(),
  })).min(1, 'At least one channel is required'),

  replaceExisting: z.boolean().default(false),
});

/**
 * OAuth 链接参数
 * OAuth link parameters
 */
export const oauthLinkSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  channelId: z.string().min(1, 'Channel ID is required'),
});

/**
 * 配置保存参数
 * Config save parameters
 */
export const configSaveSchema = z.object({
  path: z.string().optional(),
});

/**
 * 缓存预热参数
 * Cache warming parameters
 */
export const cacheWarmSchema = z.object({
  items: z.array(z.object({
    type: z.string(),
    data: z.any(),
  })).optional(),
});

// 导出类型
export type PaginationParams = z.infer<typeof paginationSchema>;
export type RequestLogQueryParams = z.infer<typeof requestLogQuerySchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type UpdateStrategyInput = z.infer<typeof updateStrategySchema>;
export type UpdateLocaleInput = z.infer<typeof updateLocaleSchema>;
export type UpdateLogLevelInput = z.infer<typeof updateLogLevelSchema>;
export type CacheInvalidationParams = z.infer<typeof cacheInvalidationSchema>;
export type TracingCleanupParams = z.infer<typeof tracingCleanupSchema>;
export type ChannelImportInput = z.infer<typeof channelImportSchema>;
export type OAuthLinkParams = z.infer<typeof oauthLinkSchema>;
export type ConfigSaveParams = z.infer<typeof configSaveSchema>;
export type CacheWarmParams = z.infer<typeof cacheWarmSchema>;
