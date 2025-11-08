/**
 * Tee  Zod Schema
 * Tee Destination Zod Schemas
 */

import { z } from 'zod';

/**
 * Tee 
 * Tee destination type enum
 */
export const teeDestinationTypeSchema = z.enum([
  'webhook',
  'file',
  'custom',
]);

/**
 * HTTP 
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
 * Tee 
 * Tee filter schema
 */
export const teeFilterSchema = z.object({
  statusCodes: z.array(z.number.int.min(100).max(599)).optional,
  channels: z.array(z.string).optional,
  models: z.array(z.string).optional,
  minLatency: z.number.nonnegative.optional,
  maxLatency: z.number.positive.optional,
  successOnly: z.boolean.optional,
  failureOnly: z.boolean.optional,
}).optional;

/**
 *  Tee 
 * Create tee destination input validation
 */
export const createTeeDestinationSchema = z.object({
  name: z.string
    .min(1, 'Destination name is required')
    .max(100, 'Destination name must be less than 100 characters'),

  type: teeDestinationTypeSchema,

  enabled: z.boolean.default(true),

  // Webhook 
  url: z.string
    .url('URL must be valid')
    .optional,

  method: httpMethodSchema.default('POST').optional,

  headers: z.record(z.string).optional,

  // File 
  filePath: z.string.optional,

  // Custom 
  customHandler: z.string.optional,

  // 
  filter: teeFilterSchema,

  // 
  retries: z.number
    .int('Retries must be an integer')
    .nonnegative('Retries must be non-negative')
    .max(10, 'Maximum 10 retries allowed')
    .default(3)
    .optional,

  timeout: z.number
    .int('Timeout must be an integer')
    .positive('Timeout must be positive')
    .max(30000, 'Timeout must be at most 30 seconds')
    .default(5000)
    .optional,
}).refine(
  (data) => {
    // Webhook  URL
    if (data.type === 'webhook' && !data.url) {
      return false;
    }
    // File  filePath
    if (data.type === 'file' && !data.filePath) {
      return false;
    }
    // Custom  customHandler
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
 *  Tee 
 * Update tee destination input validation (all fields optional)
 */
export const updateTeeDestinationSchema = createTeeDestinationSchema.partial;

// 
export type CreateTeeDestinationInput = z.infer<typeof createTeeDestinationSchema>;
export type UpdateTeeDestinationInput = z.infer<typeof updateTeeDestinationSchema>;
