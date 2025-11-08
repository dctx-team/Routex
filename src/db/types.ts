/**
 * 
 * Database Row Type Definitions
 */

/**
 * 
 * Channel table row type
 */
export interface ChannelRow {
  id: string;
  name: string;
  type: string;
  base_url: string | null;
  api_key: string | null;
  refresh_token: string | null;
  models: string; // JSON 
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
  transformers: string | null; // JSON 
}

/**
 * 
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
 * 
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
 * 
 * Routing rule table row type
 */
export interface RoutingRuleRow {
  id: string;
  name: string;
  type: string;
  condition: string; // JSON 
  target_channel: string;
  target_model: string | null;
  priority: number;
  enabled: number; // SQLite boolean (0/1)
  created_at: number;
  updated_at: number;
}

/**
 * Tee 
 * Tee destination table row type
 */
export interface TeeDestinationRow {
  id: string;
  name: string;
  type: string;
  enabled: number; // SQLite boolean (0/1)
  url: string | null;
  headers: string | null; // JSON 
  method: string | null;
  file_path: string | null;
  custom_handler: string | null;
  filter: string | null; // JSON 
  retries: number;
  timeout: number;
  created_at: number;
  updated_at: number;
}

/**
 * OAuth 
 * OAuth session table row type
 */
export interface OAuthSessionRow {
  id: string;
  channel_id: string | null;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: number;
  scopes: string; // JSON 
  user_info: string | null; // JSON 
  created_at: number;
  updated_at: number;
}

/**
 * 
 * Count query result
 */
export interface CountRow {
  count: number;
}

/**
 * 
 * User version query result
 */
export interface UserVersionRow {
  user_version: number;
}

/**
 * 
 * Generic aggregate query result
 */
export interface AggregateRow {
  [key: string]: number | string | null;
}
