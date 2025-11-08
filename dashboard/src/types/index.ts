export interface Channel {
  id: string;
  name: string;
  type: 'anthropic' | 'openai' | 'azure' | 'zhipu' | 'google' | 'custom';
  baseUrl?: string;
  apiKey?: string;
  refreshToken?: string | null;
  models: string[];
  priority: number;
  weight: number;
  status: 'enabled' | 'disabled' | 'rate_limited' | 'circuit_breaker';
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
}

export interface SystemStatus {
  version: string;
  uptime: number;
  loadBalancer: {
    strategy: 'priority' | 'round_robin' | 'weighted' | 'least_used';
    cacheStats: {
      size: number;
      maxSize: number;
      utilizationPercent: number;
    };
  };
  stats: {
    totalChannels: number;
    enabledChannels: number;
    routingRules: number;
    transformers: number;
  };
  endpoints: Record<string, string>;
}

export interface ChannelFormData {
  name: string;
  type: Channel['type'];
  baseUrl: string;
  apiKey: string;
  models: string;
  priority: number;
  weight: number;
  status: 'enabled' | 'disabled';
}

export type LoadBalancerStrategy = 'priority' | 'round_robin' | 'weighted' | 'least_used';

export type Tab = 'overview' | 'channels' | 'routing' | 'transformers' | 'tee' | 'analytics' | 'logs' | 'tracing' | 'metrics' | 'cache' | 'providers' | 'oauth' | 'settings';

// Analytics types
export interface Analytics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  averageLatency: number;
  medianLatency: number;
  p95Latency: number;
  p99Latency: number;
  totalTokensUsed: number;
  totalCost: number;
  requestsByChannel: Record<string, number>;
  requestsByModel: Record<string, number>;
  errorsByType: Record<string, number>;
  latencyByChannel: Record<string, number>;
  timeSeriesData?: {
    timestamp: string;
    requests: number;
    latency: number;
  }[];
}

// Request log types
export interface RequestLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  channelId: string;
  channelName: string;
  model: string;
  status: number;
  latency: number;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  error?: string;
  traceId?: string;
}

// Routing rule types
export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  conditions: {
    model?: string[];
    path?: string;
    header?: Record<string, string>;
    models?: string[];
    userIds?: string[];
    tags?: string[];
    customCondition?: string;
  };
  actions?: {
    channelId?: string;
    transformer?: string;
  };
  action?: {
    type: 'route' | 'block' | 'transform';
    channelIds?: string[];
    transformers?: string[];
    message?: string;
  };
  description?: string;
  createdAt: string | number;
  updatedAt: string | number;
}

// Cache warmer types
export interface CacheStats {
  enabled: boolean;
  totalWarms: number;
  successfulWarms: number;
  failedWarms: number;
  lastWarmTime?: string;
  cacheHitRate: number;
  itemsInCache: number;
}

export interface CacheConfig {
  enabled: boolean;
  interval: number;
  maxConcurrency: number;
  warmOnStartup: boolean;
  items: CacheItem[];
}

export interface CacheItem {
  model: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
}

// Metrics types
export interface Metrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number;
  };
  latency: {
    average: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: {
    total: number;
    byChannel: Record<string, number>;
    byModel: Record<string, number>;
  };
  channels: {
    active: number;
    inactive: number;
    errored: number;
  };
  system: {
    uptime: number;
    memoryUsage: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
      external: string;
    };
    cpuUsage?: number;
  };
}

// Channel test result types
export interface ChannelTestResult {
  channelId: string;
  channelName: string;
  success: boolean;
  latency?: number;
  error?: string;
  statusCode?: number;
  timestamp: string;
  model?: string;
  provider?: string;
}

// Tee destination types
export interface TeeDestination {
  id: string;
  name: string;
  type: 'http' | 'webhook' | 'file' | 'custom';
  enabled: boolean;
  url?: string;
  headers?: Record<string, string>;
  method?: string;
  filePath?: string;
  customHandler?: string;
  filter?: {
    models?: string[];
    statusCodes?: number[];
    customCondition?: string;
  };
  retries?: number;
  timeout?: number;
  createdAt: string | number;
  updatedAt: string | number;
}

// Transformer types
export interface Transformer {
  id: string;
  name: string;
  type: 'builtin' | 'custom';
  enabled: boolean;
  priority: number;
  config?: Record<string, any>;
  description?: string;
}

// Tracing types
export interface TraceStats {
  totalTraces: number;
  totalSpans: number;
  avgDuration: number;
  activeSpans: number;
}

export interface Trace {
  traceId: string;
  spans: Span[];
}

export interface Span {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes?: Record<string, any>;
  events?: any[];
  status?: string;
}

// Provider types
export interface Provider {
  type: string;
  name: string;
  defaultBaseUrl: string;
  supportedModels: string[];
  features: string[];
}
