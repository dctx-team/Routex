/**
 * 数据库行类型定义
 * Database Row Type Definitions
 */

/**
 * 频道表行类型
 * Channel table row type
 */
export interface ChannelRow {
  id: string;
  name: string;
  type: string;
  base_url: string | null;
  api_key: string | null;
  refresh_token: string | null;
  models: string; // JSON 字符串
  priority: number;
  weight: number;
  status: string;
  request_count: number;
  success_count: number;
  failure_count: number;
  consecutive_failures: number;
  last_failure_time: number | null;
  circuit_breaker_until: number | null;
  rate_limited_until: number | null;
  last_used_at: number | null;
  created_at: number;
  updated_at: number;
  transformers: string | null; // JSON 字符串
}

/**
 * 请求记录表行类型
 * Request log table row type
 */
export interface RequestRow {
  id: string;
  channel_id: string;
  model: string;
  method: string;
  path: string;
  status_code: number;
  latency: number;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  success: number; // SQLite boolean (0/1)
  error: string | null;
  timestamp: number;
  trace_id: string | null;
}

/**
 * 分析统计查询结果类型
 * Analytics query result type
 */
export interface AnalyticsRow {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_latency: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cached_tokens: number;
}

/**
 * 路由规则表行类型
 * Routing rule table row type
 */
export interface RoutingRuleRow {
  id: string;
  name: string;
  type: string;
  condition: string; // JSON 字符串
  target_channel: string;
  target_model: string | null;
  priority: number;
  enabled: number; // SQLite boolean (0/1)
  created_at: number;
  updated_at: number;
}

/**
 * Tee 目标表行类型
 * Tee destination table row type
 */
export interface TeeDestinationRow {
  id: string;
  name: string;
  type: string;
  enabled: number; // SQLite boolean (0/1)
  url: string | null;
  headers: string | null; // JSON 字符串
  method: string | null;
  file_path: string | null;
  custom_handler: string | null;
  filter: string | null; // JSON 字符串
  retries: number;
  timeout: number;
  created_at: number;
  updated_at: number;
}

/**
 * OAuth 会话表行类型
 * OAuth session table row type
 */
export interface OAuthSessionRow {
  id: string;
  channel_id: string | null;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: number;
  scopes: string; // JSON 字符串
  user_info: string | null; // JSON 字符串
  created_at: number;
  updated_at: number;
}

/**
 * 计数查询结果
 * Count query result
 */
export interface CountRow {
  count: number;
}

/**
 * 用户版本查询结果
 * User version query result
 */
export interface UserVersionRow {
  user_version: number;
}

/**
 * 通用聚合查询结果
 * Generic aggregate query result
 */
export interface AggregateRow {
  [key: string]: number | string | null;
}
