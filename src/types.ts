/**
 * Core type definitions for Routex
 * Routex 的核心类型定义
 */

// Channel Types / 渠道类型
// ============================================================================

export type ChannelType = 'anthropic' | 'openai' | 'azure' | 'zhipu' | 'google' | 'custom';

export type ChannelStatus = 'enabled' | 'disabled' | 'rate_limited';

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
  lastUsedAt: number | null;
  createdAt: number;
  updatedAt: number;
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

// Load Balancing / 负载均衡
// ============================================================================

export type LoadBalanceStrategy = 'priority' | 'round_robin' | 'weighted' | 'least_used';

export interface LoadBalancerContext {
  sessionId?: string;
  model?: string;
  requestCount?: number;
}

// Request Types / 请求类型
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

// Analytics / 分析
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

// Configuration / 配置
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

// Errors / 错误
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
