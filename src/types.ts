/**
 * Core type definitions for Routex
 * Routex
 */

//// Channel Types
// ============================================================================

export type ChannelType = 'anthropic' | 'openai' | 'azure' | 'zhipu' | 'google' | 'custom';

export type ChannelStatus = 'enabled' | 'disabled' | 'rate_limited' | 'circuit_breaker';

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  baseUrl?: string;
  apiKey?: string;
  refreshToken?: string | null;
  models: string[];
  priority: number;
  weight: number;
  status: ChannelStatus;
  requestCount: number;
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  circuitBreakerUntil: number | null;
  rateLimitedUntil: number | null;
  lastUsedAt: number | null;
  createdAt: number;
  updatedAt: number;
  //// Transformer configuration / Transformer
  transformers?: TransformerConfig;
}

export interface CreateChannelInput {
  name: string;
  type: ChannelType;
  apiKey?: string;
  baseUrl?: string;
  models: string[];
  priority?: number;
  weight?: number;
}

export interface UpdateChannelInput {
  name?: string;
  apiKey?: string;
  baseUrl?: string;
  models?: string[];
  priority?: number;
  weight?: number;
  status?: ChannelStatus;
}

//// Load Balancing
// ============================================================================

export type LoadBalanceStrategy = 'priority' | 'round_robin' | 'weighted' | 'least_used';

export interface LoadBalancerContext {
  sessionId?: string;
  model?: string;
  requestCount?: number;
}

//// Request Types
// ============================================================================

export interface ParsedRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
  model?: string;
}

export interface ProxyResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  channelId: string;
  latency: number;
}

//// Analytics
// ============================================================================

export interface RequestLog {
  id: string;
  channelId: string;
  model: string;
  method: string;
  path: string;
  statusCode: number;
  latency: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface Analytics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedTokens: number;
  estimatedCost: number;
}

//// Configuration
// ============================================================================

export interface ServerConfig {
  port: number;
  host: string;
  cors?: {
    enabled: boolean;
    origins: string[];
  };
}

export interface DatabaseConfig {
  path: string;
  autoMigration: boolean;
}

export interface Config {
  server: ServerConfig;
  database: DatabaseConfig;
  strategy: LoadBalanceStrategy;
  dashboard: {
    enabled: boolean;
    password?: string;
  };
  firstRun: boolean;
}

//// Errors
// ============================================================================

export class RoutexError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = 'RoutexError';
  }
}

export class ValidationError extends RoutexError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends RoutexError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ServiceUnavailableError extends RoutexError {
  constructor(message: string) {
    super(message, 'SERVICE_UNAVAILABLE', 503);
    this.name = 'ServiceUnavailableError';
  }
}

//// Routing Types
// ============================================================================

export type RoutingRuleType =
  | 'default'
  | 'background'
  | 'think'
  | 'longContext'
  | 'webSearch'
  | 'image'
  | 'custom';

export interface RoutingCondition {
  //// Token threshold for long context / token
  tokenThreshold?: number;
  //// Keywords to match in user message
  keywords?: string[];
  //// Regex pattern for user message
  userPattern?: string;
  //// Custom JavaScript function path / JS
  customFunction?: string;
  //// Model name pattern
  modelPattern?: string;
  //// Check if has tools
  hasTools?: boolean;
  //// Check if has images
  hasImages?: boolean;
}

export interface RoutingRule {
  id: string;
  name: string;
  type: RoutingRuleType;
  condition: RoutingCondition;
  targetChannel: string; //// Channel name or ID / ID
  targetModel?: string; //// Optional specific model
  priority: number; //// Higher priority rules execute first
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateRoutingRuleInput {
  name: string;
  type: RoutingRuleType;
  condition: RoutingCondition;
  targetChannel: string;
  targetModel?: string;
  priority?: number;
}

export interface UpdateRoutingRuleInput {
  name?: string;
  condition?: RoutingCondition;
  targetChannel?: string;
  targetModel?: string;
  priority?: number;
  enabled?: boolean;
}

//// Transformer Types / Transformer
// ============================================================================

export interface TransformerConfig {
  //// Global transformers for all models / transformer
  use?: (string | [string, Record<string, any>])[];
  //// Model-specific transformers / transformer
  [modelName: string]:
    | {
        use?: (string | [string, Record<string, any>])[];
      }
    | undefined;
}

export interface Transformer {
  name: string;
  transformRequest(request: any, options?: any): Promise<any>;
  transformResponse(response: any, options?: any): Promise<any>;
}

//// Message Types
// ============================================================================

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  text?: string;
  source?: ImageSource;
  id?: string;
  name?: string;
  input?: any;
  tool_use_id?: string;
  content?: any;
  [key: string]: any;
}

export interface ImageSource {
  type: 'base64' | 'url';
  media_type?: string;
  data?: string;
  url?: string;
}

export interface Tool {
  name: string;
  description?: string;
  input_schema: Record<string, any>;
}
