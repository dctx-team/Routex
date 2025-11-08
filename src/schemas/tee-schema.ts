/**
 * Tee 目标相关的 Zod Schema
 * Tee Destination Zod Schemas
 */

import { z } from 'zod';

/**
 * Tee 目标类型
 * Tee destination type enum
 */
export const teeDestinationTypeSchema = z.enum([
  'webhook',
  'file',
  'custom',
]);

/**
 * HTTP 方法
 * HTTP method enum
 */
export const httpMethodSchema = z.enum([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

/**
 * Tee 过滤条件
 * Tee filter schema
 */
export const teeFilterSchema = z.object({
  statusCodes: z.array(z.number().int().min(100).max(599)).optional(),
  channels: z.array(z.string()).optional(),
  models: z.array(z.string()).optional(),
  minLatency: z.number().nonnegative().optional(),
  maxLatency: z.number().positive().optional(),
  successOnly: z.boolean().optional(),
  failureOnly: z.boolean().optional(),
}).optional();

/**
 * 创建 Tee 目标输入验证
 * Create tee destination input validation
 */
export const createTeeDestinationSchema = z.object({
  name: z.string()
    .min(1, 'Destination name is required')
    .max(100, 'Destination name must be less than 100 characters'),

  type: teeDestinationTypeSchema,

  enabled: z.boolean().default(true),

  // Webhook 配置
  url: z.string()
    .url('URL must be valid')
    .optional(),

  method: httpMethodSchema.default('POST').optional(),

  headers: z.record(z.string()).optional(),

  // File 配置
  filePath: z.string().optional(),

  // Custom 配置
  customHandler: z.string().optional(),

  // 过滤器
  filter: teeFilterSchema,

  // 重试配置
  retries: z.number()
    .int('Retries must be an integer')
    .nonnegative('Retries must be non-negative')
    .max(10, 'Maximum 10 retries allowed')
    .default(3)
    .optional(),

  timeout: z.number()
    .int('Timeout must be an integer')
    .positive('Timeout must be positive')
    .max(30000, 'Timeout must be at most 30 seconds')
    .default(5000)
    .optional(),
}).refine(
  (data) => {
    // Webhook 类型必须有 URL
    if (data.type === 'webhook' && !data.url) {
      return false;
    }
    // File 类型必须有 filePath
    if (data.type === 'file' && !data.filePath) {
      return false;
    }
    // Custom 类型必须有 customHandler
    if (data.type === 'custom' && !data.customHandler) {
      return false;
    }
    return true;
  },
  {
    message: 'Required fields missing for the selected destination type',
  }
);

/**
 * 更新 Tee 目标输入验证（所有字段可选）
 * Update tee destination input validation (all fields optional)
 */
export const updateTeeDestinationSchema = createTeeDestinationSchema.partial();

// 导出类型
export type CreateTeeDestinationInput = z.infer<typeof createTeeDestinationSchema>;
export type UpdateTeeDestinationInput = z.infer<typeof updateTeeDestinationSchema>;
