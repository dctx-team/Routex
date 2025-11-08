/**
 * 
 * Application Constants
 */

// ============================================================================
// HTTP  / HTTP Status Codes
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
//  / Cache Configuration
// ============================================================================

/**
 * 
 * Production static asset cache time in seconds
 */
export const STATIC_CACHE_MAX_AGE = 3600; // 1 hour

/**
 *  TTL
 * Default database cache TTL in milliseconds
 */
export const DEFAULT_CACHE_TTL = 30000; // 30 seconds

/**
 * 
 * Cache cleanup interval in milliseconds
 */
export const CACHE_CLEANUP_INTERVAL = 60000; // 1 minute

// ============================================================================
//  / Database Configuration
// ============================================================================

/**
 * 
 * Request log batch insert size
 */
export const REQUEST_BATCH_SIZE = 500;

/**
 * 
 * Request log flush interval in milliseconds
 */
export const REQUEST_FLUSH_INTERVAL = 1000; // 1 second

/**
 * 
 * Default query limit
 */
export const DEFAULT_QUERY_LIMIT = 100;

// ============================================================================
//  / Channel Configuration
// ============================================================================

/**
 * 
 * Channel priority range
 */
export const CHANNEL_PRIORITY = {
  MIN: 0,
  MAX: 100,
  DEFAULT: 50,
} as const;

/**
 * 
 * Channel weight range
 */
export const CHANNEL_WEIGHT = {
  MIN: 0,
  DEFAULT: 1,
} as const;

// ============================================================================
//  / Cost Calculation
// ============================================================================

/**
 * Token  tokens 
 * Token cost calculation (USD per million tokens)
 */
export const TOKEN_COSTS = {
  /**  tokens  / Input tokens cost */
  INPUT_PER_MILLION: 3.0,

  /**  tokens  / Output tokens cost */
  OUTPUT_PER_MILLION: 15.0,

  /**  tokens  / Cached tokens cost */
  CACHED_PER_MILLION: 0.3,

  /**  / Million */
  MILLION: 1_000_000,
} as const;

// ============================================================================
//  / Time Constants
// ============================================================================

export const TIME = {
  /** 1 / 1 second in milliseconds */
  SECOND: 1000,

  /** 1 / 1 minute in milliseconds */
  MINUTE: 60 * 1000,

  /** 1 / 1 hour in milliseconds */
  HOUR: 60 * 60 * 1000,

  /** 1 / 1 day in milliseconds */
  DAY: 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
//  / Memory Units
// ============================================================================

export const MEMORY = {
  /** 1 KB/ 1 KB in bytes */
  KB: 1024,

  /** 1 MB/ 1 MB in bytes */
  MB: 1024 * 1024,

  /** 1 GB/ 1 GB in bytes */
  GB: 1024 * 1024 * 1024,
} as const;

// ============================================================================
//  / Application Info
// ============================================================================

export const APP_INFO = {
  NAME: 'Routex',
  VERSION: '1.1.0-beta',
  DESCRIPTION: 'Next-generation AI API router and load balancer',
  DOCUMENTATION: 'https://github.com/dctx-team/Routex',
} as const;

// ============================================================================
//  / Default Endpoints
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
