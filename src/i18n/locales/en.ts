/**
 * English translations
 */

export const en = {
  // Server
  server: {
    starting: 'Starting Routex...',
    running: 'Routex is running!',
    shutdown: 'Shutting down Routex...',
    shutdownComplete: 'Shutdown complete',
    firstRun: 'Welcome to Routex! This is your first time running.',
    noChannels: 'No enabled channels found! Add a channel to start routing requests.',
  },

  // Initialization
  init: {
    database: 'Initializing database...',
    loadBalancer: 'Initializing load balancer...',
    smartRouter: 'Initializing SmartRouter...',
    transformers: 'Initializing TransformerManager...',
    proxy: 'Initializing proxy engine...',
    routes: 'Setting up routes...',
    teeStream: 'Tee Stream initialized with {{count}} destinations',
    teeStreamUpdated: 'Tee Stream destinations updated: {{count}} active',
  },

  // Channels
  channel: {
    created: 'Channel created',
    updated: 'Channel updated',
    deleted: 'Channel deleted',
    notFound: 'Channel {{id}} not found',
    enabled: 'Channel enabled',
    disabled: 'Channel disabled',
    testing: 'Testing channel {{name}}...',
    testSuccess: 'Channel {{name}} test passed',
    testFailed: 'Channel {{name}} test failed',
  },

  // Routing
  routing: {
    smartRouter: 'SmartRouter matched rule: {{rule}} → {{channel}}',
    loadBalancer: 'LoadBalancer selected: {{channel}}',
    noAvailableChannel: 'No available channels',
    retry: 'Retrying with different channel: {{channel}}',
  },

  // Circuit Breaker
  circuitBreaker: {
    opened: 'Circuit breaker opened for channel {{channel}}',
    reset: 'Circuit breaker reset for channel {{channel}}',
  },

  // Transformers
  transformer: {
    pipeline: 'Transformer pipeline: {{count}} transformers',
    applied: 'Transformer {{name}} applied',
    error: 'Transformer {{name}} error',
  },

  // Tee Stream
  tee: {
    queued: 'Tee queued: {{count}} items',
    processing: 'Processing tee batch: {{size}} items',
    sent: 'Tee sent successfully: {{destination}}',
    retry: 'Tee retry {{attempt}}/{{max}}: {{destination}}',
    flushing: 'Flushing tee queue...',
    shutdown: 'Tee Stream shutdown complete',
  },

  // Requests
  request: {
    succeeded: 'Request succeeded: {{channel}} ({{latency}}ms)',
    failed: 'Request failed',
    forwarding: 'Forwarding to {{provider}}',
  },

  // Analytics
  analytics: {
    channelStats: 'Channel statistics',
    totalChannels: 'Total channels: {{total}}',
    enabledChannels: 'Enabled channels: {{enabled}}',
    disabledChannels: 'Disabled channels: {{disabled}}',
  },

  // Errors
  error: {
    validation: 'Validation error',
    notFound: 'Not found',
    channelError: 'Channel error',
    transformerError: 'Transformer error',
    circuitBreakerOpen: 'Circuit breaker is open',
    noAvailableChannel: 'No available channels',
    maxRetriesExceeded: 'Max retries exceeded',
    unknown: 'Unknown error',
  },

  // API
  api: {
    invalidFormat: 'Invalid format',
    missingFields: 'Missing required fields: {{fields}}',
    invalidStrategy: 'Invalid strategy',
    channelDeleted: 'Channel deleted',
    teeDestinationDeleted: 'Tee destination deleted',
    metricsReset: 'Metrics reset',
  },

  // Health
  health: {
    healthy: 'Healthy',
    degraded: 'Degraded',
    alive: 'Alive',
    ready: 'Ready',
    notReady: 'Not ready',
    noChannelsConfigured: 'No channels configured',
    noEnabledChannels: 'No enabled channels available',
  },

  // Getting Started
  gettingStarted: {
    title: 'Getting started guide',
    step1: 'Create your first channel',
    step2: 'Read the API documentation',
  },
};

export type Translations = typeof en;
