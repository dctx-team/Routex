/**
 * Unified API routes using Hono
 *  Hono  API
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import type { Database } from '../db/database';
import type { ProxyEngine } from '../core/proxy';
import type { LoadBalancer } from '../core/loadbalancer';
import type { SmartRouter } from '../core/routing/smart-router';
import type { TransformerManager } from '../transformers';
import type { CacheWarmer } from '../core/cache-warmer';
import {
  ValidationError,
  NotFoundError,
  RoutexError,
  errorHandler,
  validateRequired,
  validateTypes
} from '../core/errors';
import { createRoutingAPI } from './routing';
import { createTransformersAPI } from './transformers';
import { ChannelTester } from '../services/channel-tester';
import { logRequest, logChannelOperation, logError } from '../utils/logger';
import { providerRegistry } from '../providers';
import { metrics } from '../core/metrics';
import { getPrometheusMetricsResponse } from '../core/prometheus';
import { tracer } from '../core/tracing';
import { i18n } from '../i18n';

export function createAPI(
  db: Database,
  proxy: ProxyEngine,
  loadBalancer: LoadBalancer,
  smartRouter?: SmartRouter,
  transformerManager?: TransformerManager,
  cacheWarmer?: CacheWarmer,
): Hono {
  const app = new Hono;
  const channelTester = new ChannelTester;

  //// CORS middleware / CORS
  app.use('/*', cors);

  //// Static file middleware with caching
  // Cache static assets for 1 hour in production
  const isProduction = process.env.NODE_ENV === 'production';
  const cacheMaxAge = isProduction ? 3600 : 0;

  //// Serve dashboard static assets with caching
  app.get('/dashboard/assets/*', async (c, next) => {
    const response = await serveStatic({ root: './public' })(c, next);

    if (response && isProduction) {
      // Add cache headers for production
      response.headers.set('Cache-Control', `public, max-age=${cacheMaxAge}`);

      // Add ETag support
      const etag = c.req.header('if-none-match');
      if (etag) {
        return new Response(null, { status: 304 });
      }
    }

    return response;
  });

  //// Serve dashboards
  // Enhanced dashboard with CRUD operations
  app.get('/dashboard/enhanced', serveStatic({ path: './public/dashboard-enhanced.html' }));

  // Standard dashboard (read-only)
  app.get('/dashboard', serveStatic({ path: './public/index.html' }));
  app.get('/dashboard/*', serveStatic({ root: './public' }));

  //// Root endpoint - Redirect to enhanced dashboard
  app.get('/', (c) => {
    return c.redirect('/dashboard/enhanced');
  });

  //// API info endpoint
  app.get('/api', (c) => {
    const channels = db.getChannels;
    const enabledChannels = channels.filter((ch) => ch.status === 'enabled');
    const routingRules = db.getEnabledRoutingRules;

    return c.json({
      name: 'Routex',
      version: '1.1.0-beta',
      description: 'Next-generation AI API router and load balancer',
      status: 'running',
      uptime: process.uptime,
      stats: {
        totalChannels: channels.length,
        enabledChannels: enabledChannels.length,
        routingRules: routingRules.length,
        transformers: transformerManager ? transformerManager.list.length : 0,
      },
      loadBalancer: {
        strategy: loadBalancer.getStrategy,
        cacheStats: loadBalancer.getCacheStats,
      },
      endpoints: {
        health: '/health',
        api: '/api',
        proxy: '/v1/messages',
        channels: '/api/channels',
        routing: '/api/routing/rules',
        analytics: '/api/analytics',
      },
      documentation: 'https://github.com/dctx-team/Routex',
      timestamp: new Date.toISOString,
    });
  });

  //// Health check - Basic
  app.get('/health', (c) => {
    return c.json({
      status: 'healthy',
      version: '1.1.0-beta',
      uptime: process.uptime,
      timestamp: new Date.toISOString,
    });
  });

  //// Health check - Detailed
  app.get('/health/detailed', async (c) => {
    const channels = db.getChannels;
    const enabledChannels = channels.filter((ch) => ch.status === 'enabled');
    const routingRules = db.getEnabledRoutingRules;

    // Memory usage
    const memUsage = process.memoryUsage;

    // Check if any channels are configured and enabled
    const hasChannels = channels.length > 0;
    const hasEnabledChannels = enabledChannels.length > 0;

    // Determine overall health status
    let status = 'healthy';
    const issues: string = ;

    if (!hasChannels) {
      status = 'degraded';
      issues.push('No channels configured');
    } else if (!hasEnabledChannels) {
      status = 'degraded';
      issues.push('No enabled channels');
    }

    return c.json({
      status,
      version: '1.1.0-beta',
      uptime: process.uptime,
      timestamp: new Date.toISOString,
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
        memory: {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        },
      },
      channels: {
        total: channels.length,
        enabled: enabledChannels.length,
        disabled: channels.length - enabledChannels.length,
      },
      routing: {
        rules: routingRules.length,
        transformers: transformerManager ? transformerManager.list.length : 0,
      },
      loadBalancer: {
        strategy: loadBalancer.getStrategy,
        cacheSize: loadBalancer.getCacheStats.size,
      },
      issues: issues.length > 0 ? issues : undefined,
    });
  });

  //// Health check - Live (for Kubernetes liveness probe)
  app.get('/health/live', (c) => {
    // Check if the process is responsive
    return c.json({
      status: 'alive',
      timestamp: new Date.toISOString,
    });
  });

  //// Health check - Ready (for Kubernetes readiness probe)
  app.get('/health/ready', (c) => {
    const channels = db.getChannels;
    const enabledChannels = channels.filter((ch) => ch.status === 'enabled');

    // Check if the service is ready to handle traffic
    const isReady = enabledChannels.length > 0;

    if (!isReady) {
      return c.json(
        {
          status: 'not_ready',
          reason: 'No enabled channels available',
          timestamp: new Date.toISOString,
        },
        503,
      );
    }

    return c.json({
      status: 'ready',
      enabledChannels: enabledChannels.length,
      timestamp: new Date.toISOString,
    });
  });

  // ============================================================================
  //// Channel API /  API
  // ============================================================================

  //// List channels
  app.get('/api/channels', (c) => {
    const channels = db.getChannels;
    return c.json({ success: true, data: channels });
  });

  //// Get channel
  app.get('/api/channels/:id', (c) => {
    const id = c.req.param('id');
    const channel = db.getChannel(id);

    if (!channel) {
      throw new NotFoundError(`Channel ${id} not found`);
    }

    return c.json({ success: true, data: channel });
  });

  //// Create channel
  app.post('/api/channels', async (c) => {
    const body = await c.req.json;

    //// Validate required fields
    if (!body.name || !body.type || !body.models || body.models.length === 0) {
      throw new ValidationError('Missing required fields: name, type, models');
    }

    const channel = db.createChannel({
      name: body.name,
      type: body.type,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
      models: body.models,
      priority: body.priority,
      weight: body.weight,
    });

    logChannelOperation('create', channel.name, {
      type: channel.type,
      models: channel.models.length,
    });

    return c.json({ success: true, data: channel }, 201);
  });

  //// Update channel
  app.put('/api/channels/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json;

    const channel = db.updateChannel(id, body);

    logChannelOperation('update', channel.name, {
      channelId: id,
      updates: Object.keys(body),
    });

    return c.json({ success: true, data: channel });
  });

  //// Delete channel
  app.delete('/api/channels/:id', (c) => {
    const id = c.req.param('id');
    const channel = db.getChannel(id);
    const deleted = db.deleteChannel(id);

    if (!deleted) {
      throw new NotFoundError(`Channel ${id} not found`);
    }

    if (channel) {
      logChannelOperation('delete', channel.name, { channelId: id });
    }

    return c.json({ success: true, message: 'Channel deleted' });
  });

  //// Export channels
  app.get('/api/channels/export', (c) => {
    const channels = db.getChannels;
    return c.json({
      version: '1.0',
      exportedAt: new Date.toISOString,
      channels: channels.map((ch) => ({
        name: ch.name,
        type: ch.type,
        baseUrl: ch.baseUrl,
        models: ch.models,
        priority: ch.priority,
        weight: ch.weight,
      })),
    });
  });

  //// Import channels
  app.post('/api/channels/import', async (c) => {
    const body = await c.req.json;
    const { channels, replaceExisting } = body;

    if (!Array.isArray(channels)) {
      throw new ValidationError('Invalid import format');
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors:  as string,
    };

    for (const channelData of channels) {
      try {
        const existing = db.getChannels.find((ch) => ch.name === channelData.name);

        if (existing && !replaceExisting) {
          results.skipped++;
          continue;
        }

        if (existing && replaceExisting) {
          db.deleteChannel(existing.id);
        }

        db.createChannel({
          name: channelData.name,
          type: channelData.type,
          apiKey: channelData.apiKey,
          baseUrl: channelData.baseUrl,
          models: channelData.models,
          priority: channelData.priority,
          weight: channelData.weight,
        });

        results.imported++;
      } catch (error) {
        results.errors.push(
          `Failed to import ${channelData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return c.json({ success: true, data: results });
  });

  // ============================================================================
  //// Channel Testing API /  API
  // ============================================================================

  //// Test a single channel
  app.post('/api/channels/:id/test', async (c) => {
    const id = c.req.param('id');
    const channel = db.getChannel(id);

    if (!channel) {
      throw new NotFoundError(`Channel ${id} not found`);
    }

    const result = await channelTester.testChannel(channel);
    return c.json({ success: true, data: result });
  });

  //// Test all channels
  app.post('/api/channels/test/all', async (c) => {
    const channels = db.getChannels;
    const results = await channelTester.testChannels(channels);
    const summary = channelTester.getTestSummary(results);

    return c.json({
      success: true,
      data: {
        results,
        summary,
      },
    });
  });

  //// Test enabled channels only
  app.post('/api/channels/test/enabled', async (c) => {
    const channels = db.getChannels.filter((ch) => ch.status === 'enabled');
    const results = await channelTester.testChannels(channels);
    const summary = channelTester.getTestSummary(results);

    return c.json({
      success: true,
      data: {
        results,
        summary,
      },
    });
  });

  // ============================================================================
  //// Request Logs API /  API
  // ============================================================================

  //// List requests
  app.get('/api/requests', (c) => {
    const limit = Number(c.req.query('limit') || '100');
    const offset = Number(c.req.query('offset') || '0');

    const requests = db.getRequests(limit, offset);
    return c.json({ success: true, data: requests });
  });

  //// Get requests by channel
  app.get('/api/requests/channel/:channelId', (c) => {
    const channelId = c.req.param('channelId');
    const limit = Number(c.req.query('limit') || '100');

    const requests = db.getRequestsByChannel(channelId, limit);
    return c.json({ success: true, data: requests });
  });

  // ============================================================================
  //// Analytics API /  API
  // ============================================================================

  //// Get analytics
  app.get('/api/analytics', (c) => {
    const analytics = db.getAnalytics;
    return c.json({ success: true, data: analytics });
  });

  // ============================================================================
  // Routing API
  // ============================================================================

  const routingAPI = createRoutingAPI(db, smartRouter);
  app.route('/api/routing', routingAPI);

  // ============================================================================
  // Transformers API / Transformers API
  // ============================================================================

  if (transformerManager) {
    const transformersAPI = createTransformersAPI(transformerManager);
    app.route('/api/transformers', transformersAPI);
  }

  // ============================================================================
  //// Providers API /  API
  // ============================================================================

  //// Get all providers info
  app.get('/api/providers', (c) => {
    const providers = providerRegistry.getAllProvidersInfo;
    return c.json({ success: true, data: providers });
  });

  //// Get specific provider info
  app.get('/api/providers/:type', (c) => {
    const type = c.req.param('type') as any;
    const provider = providerRegistry.getProviderInfo(type);

    if (!provider) {
      throw new NotFoundError(`Provider ${type} not found`);
    }

    return c.json({ success: true, data: provider });
  });

  // ============================================================================
  //// Load Balancer API /  API
  // ============================================================================

  //// Get current strategy
  app.get('/api/load-balancer/strategy', (c) => {
    const strategy = loadBalancer.getStrategy;
    return c.json({ success: true, data: { strategy } });
  });

  //// Update strategy
  app.put('/api/load-balancer/strategy', async (c) => {
    const body = await c.req.json;
    const { strategy } = body;

    if (!strategy || !['priority', 'round_robin', 'weighted', 'least_used'].includes(strategy)) {
      throw new ValidationError('Invalid strategy');
    }

    loadBalancer.setStrategy(strategy);
    return c.json({ success: true, data: { strategy } });
  });

  //// Shortcut endpoints for strategy (for dashboard compatibility)
  app.get('/api/strategy', (c) => {
    const strategy = loadBalancer.getStrategy;
    return c.json({ success: true, data: { strategy } });
  });

  app.put('/api/strategy', async (c) => {
    const body = await c.req.json;
    const { strategy } = body;

    if (!strategy || !['priority', 'round_robin', 'weighted', 'least_used'].includes(strategy)) {
      throw new ValidationError('Invalid strategy');
    }

    loadBalancer.setStrategy(strategy);
    return c.json({ success: true, data: { strategy } });
  });

  // ============================================================================
  //// Tee Destinations API
  // ============================================================================

  //// List tee destinations
  app.get('/api/tee', (c) => {
    const destinations = db.getTeeDestinations;
    return c.json({ success: true, data: destinations });
  });

  //// Get tee destination
  app.get('/api/tee/:id', (c) => {
    const id = c.req.param('id');
    const destination = db.getTeeDestination(id);

    if (!destination) {
      throw new NotFoundError(`Tee destination ${id} not found`);
    }

    return c.json({ success: true, data: destination });
  });

  //// Create tee destination
  app.post('/api/tee', async (c) => {
    const body = await c.req.json;

    //// Validate required fields
    validateRequired(body, ['name', 'type']);
    validateTypes(body, {
      name: 'string',
      type: 'string',
      enabled: 'boolean',
      url: 'string',
      method: 'string',
      filePath: 'string',
      customHandler: 'string',
      retries: 'number',
      timeout: 'number',
    });

    const destination = db.createTeeDestination({
      name: body.name,
      type: body.type,
      enabled: body.enabled,
      url: body.url,
      headers: body.headers,
      method: body.method,
      filePath: body.filePath,
      customHandler: body.customHandler,
      filter: body.filter,
      retries: body.retries,
      timeout: body.timeout,
    });

    // Update proxy engine's tee destinations
    proxy.updateTeeDestinations;

    return c.json({ success: true, data: destination }, 201);
  });

  //// Update tee destination
  app.put('/api/tee/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json;

    const destination = db.updateTeeDestination(id, body);

    // Update proxy engine's tee destinations
    proxy.updateTeeDestinations;

    return c.json({ success: true, data: destination });
  });

  //// Delete tee destination
  app.delete('/api/tee/:id', (c) => {
    const id = c.req.param('id');
    const deleted = db.deleteTeeDestination(id);

    if (!deleted) {
      throw new NotFoundError(`Tee destination ${id} not found`);
    }

    // Update proxy engine's tee destinations
    proxy.updateTeeDestinations;

    return c.json({ success: true, message: 'Tee destination deleted' });
  });

  // ============================================================================
  //// Metrics API
  // ============================================================================

  //// Get metrics summary
  app.get('/api/metrics', (c) => {
    const summary = metrics.getSummary;
    return c.json({ success: true, data: summary });
  });

  //// Get all metrics (detailed)
  app.get('/api/metrics/all', (c) => {
    const allMetrics = metrics.getAllMetrics;
    return c.json({ success: true, data: allMetrics });
  });

  //// Reset metrics
  app.post('/api/metrics/reset', (c) => {
    metrics.reset;
    return c.json({ success: true, message: 'Metrics reset' });
  });

  //// Prometheus metrics endpoint
  app.get('/metrics', (c) => {
    return getPrometheusMetricsResponse;
  });

  // ============================================================================
  //// Tracing API
  // ============================================================================

  //// Get tracing statistics
  app.get('/api/tracing/stats', (c) => {
    const stats = tracer.getStats;
    return c.json({ success: true, data: stats });
  });

  //// Get trace details by ID
  app.get('/api/tracing/traces/:traceId', (c) => {
    const traceId = c.req.param('traceId');
    const spans = tracer.getTraceSpans(traceId);

    if (spans.length === 0) {
      throw new NotFoundError(`Trace ${traceId} not found`);
    }

    return c.json({ success: true, data: { traceId, spans } });
  });

  //// Get specific span
  app.get('/api/tracing/spans/:spanId', (c) => {
    const spanId = c.req.param('spanId');
    const span = tracer.getSpan(spanId);

    if (!span) {
      throw new NotFoundError(`Span ${spanId} not found`);
    }

    return c.json({ success: true, data: span });
  });

  //// Clear old spans
  app.post('/api/tracing/clear', async (c) => {
    const body = await c.req.json.catch( => ({}));
    const olderThanMs = body.olderThanMs || 3600000; // Default 1 hour

    const removedCount = tracer.clearOldSpans(olderThanMs);

    return c.json({
      success: true,
      data: { removedCount, remainingSpans: tracer.getStats.totalSpans },
    });
  });

  // ============================================================================
  //// i18n API
  // ============================================================================

  //// Get current locale
  app.get('/api/i18n/locale', (c) => {
    return c.json({
      success: true,
      data: {
        locale: i18n.getLocale,
        available: ['en', 'zh-CN'],
      },
    });
  });

  //// Set locale
  app.put('/api/i18n/locale', async (c) => {
    const body = await c.req.json;
    const { locale } = body;

    if (!locale || !['en', 'zh-CN'].includes(locale)) {
      throw new ValidationError('Invalid locale. Must be one of: en, zh-CN');
    }

    i18n.setLocale(locale as 'en' | 'zh-CN');

    return c.json({
      success: true,
      data: { locale },
    });
  });

  // ============================================================================
  //// Cache Warmer API /  API
  // ============================================================================

  if (cacheWarmer) {
    //// Get cache warmer stats
    app.get('/api/cache/stats', (c) => {
      const stats = cacheWarmer.getStats;
      return c.json({ success: true, data: stats });
    });

    //// Get cache warmer config
    app.get('/api/cache/config', (c) => {
      const config = cacheWarmer.getConfig;
      return c.json({ success: true, data: config });
    });

    //// Update cache warmer config
    app.put('/api/cache/config', async (c) => {
      const body = await c.req.json;
      cacheWarmer.updateConfig(body);
      return c.json({ success: true, data: cacheWarmer.getConfig });
    });

    //// Manually warm cache
    app.post('/api/cache/warm', async (c) => {
      const body = await c.req.json.catch( => ({}));
      const items = body.items;

      await cacheWarmer.warmCache(items);

      return c.json({
        success: true,
        data: cacheWarmer.getStats,
      });
    });

    //// Invalidate cache
    app.post('/api/cache/invalidate', async (c) => {
      const body = await c.req.json.catch( => ({}));
      const type = body.type;

      cacheWarmer.invalidateCache(type);

      return c.json({
        success: true,
        message: `Cache${type ? ` (${type})` : ''} invalidated`,
      });
    });

    //// Invalidate and warm cache
    app.post('/api/cache/invalidate-and-warm', async (c) => {
      const body = await c.req.json.catch( => ({}));
      const type = body.type;

      await cacheWarmer.invalidateAndWarm(type);

      return c.json({
        success: true,
        data: cacheWarmer.getStats,
      });
    });

    //// Reset cache warmer stats
    app.post('/api/cache/reset-stats', (c) => {
      cacheWarmer.resetStats;
      return c.json({
        success: true,
        message: 'Cache warmer stats reset',
      });
    });
  }

  // ============================================================================
  //// Proxy Endpoint
  // ============================================================================

  //// Forward all /v1/* requests to proxy /  /v1/*
  app.all('/v1/*', async (c) => {
    const start = Date.now;
    try {
      const response = await proxy.handle(c.req.raw);
      const duration = Date.now - start;

      logRequest({
        method: c.req.method,
        url: c.req.url,
        status: response.status,
        duration,
      });

      return response;
    } catch (error) {
      const duration = Date.now - start;
      logRequest({
        method: c.req.method,
        url: c.req.url,
        status: 500,
        duration,
        error: error as Error,
      });
      throw error;
    }
  });

  // ============================================================================
  //// Error Handler
  // ============================================================================

  app.onError((err, c) => {
    logError(err, { component: 'API', path: c.req.path });

    if (err instanceof RoutexError) {
      return c.json(
        {
          success: false,
          ...err.toJSON,
        },
        err.statusCode,
      );
    }

    const handled = errorHandler(err);
    return c.json(
      {
        success: false,
        ...handled.body,
      },
      handled.status,
    );
  });

  return app;
}
