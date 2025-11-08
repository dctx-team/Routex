/**
 *  Zod Schema
 * Channel-related Zod Schemas
 */

import { z } from 'zod';
import { CHANNEL_PRIORITY, CHANNEL_WEIGHT } from '../core/constants';

/**
 * 
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
 * 
 * Channel status enum
 */
export const channelStatusSchema = z.enum([
  'enabled',
  'disabled',
  'circuit_open',
  'rate_limited',
]);

/**
 * 
 * Create channel input validation
 */
export const createChannelSchema = z.object({
  name: z.string
    .min(1, 'Channel name is required')
    .max(100, 'Channel name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9-_\s]+$/, 'Channel name can only contain letters, numbers, spaces, hyphens and underscores'),

  type: channelTypeSchema,

  apiKey: z.string
    .min(1, 'API key is required')
    .optional,

  baseUrl: z.string
    .url('Base URL must be a valid URL')
    .optional,

  models: z.array(z.string.min(1))
    .min(1, 'At least one model is required')
    .max(50, 'Too many models (max 50)'),

  priority: z.number
    .int('Priority must be an integer')
    .min(CHANNEL_PRIORITY.MIN, `Priority must be at least ${CHANNEL_PRIORITY.MIN}`)
    .max(CHANNEL_PRIORITY.MAX, `Priority must be at most ${CHANNEL_PRIORITY.MAX}`)
    .default(CHANNEL_PRIORITY.DEFAULT)
    .optional,

  weight: z.number
    .positive('Weight must be a positive number')
    .default(CHANNEL_WEIGHT.DEFAULT)
    .optional,

  transformers: z.array(z.string).optional,
});

/**
 * 
 * Update channel input validation (all fields optional)
 */
export const updateChannelSchema = createChannelSchema.partial;

/**
 * 
 * Channel query parameters validation
 */
export const channelQuerySchema = z.object({
  status: channelStatusSchema.optional,
  type: channelTypeSchema.optional,
  search: z.string.optional,
  limit: z.coerce.number.int.positive.max(1000).default(100),
  offset: z.coerce.number.int.nonnegative.default(0),
});

// 
export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
export type ChannelQueryParams = z.infer<typeof channelQuerySchema>;
