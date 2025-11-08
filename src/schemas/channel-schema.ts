/**
 * 频道相关的 Zod Schema
 * Channel-related Zod Schemas
 */

import { z } from 'zod';
import { CHANNEL_PRIORITY, CHANNEL_WEIGHT } from '../core/constants';

/**
 * 频道类型
 * Channel type enum
 */
export const channelTypeSchema = z.enum([
  'anthropic',
  'openai',
  'azure',
  'google',
  'cohere',
  'custom',
]);

/**
 * 频道状态
 * Channel status enum
 */
export const channelStatusSchema = z.enum([
  'enabled',
  'disabled',
  'circuit_open',
  'rate_limited',
]);

/**
 * 创建频道输入验证
 * Create channel input validation
 */
export const createChannelSchema = z.object({
  name: z.string()
    .min(1, 'Channel name is required')
    .max(100, 'Channel name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9-_\s]+$/, 'Channel name can only contain letters, numbers, spaces, hyphens and underscores'),

  type: channelTypeSchema,

  apiKey: z.string()
    .min(1, 'API key is required')
    .optional(),

  baseUrl: z.string()
    .url('Base URL must be a valid URL')
    .optional(),

  models: z.array(z.string().min(1))
    .min(1, 'At least one model is required')
    .max(50, 'Too many models (max 50)'),

  priority: z.number()
    .int('Priority must be an integer')
    .min(CHANNEL_PRIORITY.MIN, `Priority must be at least ${CHANNEL_PRIORITY.MIN}`)
    .max(CHANNEL_PRIORITY.MAX, `Priority must be at most ${CHANNEL_PRIORITY.MAX}`)
    .default(CHANNEL_PRIORITY.DEFAULT)
    .optional(),

  weight: z.number()
    .positive('Weight must be a positive number')
    .default(CHANNEL_WEIGHT.DEFAULT)
    .optional(),

  transformers: z.array(z.string()).optional(),
});

/**
 * 更新频道输入验证（所有字段可选）
 * Update channel input validation (all fields optional)
 */
export const updateChannelSchema = createChannelSchema.partial();

/**
 * 频道查询参数验证
 * Channel query parameters validation
 */
export const channelQuerySchema = z.object({
  status: channelStatusSchema.optional(),
  type: channelTypeSchema.optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
});

// 导出类型
export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
export type ChannelQueryParams = z.infer<typeof channelQuerySchema>;
