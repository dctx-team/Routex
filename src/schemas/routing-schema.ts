/**
 * 路由规则相关的 Zod Schema
 * Routing Rules Zod Schemas
 */

import { z } from 'zod';

/**
 * 路由规则类型
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
 * 内容类别
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
 * 复杂度级别
 * Complexity level enum
 */
export const complexityLevelSchema = z.enum([
  'simple',
  'moderate',
  'complex',
  'very_complex',
]);

/**
 * 请求意图
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
 * 路由条件
 * Routing condition schema
 */
export const routingConditionSchema = z.object({
  // 基础条件
  tokenThreshold: z.number().int().positive().optional(),
  keywords: z.array(z.string()).optional(),
  userPattern: z.string().optional(),
  modelPattern: z.string().optional(),

  // 特性检测
  hasTools: z.boolean().optional(),
  hasImages: z.boolean().optional(),

  // 内容分析条件
  contentCategory: contentCategorySchema.optional(),
  complexityLevel: complexityLevelSchema.optional(),
  hasCode: z.boolean().optional(),
  programmingLanguage: z.string().optional(),
  intent: requestIntentSchema.optional(),
  minWordCount: z.number().int().nonnegative().optional(),
  maxWordCount: z.number().int().positive().optional(),

  // 自定义函数
  customFunction: z.string().optional(),
}).refine(
  (data) => {
    // 至少需要一个条件
    return Object.values(data).some(val => val !== undefined);
  },
  {
    message: 'At least one routing condition is required',
  }
);

/**
 * 创建路由规则输入验证
 * Create routing rule input validation
 */
export const createRoutingRuleSchema = z.object({
  name: z.string()
    .min(1, 'Rule name is required')
    .max(100, 'Rule name must be less than 100 characters'),

  type: routingRuleTypeSchema,

  condition: routingConditionSchema,

  targetChannel: z.string()
    .min(1, 'Target channel is required'),

  targetModel: z.string().optional(),

  priority: z.number()
    .int('Priority must be an integer')
    .min(0, 'Priority must be at least 0')
    .max(100, 'Priority must be at most 100')
    .default(50),

  enabled: z.boolean().default(true),

  description: z.string().max(500).optional(),
});

/**
 * 更新路由规则输入验证（所有字段可选）
 * Update routing rule input validation (all fields optional)
 */
export const updateRoutingRuleSchema = createRoutingRuleSchema.partial();

/**
 * 路由规则查询参数验证
 * Routing rule query parameters validation
 */
export const routingRuleQuerySchema = z.object({
  enabled: z.coerce.boolean().optional(),
  type: routingRuleTypeSchema.optional(),
  targetChannel: z.string().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
});

// 导出类型
export type CreateRoutingRuleInput = z.infer<typeof createRoutingRuleSchema>;
export type UpdateRoutingRuleInput = z.infer<typeof updateRoutingRuleSchema>;
export type RoutingRuleQueryParams = z.infer<typeof routingRuleQuerySchema>;
