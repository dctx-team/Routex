/**
 *  Zod Schema
 * Routing Rules Zod Schemas
 */

import { z } from 'zod';

/**
 * 
 * Routing rule type enum
 */
export const routingRuleTypeSchema = z.enum([
  'model',
  'keyword',
  'pattern',
  'longContext',
  'background',
  'think',
  'webSearch',
  'image',
  'custom',
]);

/**
 * 
 * Content category enum
 */
export const contentCategorySchema = z.enum([
  'coding',
  'writing',
  'analysis',
  'conversation',
  'research',
  'creative',
  'technical',
  'general',
]);

/**
 * 
 * Complexity level enum
 */
export const complexityLevelSchema = z.enum([
  'simple',
  'moderate',
  'complex',
  'very_complex',
]);

/**
 * 
 * Request intent enum
 */
export const requestIntentSchema = z.enum([
  'question',
  'task',
  'generation',
  'analysis',
  'conversation',
  'review',
  'debug',
]);

/**
 * 
 * Routing condition schema
 */
export const routingConditionSchema = z.object({
  // 
  tokenThreshold: z.number.int.positive.optional,
  keywords: z.array(z.string).optional,
  userPattern: z.string.optional,
  modelPattern: z.string.optional,

  // 
  hasTools: z.boolean.optional,
  hasImages: z.boolean.optional,

  // 
  contentCategory: contentCategorySchema.optional,
  complexityLevel: complexityLevelSchema.optional,
  hasCode: z.boolean.optional,
  programmingLanguage: z.string.optional,
  intent: requestIntentSchema.optional,
  minWordCount: z.number.int.nonnegative.optional,
  maxWordCount: z.number.int.positive.optional,

  // 
  customFunction: z.string.optional,
}).refine(
  (data) => {
    // 
    return Object.values(data).some(val => val !== undefined);
  },
  {
    message: 'At least one routing condition is required',
  }
);

/**
 * 
 * Create routing rule input validation
 */
export const createRoutingRuleSchema = z.object({
  name: z.string
    .min(1, 'Rule name is required')
    .max(100, 'Rule name must be less than 100 characters'),

  type: routingRuleTypeSchema,

  condition: routingConditionSchema,

  targetChannel: z.string
    .min(1, 'Target channel is required'),

  targetModel: z.string.optional,

  priority: z.number
    .int('Priority must be an integer')
    .min(0, 'Priority must be at least 0')
    .max(100, 'Priority must be at most 100')
    .default(50),

  enabled: z.boolean.default(true),

  description: z.string.max(500).optional,
});

/**
 * 
 * Update routing rule input validation (all fields optional)
 */
export const updateRoutingRuleSchema = createRoutingRuleSchema.partial;

/**
 * 
 * Routing rule query parameters validation
 */
export const routingRuleQuerySchema = z.object({
  enabled: z.coerce.boolean.optional,
  type: routingRuleTypeSchema.optional,
  targetChannel: z.string.optional,
  limit: z.coerce.number.int.positive.max(1000).default(100),
  offset: z.coerce.number.int.nonnegative.default(0),
});

// 
export type CreateRoutingRuleInput = z.infer<typeof createRoutingRuleSchema>;
export type UpdateRoutingRuleInput = z.infer<typeof updateRoutingRuleSchema>;
export type RoutingRuleQueryParams = z.infer<typeof routingRuleQuerySchema>;
