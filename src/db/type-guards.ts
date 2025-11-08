/**
 * Type Guards for Database Type Conversions
 *
 * Ensures runtime type safety when converting SQLite string values
 * to TypeScript union types
 */

import type { ChannelType, ChannelStatus } from '../types';

/**
 * Valid channel types
 */
const VALID_CHANNEL_TYPES: readonly ChannelType[] = [
  'anthropic',
  'openai',
  'azure',
  'zhipu',
  'google',
  'custom',
] as const;

/**
 * Valid channel statuses
 */
const VALID_CHANNEL_STATUSES: readonly ChannelStatus[] = [
  'enabled',
  'disabled',
  'rate_limited',
  'circuit_breaker',
] as const;

/**
 * Type guard for ChannelType
 * @param type - The type string from database
 * @returns true if type is a valid ChannelType
 */
export function isValidChannelType(type: string): type is ChannelType {
  return VALID_CHANNEL_TYPES.includes(type as ChannelType);
}

/**
 * Type guard for ChannelStatus
 * @param status - The status string from database
 * @returns true if status is a valid ChannelStatus
 */
export function isValidChannelStatus(status: string): status is ChannelStatus {
  return VALID_CHANNEL_STATUSES.includes(status as ChannelStatus);
}

/**
 * Assert that a type is valid, throwing an error if not
 * @param type - The type string to validate
 * @throws Error if type is invalid
 */
export function assertValidChannelType(type: string): asserts type is ChannelType {
  if (!isValidChannelType(type)) {
    throw new Error(
      `Invalid channel type: "${type}". Must be one of: ${VALID_CHANNEL_TYPES.join(', ')}`
    );
  }
}

/**
 * Assert that a status is valid, throwing an error if not
 * @param status - The status string to validate
 * @throws Error if status is invalid
 */
export function assertValidChannelStatus(status: string): asserts status is ChannelStatus {
  if (!isValidChannelStatus(status)) {
    throw new Error(
      `Invalid channel status: "${status}". Must be one of: ${VALID_CHANNEL_STATUSES.join(', ')}`
    );
  }
}
