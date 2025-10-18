/**
 * Chinese (Simplified) translations
 */

import type { Translations } from './en';

export const zhCN: Translations = {
  // 
  server: {
    starting: '🎯  Routex...',
    running: '✅ Routex ',
    shutdown: '🛑  Routex...',
    shutdownComplete: '✅ ',
    firstRun: '👋  Routex',
    noChannels: '⚠️  ',
  },

  // 
  init: {
    database: '📦 ...',
    loadBalancer: '⚖️  ...',
    smartRouter: '🧠 ...',
    transformers: '🔄 ...',
    proxy: '🔀 ...',
    routes: '🛣️  ...',
    teeStream: '📤 Tee Stream  {{count}} ',
    teeStreamUpdated: '📤 Tee Stream {{count}} ',
  },

  // 
  channel: {
    created: '',
    updated: '',
    deleted: '',
    notFound: ' {{id}}',
    enabled: '',
    disabled: '',
    testing: ' {{name}}...',
    testSuccess: ' {{name}} ',
    testFailed: ' {{name}} ',
  },

  // 
  routing: {
    smartRouter: '🧠 {{rule}} → {{channel}}',
    loadBalancer: '⚖️  {{channel}}',
    noAvailableChannel: '',
    retry: '⚠️  {{channel}}',
  },

  // 
  circuitBreaker: {
    opened: '🔴  {{channel}} ',
    reset: '🟢  {{channel}} ',
  },

  // 
  transformer: {
    pipeline: '{{count}} ',
    applied: ' {{name}} ',
    error: ' {{name}} ',
  },

  // Tee Stream
  tee: {
    queued: '📤 Tee {{count}} ',
    processing: '📤  tee {{size}} ',
    sent: '✅ Tee {{destination}}',
    retry: '⚠️  Tee  {{attempt}}/{{max}}{{destination}}',
    flushing: '📤  tee ...',
    shutdown: '📤 Tee Stream ',
  },

  // 
  request: {
    succeeded: '✅ {{channel}} ({{latency}}ms)',
    failed: '❌ ',
    forwarding: '📡  {{provider}}',
  },

  // 
  analytics: {
    channelStats: '📡 ',
    totalChannels: '{{total}}',
    enabledChannels: '{{enabled}}',
    disabledChannels: '{{disabled}}',
  },

  // 
  error: {
    validation: '',
    notFound: '',
    channelError: '',
    transformerError: '',
    circuitBreakerOpen: '',
    noAvailableChannel: '',
    maxRetriesExceeded: '',
    unknown: '',
  },

  // API
  api: {
    invalidFormat: '',
    missingFields: '{{fields}}',
    invalidStrategy: '',
    channelDeleted: '',
    teeDestinationDeleted: 'Tee ',
    metricsReset: '',
  },

  // 
  health: {
    healthy: '',
    degraded: '',
    alive: '',
    ready: '',
    notReady: '',
    noChannelsConfigured: '',
    noEnabledChannels: '',
  },

  // 
  gettingStarted: {
    title: '📖 ',
    step1: '',
    step2: ' API ',
  },
};
