/**
 * 应用常量配置
 * Application Constants
 */

// ============================================================================
// HTTP 状态码 / HTTP Status Codes
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================================================
// 缓存配置 / Cache Configuration
// ============================================================================

/**
 * 生产环境静态资源缓存时间（秒）
 * Production static asset cache time in seconds
 */
export const STATIC_CACHE_MAX_AGE = 3600; // 1 hour

/**
 * 默认数据库缓存 TTL（毫秒）
 * Default database cache TTL in milliseconds
 */
export const DEFAULT_CACHE_TTL = 30000; // 30 seconds

/**
 * 缓存清理间隔（毫秒）
 * Cache cleanup interval in milliseconds
 */
export const CACHE_CLEANUP_INTERVAL = 60000; // 1 minute

// ============================================================================
// 数据库配置 / Database Configuration
// ============================================================================

/**
 * 请求日志批量插入大小
 * Request log batch insert size
 */
export const REQUEST_BATCH_SIZE = 500;

/**
 * 请求日志刷新间隔（毫秒）
 * Request log flush interval in milliseconds
 */
export const REQUEST_FLUSH_INTERVAL = 1000; // 1 second

/**
 * 默认查询限制
 * Default query limit
 */
export const DEFAULT_QUERY_LIMIT = 100;

// ============================================================================
// 频道配置 / Channel Configuration
// ============================================================================

/**
 * 频道优先级范围
 * Channel priority range
 */
export const CHANNEL_PRIORITY = {
  MIN: 0,
  MAX: 100,
  DEFAULT: 50,
} as const;

/**
 * 频道权重范围
 * Channel weight range
 */
export const CHANNEL_WEIGHT = {
  MIN: 0,
  DEFAULT: 1,
} as const;

// ============================================================================
// 成本计算 / Cost Calculation
// ============================================================================

/**
 * Token 成本计算（每百万 tokens 的美元价格）
 * Token cost calculation (USD per million tokens)
 */
export const TOKEN_COSTS = {
  /** 输入 tokens 成本 / Input tokens cost */
  INPUT_PER_MILLION: 3.0,

  /** 输出 tokens 成本 / Output tokens cost */
  OUTPUT_PER_MILLION: 15.0,

  /** 缓存 tokens 成本 / Cached tokens cost */
  CACHED_PER_MILLION: 0.3,

  /** 百万 / Million */
  MILLION: 1_000_000,
} as const;

// ============================================================================
// 时间常量 / Time Constants
// ============================================================================

export const TIME = {
  /** 1 秒（毫秒）/ 1 second in milliseconds */
  SECOND: 1000,

  /** 1 分钟（毫秒）/ 1 minute in milliseconds */
  MINUTE: 60 * 1000,

  /** 1 小时（毫秒）/ 1 hour in milliseconds */
  HOUR: 60 * 60 * 1000,

  /** 1 天（毫秒）/ 1 day in milliseconds */
  DAY: 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// 内存单位 / Memory Units
// ============================================================================

export const MEMORY = {
  /** 1 KB（字节）/ 1 KB in bytes */
  KB: 1024,

  /** 1 MB（字节）/ 1 MB in bytes */
  MB: 1024 * 1024,

  /** 1 GB（字节）/ 1 GB in bytes */
  GB: 1024 * 1024 * 1024,
} as const;

// ============================================================================
// 应用信息 / Application Info
// ============================================================================

export const APP_INFO = {
  NAME: 'Routex',
  VERSION: '1.1.0-beta',
  DESCRIPTION: 'Next-generation AI API router and load balancer',
  DOCUMENTATION: 'https://github.com/dctx-team/Routex',
} as const;

// ============================================================================
// 默认端点 / Default Endpoints
// ============================================================================

export const ENDPOINTS = {
  HEALTH: '/health',
  API: '/api',
  PROXY: '/v1/messages',
  CHANNELS: '/api/channels',
  ROUTING: '/api/routing/rules',
  ANALYTICS: '/api/analytics',
  METRICS: '/metrics',
  DASHBOARD: '/dashboard',
} as const;
