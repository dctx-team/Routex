/**
 *  API  Hono 
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { z } from 'zod';
import type { Database } from '../db/database';
import type { ProxyEngine } from '../core/proxy';
import type { LoadBalancer } from '../core/loadbalancer';
import type { SmartRouter } from '../core/routing/smart-router';
import type { TransformerManager } from '../transformers';
import type { CacheWarmer } from '../core/cache-warmer';
import type { OAuthService } from '../auth/oauth';
import type { ChannelType } from '../types';
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
import { logRequest, logChannelOperation, logError, logger } from '../utils/logger';
import { providerRegistry } from '../providers';
import { metrics } from '../core/metrics';
import { getPrometheusMetricsResponse } from '../core/prometheus';
import { tracer } from '../core/tracing';
import { i18n } from '../i18n';
import { ConfigManager } from '../config/config';
import { HTTP_STATUS, STATIC_CACHE_MAX_AGE, DEFAULT_QUERY_LIMIT, CHANNEL_PRIORITY, APP_INFO, ENDPOINTS } from '../core/constants';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import {
  createChannelSchema,
  updateChannelSchema,
  idParamSchema,
  requestLogQuerySchema,
  updateStrategySchema,
  createTeeDestinationSchema,
  updateTeeDestinationSchema,
  updateLocaleSchema,
  updateLogLevelSchema,
  cacheInvalidationSchema,
  tracingCleanupSchema,
  channelImportSchema,
  configSaveSchema,
} from '../schemas';

export function createAPI(
  db: Database,
  proxy: ProxyEngine,
  loadBalancer: LoadBalancer,
  smartRouter?: SmartRouter,
  transformerManager?: TransformerManager,
  cacheWarmer?: CacheWarmer,
  oauthService?: OAuthService,
): Hono {
  const app = new Hono;
  const channelTester = new ChannelTester;

  // CORS
  const config = ConfigManager.getInstance.getConfig;
  if (config.server.cors.enabled) {
    const corsOrigins = config.server.cors.origins;
    app.use('/*', cors({
      origin: corsOrigins.includes('*') ? '*' : corsOrigins,
      credentials: true,
    }));
  }

  //  ID  -  requestId
  app.use('/*', async (c, next) => {
    //  header  requestId
    const requestId = c.req.header('x-request-id') || crypto.randomUUID;

    //  context 
    c.set('requestId', requestId);

    //  header
    c.header('x-request-id', requestId);

    await next;
  });

  // ============================================================================
  // 
  // Rate Limiting Middleware (Global)
  // ============================================================================

  // 
  const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED !== 'false';
  const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || 100;
  const rateLimitWindow = Number(process.env.RATE_LIMIT_WINDOW) || 60000; // 1 

  if (rateLimitEnabled) {
    const { createRateLimiter } = await import('../middleware/rate-limit');

    const rateLimiter = createRateLimiter({
      windowMs: rateLimitWindow,
      max: rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests from this IP, please try again later.',
    });

    //  API 
    app.use('/api/*', rateLimiter);
    app.use('/v1/*', rateLimiter);

    logger.info('🛡️  Rate limiting enabled', {
      max: rateLimitMax,
      window: `${rateLimitWindow}ms`,
    });
  }

  // 
  //  1 
  const isProduction = process.env.NODE_ENV === 'production';
  const cacheMaxAge = isProduction ? STATIC_CACHE_MAX_AGE : 0;

  // 
  const dashboardPath = './public/dashboard';

  // 
  app.get('/dashboard/assets/*', async (c) => {
    const filePath = c.req.path.replace('/dashboard', dashboardPath);
    const file = Bun.file(filePath);

    if (await file.exists) {
      return new Response(file, {
        headers: {
          'Content-Type': file.type,
          'Cache-Control': isProduction ? `public, max-age=${cacheMaxAge}` : 'no-cache',
        },
      });
    }

    return c.notFound;
  });

  //  HTML
  app.get('/dashboard', async (c) => {
    const file = Bun.file(`${dashboardPath}/index.html`);
    if (await file.exists) {
      return new Response(file, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }
    return c.notFound;
  });

  app.get('/dashboard/', async (c) => {
    const file = Bun.file(`${dashboardPath}/index.html`);
    if (await file.exists) {
      return new Response(file, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }
    return c.notFound;
  });

  //
  app.get('/', (c) => {
    return c.redirect('/dashboard/');
  });

  // API 
  app.get('/api', (c) => {
    const channels = db.getChannels;
    const enabledChannels = channels.filter((ch) => ch.status === 'enabled');
    const routingRules = db.getEnabledRoutingRules;

    return c.json({
      name: APP_INFO.NAME,
      version: APP_INFO.VERSION,
      description: APP_INFO.DESCRIPTION,
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
        health: ENDPOINTS.HEALTH,
        api: ENDPOINTS.API,
        proxy: ENDPOINTS.PROXY,
        channels: ENDPOINTS.CHANNELS,
        routing: ENDPOINTS.ROUTING,
        analytics: ENDPOINTS.ANALYTICS,
      },
      documentation: APP_INFO.DOCUMENTATION,
      timestamp: new Date.toISOString,
    });
  });

  //
  app.get('/health', (c) => {
    return c.json({
      status: 'healthy',
      version: APP_INFO.VERSION,
      uptime: process.uptime,
      timestamp: new Date.toISOString,
    });
  });

  //
  app.get('/health/detailed', async (c) => {
    const channels = db.getChannels;
    const enabledChannels = channels.filter((ch) => ch.status === 'enabled');
    const routingRules = db.getEnabledRoutingRules;

    // 
    const memUsage = process.memoryUsage;

    // 
    const dbConnected = db.isConnected;

    // 
    const hasChannels = channels.length > 0;
    const hasEnabledChannels = enabledChannels.length > 0;

    // 
    let status = 'healthy';
    const issues: string = ;

    if (!dbConnected) {
      status = 'unhealthy';
      issues.push('Database connection failed');
    }

    if (!hasChannels) {
      status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
      issues.push('No channels configured');
    } else if (!hasEnabledChannels) {
      status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
      issues.push('No enabled channels');
    }

    return c.json({
      status,
      version: APP_INFO.VERSION,
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
      database: {
        connected: dbConnected,
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

  //  -  Kubernetes liveness probe
  app.get('/health/live', (c) => {
    // 
    return c.json({
      status: 'alive',
      timestamp: new Date.toISOString,
    });
  });

  //  -  Kubernetes readiness probe
  app.get('/health/ready', (c) => {
    const channels = db.getChannels;
    const enabledChannels = channels.filter((ch) => ch.status === 'enabled');

    // 
    const isReady = enabledChannels.length > 0;

    if (!isReady) {
      return c.json(
        {
          status: 'not_ready',
          reason: 'No enabled channels available',
          timestamp: new Date.toISOString,
        },
        HTTP_STATUS.SERVICE_UNAVAILABLE,
      );
    }

    return c.json({
      status: 'ready',
      enabledChannels: enabledChannels.length,
      timestamp: new Date.toISOString,
    });
  });

  // ============================================================================
  //  API
  // ============================================================================

  // 
  app.get('/api/channels', (c) => {
    const channels = db.getChannels;
    return c.json({ success: true, data: channels });
  });

  // 
  app.get('/api/channels/:id', validateParams(idParamSchema), (c) => {
    const { id } = c.get('validatedParams');
    const channel = db.getChannel(id);

    if (!channel) {
      throw new NotFoundError(`Channel ${id} not found`);
    }

    return c.json({ success: true, data: channel });
  });

  // 
  app.post('/api/channels', validateBody(createChannelSchema), async (c) => {
    const body = c.get('validatedBody');

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

    c.status(HTTP_STATUS.CREATED);
    return c.json({ success: true, data: channel });
  });

  // 
  app.put('/api/channels/:id', validateParams(idParamSchema), validateBody(updateChannelSchema), async (c) => {
    const { id } = c.get('validatedParams');
    const body = c.get('validatedBody');

    const channel = db.updateChannel(id, body);

    logChannelOperation('update', channel.name, {
      channelId: id,
      updates: Object.keys(body),
    });

    return c.json({ success: true, data: channel });
  });

  // 
  app.delete('/api/channels/:id', validateParams(idParamSchema), (c) => {
    const { id } = c.get('validatedParams');
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

  // 
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

  // 
  app.post('/api/channels/import', validateBody(channelImportSchema), async (c) => {
    const { channels, replaceExisting } = c.get('validatedBody');

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
  //  API
  // ============================================================================

  // 
  app.post('/api/channels/:id/test', validateParams(idParamSchema), async (c) => {
    const { id } = c.get('validatedParams');
    const channel = db.getChannel(id);

    if (!channel) {
      throw new NotFoundError(`Channel ${id} not found`);
    }

    const result = await channelTester.testChannel(channel);
    return c.json({ success: true, data: result });
  });

  // 
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

  // 
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
  //  API
  // ============================================================================

  //  +  + 
  app.get('/api/requests', validateQuery(requestLogQuerySchema), (c) => {
    const query = c.get('validatedQuery');

    const { rows, total } = db.getRequestsFiltered(query);

    const channels = db.getChannels;
    const channelMap = new Map(channels.map((ch) => [ch.id, ch.name]));

    const data = rows.map((r) => {
      const input = r.inputTokens || 0;
      const output = r.outputTokens || 0;
      const cached = r.cachedTokens || 0;
      const cost = (input / 1_000_000) * 3.0 + (output / 1_000_000) * 15.0 + (cached / 1_000_000) * 0.3;
      return {
        id: r.id,
        timestamp: r.timestamp,
        method: r.method,
        path: r.path,
        channelId: r.channelId,
        channelName: channelMap.get(r.channelId) || r.channelId,
        model: r.model,
        status: r.statusCode,
        latency: r.latency,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        cost,
        error: r.error,
        traceId: r.traceId,
      };
    });
    return c.json({ success: true, data, meta: { total, limit, offset, timestamp: new Date.toISOString } });
  });

  // 
  app.get('/api/requests/channel/:channelId', validateParams(idParamSchema), (c) => {
    const { id: channelId } = c.get('validatedParams');
    const limit = Number(c.req.query('limit') || String(DEFAULT_QUERY_LIMIT));

    const requests = db.getRequestsByChannel(channelId, limit);
    const channel = db.getChannel(channelId);

    const data = requests.map((r) => {
      const input = r.inputTokens || 0;
      const output = r.outputTokens || 0;
      const cached = r.cachedTokens || 0;
      const cost = (input / 1_000_000) * 3.0 + (output / 1_000_000) * 15.0 + (cached / 1_000_000) * 0.3;
      return {
        id: r.id,
        timestamp: r.timestamp,
        method: r.method,
        path: r.path,
        channelId: r.channelId,
        channelName: channel?.name || r.channelId,
        model: r.model,
        status: r.statusCode,
        latency: r.latency,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        cost,
        error: r.error,
      };
    });

    return c.json({ success: true, data });
  });

  // ============================================================================
  //  API
  // ============================================================================

  // 
  app.get('/api/analytics', (c) => {
    const analytics = db.getAnalytics;
    return c.json({ success: true, data: analytics });
  });

  // ============================================================================
  //  API
  // ============================================================================

  const routingAPI = createRoutingAPI(db, smartRouter);
  app.route('/api/routing', routingAPI);

  // ============================================================================
  //  API
  // ============================================================================

  if (transformerManager) {
    const transformersAPI = createTransformersAPI(transformerManager);
    app.route('/api/transformers', transformersAPI);
  }

  // ============================================================================
  //  API
  // ============================================================================

  // 
  app.get('/api/providers', (c) => {
    const providers = providerRegistry.getAllProvidersInfo;
    return c.json({ success: true, data: providers });
  });

  // 
  app.get('/api/providers/:type', validateParams(z.object({ type: z.string })), (c) => {
    const type = c.req.param('type') as ChannelType;
    const provider = providerRegistry.getProviderInfo(type);

    if (!provider) {
      throw new NotFoundError(`Provider ${type} not found`);
    }

    return c.json({ success: true, data: provider });
  });

  // ============================================================================
  //  API
  // ============================================================================

  // 
  app.get('/api/load-balancer/strategy', (c) => {
    const strategy = loadBalancer.getStrategy;
    return c.json({ success: true, data: { strategy } });
  });

  // 
  app.put('/api/load-balancer/strategy', validateBody(updateStrategySchema), async (c) => {
    const { strategy } = c.get('validatedBody');

    loadBalancer.setStrategy(strategy);
    return c.json({ success: true, data: { strategy } });
  });

  // 
  app.get('/api/strategy', (c) => {
    const strategy = loadBalancer.getStrategy;
    return c.json({ success: true, data: { strategy } });
  });

  app.put('/api/strategy', validateBody(updateStrategySchema), async (c) => {
    const { strategy } = c.get('validatedBody');

    loadBalancer.setStrategy(strategy);
    return c.json({ success: true, data: { strategy } });
  });

  // ============================================================================
  // Tee  API
  // ============================================================================

  //  tee 
  app.get('/api/tee', (c) => {
    const destinations = db.getTeeDestinations;
    return c.json({ success: true, data: destinations });
  });

  //  tee 
  app.get('/api/tee/:id', validateParams(idParamSchema), (c) => {
    const { id } = c.get('validatedParams');
    const destination = db.getTeeDestination(id);

    if (!destination) {
      throw new NotFoundError(`Tee destination ${id} not found`);
    }

    return c.json({ success: true, data: destination });
  });

  //  tee 
  app.post('/api/tee', validateBody(createTeeDestinationSchema), async (c) => {
    const body = c.get('validatedBody');

    const destination = db.createTeeDestination(body);

    //  tee 
    proxy.updateTeeDestinations;

    c.status(HTTP_STATUS.CREATED);
    return c.json({ success: true, data: destination });
  });

  //  tee 
  app.put('/api/tee/:id', validateParams(idParamSchema), validateBody(updateTeeDestinationSchema), async (c) => {
    const { id } = c.get('validatedParams');
    const body = c.get('validatedBody');

    const destination = db.updateTeeDestination(id, body);

    //  tee 
    proxy.updateTeeDestinations;

    return c.json({ success: true, data: destination });
  });

  //  tee 
  app.delete('/api/tee/:id', validateParams(idParamSchema), (c) => {
    const { id } = c.get('validatedParams');
    const deleted = db.deleteTeeDestination(id);

    if (!deleted) {
      throw new NotFoundError(`Tee destination ${id} not found`);
    }

    //  tee 
    proxy.updateTeeDestinations;

    return c.json({ success: true, message: 'Tee destination deleted' });
  });

  // ============================================================================
  //  API
  // ============================================================================

  // 
  app.get('/api/metrics', (c) => {
    const summary = metrics.getSummary;
    return c.json({ success: true, data: summary });
  });

  // 
  app.get('/api/metrics/all', (c) => {
    const allMetrics = metrics.getAllMetrics;
    return c.json({ success: true, data: allMetrics });
  });

  // 
  app.post('/api/metrics/reset', (c) => {
    metrics.reset;
    return c.json({ success: true, message: 'Metrics reset' });
  });

  // Prometheus 
  app.get('/metrics',  => {
    return getPrometheusMetricsResponse;
  });

  // ============================================================================
  //  API
  // ============================================================================

  // 
  app.get('/api/tracing/stats', (c) => {
    const stats = tracer.getStats;
    return c.json({ success: true, data: stats });
  });

  //  ID 
  app.get('/api/tracing/traces/:traceId', validateParams(idParamSchema), (c) => {
    const { id: traceId } = c.get('validatedParams');
    const spans = tracer.getTraceSpans(traceId);

    if (spans.length === 0) {
      throw new NotFoundError(`Trace ${traceId} not found`);
    }

    return c.json({ success: true, data: { traceId, spans } });
  });

  //  span
  app.get('/api/tracing/spans/:spanId', validateParams(idParamSchema), (c) => {
    const { id: spanId } = c.get('validatedParams');
    const span = tracer.getSpan(spanId);

    if (!span) {
      throw new NotFoundError(`Span ${spanId} not found`);
    }

    return c.json({ success: true, data: span });
  });

  //  span
  app.post('/api/tracing/clear', validateBody(tracingCleanupSchema), async (c) => {
    const { olderThanMs } = c.get('validatedBody');

    const removedCount = tracer.clearOldSpans(olderThanMs);

    return c.json({
      success: true,
      data: { removedCount, remainingSpans: tracer.getStats.totalSpans },
    });
  });

  // ============================================================================
  //  API
  // ============================================================================

  // 
  app.get('/api/i18n/locale', (c) => {
    return c.json({
      success: true,
      data: {
        locale: i18n.getLocale,
        available: ['en', 'zh-CN'],
      },
    });
  });

  // 
  app.put('/api/i18n/locale', validateBody(updateLocaleSchema), async (c) => {
    const { locale } = c.get('validatedBody');

    i18n.setLocale(locale);

    return c.json({
      success: true,
      data: { locale },
    });
  });

  // ============================================================================
  //  API
  // ============================================================================

  // 
  app.get('/api/logging/config', async (c) => {
    const { getLogConfig } = await import('../utils/logger');
    const config = getLogConfig;
    return c.json({ success: true, data: config });
  });

  // 
  app.put('/api/logging/modules/:moduleName/level', validateBody(updateLogLevelSchema), async (c) => {
    const moduleName = c.req.param('moduleName');
    const { level } = c.get('validatedBody');

    const { setModuleLogLevel } = await import('../utils/logger');
    setModuleLogLevel(moduleName, level);

    return c.json({
      success: true,
      data: { moduleName, level },
      message: `Log level for module '${moduleName}' set to '${level}'`,
    });
  });

  // ============================================================================
  //  API
  // ============================================================================

  // 
  app.get('/api/config', async (c) => {
    const { ConfigManager } = await import('../config/config');
    const configManager = ConfigManager.getInstance;
    const config = configManager.getConfig;

    return c.json({ success: true, data: config });
  });

  // 
  app.get('/api/config/path', async (c) => {
    const { ConfigManager } = await import('../config/config');
    const configManager = ConfigManager.getInstance;
    const path = configManager.getConfigFilePath;

    return c.json({
      success: true,
      data: { path: path || null }
    });
  });

  // 
  app.put('/api/config', async (c) => {
    const body = await c.req.json;
    const { ConfigManager, ConfigValidationError } = await import('../config/config');
    const configManager = ConfigManager.getInstance;

    try {
      configManager.updateConfig(body);
      return c.json({
        success: true,
        data: configManager.getConfig,
        message: 'Configuration updated successfully'
      });
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        throw new ValidationError(error.message);
      }
      throw error;
    }
  });

  // 
  app.post('/api/config/reload', async (c) => {
    const { ConfigManager } = await import('../config/config');
    const configManager = ConfigManager.getInstance;

    try {
      configManager.reloadConfig;
      return c.json({
        success: true,
        data: configManager.getConfig,
        message: 'Configuration reloaded successfully'
      });
    } catch (error) {
      throw new ValidationError(
        error instanceof Error ? error.message : 'Failed to reload configuration'
      );
    }
  });

  // 
  app.post('/api/config/save', validateBody(configSaveSchema), async (c) => {
    const { path } = c.get('validatedBody');

    const { ConfigManager } = await import('../config/config');
    const configManager = ConfigManager.getInstance;

    try {
      configManager.saveConfig(path);
      return c.json({
        success: true,
        data: { path: configManager.getConfigFilePath },
        message: 'Configuration saved successfully'
      });
    } catch (error) {
      throw new ValidationError(
        error instanceof Error ? error.message : 'Failed to save configuration'
      );
    }
  });

  //  JSON
  app.get('/api/config/export', async (c) => {
    const { ConfigManager } = await import('../config/config');
    const configManager = ConfigManager.getInstance;
    const configJson = configManager.exportConfig;

    return new Response(configJson, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=routex-config-${Date.now}.json`,
      },
    });
  });

  // ============================================================================
  //  API
  // ============================================================================

  if (cacheWarmer) {
    // 
    app.get('/api/cache/stats', (c) => {
      const stats = cacheWarmer.getStats;
      return c.json({ success: true, data: stats });
    });

    // 
    app.get('/api/cache/config', (c) => {
      const config = cacheWarmer.getConfig;
      return c.json({ success: true, data: config });
    });

    // 
    app.put('/api/cache/config', async (c) => {
      const body = await c.req.json;
      cacheWarmer.updateConfig(body);
      return c.json({ success: true, data: cacheWarmer.getConfig });
    });

    // 
    app.post('/api/cache/warm', async (c) => {
      const body = await c.req.json.catch( => ({}));
      const items = body.items;

      await cacheWarmer.warmCache(items);

      return c.json({
        success: true,
        data: cacheWarmer.getStats,
      });
    });

    // 
    app.post('/api/cache/invalidate', validateBody(cacheInvalidationSchema), async (c) => {
      const { type } = c.get('validatedBody');

      cacheWarmer.invalidateCache(type);

      return c.json({
        success: true,
        message: `Cache${type ? ` (${type})` : ''} invalidated`,
      });
    });

    // 
    app.post('/api/cache/invalidate-and-warm', validateBody(cacheInvalidationSchema), async (c) => {
      const { type } = c.get('validatedBody');

      await cacheWarmer.invalidateAndWarm(type);

      return c.json({
        success: true,
        data: cacheWarmer.getStats,
      });
    });

    // 
    app.post('/api/cache/reset-stats', (c) => {
      cacheWarmer.resetStats;
      return c.json({
        success: true,
        message: 'Cache warmer stats reset',
      });
    });
  }

  // ============================================================================
  //  API
  // ============================================================================

  // 
  app.get('/api/database/cache/stats', (c) => {
    const stats = db.getCacheStats;
    return c.json({ success: true, data: stats });
  });

  // 
  app.post('/api/database/performance/reset', (c) => {
    db.resetPerformanceMetrics;
    return c.json({
      success: true,
      message: 'Database performance metrics reset',
    });
  });

  // ============================================================================
  // OAuth  API
  // ============================================================================

  if (oauthService) {
    //  OAuth 
    app.get('/api/oauth/providers', (c) => {
      const providers = Array.from(oauthService['configs'].keys);
      return c.json({
        success: true,
        data: providers.map(provider => ({
          name: provider,
          enabled: true,
        }))
      });
    });

    //  URL
    app.get('/api/oauth/:provider/authorize', (c) => {
      const provider = c.req.param('provider') as ChannelType;

      //  state  CSRF 
      const state = crypto.randomUUID;

      try {
        const url = oauthService.generateAuthUrl(provider, state);
        return c.json({
          success: true,
          data: {
            url,
            state,
            provider
          }
        });
      } catch (error) {
        throw new ValidationError(error instanceof Error ? error.message : 'Failed to generate authorization URL');
      }
    });

    //  OAuth 
    app.get('/api/oauth/callback', async (c) => {
      const code = c.req.query('code');
      const state = c.req.query('state');
      const provider = c.req.query('provider') as ChannelType;
      const error = c.req.query('error');
      const errorDescription = c.req.query('error_description');

      if (error) {
        return c.json({
          success: false,
          error: errorDescription || error
        }, HTTP_STATUS.BAD_REQUEST);
      }

      if (!code || !state || !provider) {
        throw new ValidationError('Missing required parameters: code, state, provider');
      }

      try {
        const session = await oauthService.exchangeCode(provider, code, state);

        // 
        return c.redirect(`/dashboard?oauth=success&sessionId=${session.id}&provider=${provider}`);
      } catch (error) {
        // 
        const message = error instanceof Error ? error.message : 'OAuth authentication failed';
        return c.redirect(`/dashboard?oauth=error&message=${encodeURIComponent(message)}`);
      }
    });

    //  OAuth 
    app.get('/api/oauth/sessions', (c) => {
      const sessions = db.getOAuthSessions;

      //  token
      const safeSessions = sessions.map(session => ({
        id: session.id,
        channelId: session.channelId,
        provider: session.provider,
        expiresAt: session.expiresAt,
        scopes: session.scopes,
        userInfo: session.userInfo,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        isExpired: Date.now >= session.expiresAt - 60000,
      }));

      return c.json({ success: true, data: safeSessions });
    });

    //  OAuth 
    app.get('/api/oauth/sessions/:sessionId', (c) => {
      const sessionId = c.req.param('sessionId');
      const session = oauthService.getSession(sessionId);

      if (!session) {
        throw new NotFoundError(`OAuth session ${sessionId} not found`);
      }

      //  token
      const safeSession = {
        id: session.id,
        channelId: session.channelId,
        provider: session.provider,
        expiresAt: session.expiresAt,
        scopes: session.scopes,
        userInfo: session.userInfo,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        isExpired: oauthService.isTokenExpired(session),
      };

      return c.json({ success: true, data: safeSession });
    });

    //  OAuth token
    app.post('/api/oauth/sessions/:sessionId/refresh', async (c) => {
      const sessionId = c.req.param('sessionId');

      try {
        const session = await oauthService.refreshToken(sessionId);

        const safeSession = {
          id: session.id,
          channelId: session.channelId,
          provider: session.provider,
          expiresAt: session.expiresAt,
          updatedAt: session.updatedAt,
        };

        return c.json({ success: true, data: safeSession });
      } catch (error) {
        throw new ValidationError(error instanceof Error ? error.message : 'Failed to refresh token');
      }
    });

    //  OAuth 
    app.post('/api/oauth/sessions/:sessionId/link/:channelId', validateParams(z.object({
      sessionId: z.string,
      channelId: z.string
    })), async (c) => {
      const { sessionId, channelId } = c.get('validatedParams');

      // 
      const channel = db.getChannel(channelId);
      if (!channel) {
        throw new NotFoundError(`Channel ${channelId} not found`);
      }

      try {
        await oauthService.linkSessionToChannel(sessionId, channelId);
        return c.json({
          success: true,
          message: `Session ${sessionId} linked to channel ${channelId}`
        });
      } catch (error) {
        throw new ValidationError(error instanceof Error ? error.message : 'Failed to link session to channel');
      }
    });

    //  OAuth 
    app.delete('/api/oauth/sessions/:sessionId', validateParams(idParamSchema), async (c) => {
      const { id: sessionId } = c.get('validatedParams');

      try {
        await oauthService.revokeSession(sessionId);
        return c.json({
          success: true,
          message: `OAuth session ${sessionId} revoked`
        });
      } catch (error) {
        throw new ValidationError(error instanceof Error ? error.message : 'Failed to revoke session');
      }
    });

    //  OAuth 
    app.get('/api/channels/:channelId/oauth', validateParams(idParamSchema), (c) => {
      const { id: channelId } = c.get('validatedParams');
      const session = oauthService.getSessionByChannel(channelId);

      if (!session) {
        return c.json({
          success: true,
          data: null
        });
      }

      const safeSession = {
        id: session.id,
        provider: session.provider,
        expiresAt: session.expiresAt,
        scopes: session.scopes,
        userInfo: session.userInfo,
        isExpired: oauthService.isTokenExpired(session),
      };

      return c.json({ success: true, data: safeSession });
    });
  }

  // ============================================================================
  // 
  // ============================================================================

  //  /v1/* 
  app.all('/v1/*', async (c) => {
    const start = Date.now;
    const requestId = c.get('requestId') as string;

    try {
      const response = await proxy.handle(c.req.raw);
      const duration = Date.now - start;

      logRequest({
        method: c.req.method,
        url: c.req.url,
        status: response.status,
        duration,
        requestId,
      });

      return response;
    } catch (error) {
      const duration = Date.now - start;
      logRequest({
        method: c.req.method,
        url: c.req.url,
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        duration,
        error: error as Error,
        requestId,
      });
      throw error;
    }
  });

  // ============================================================================
  // 
  // ============================================================================

  app.onError((err, c) => {
    const requestId = c.get('requestId') as string;
    logError(err, { component: 'API', path: c.req.path, requestId });

    if (err instanceof RoutexError) {
      c.status(err.statusCode);
      return c.json({
        success: false,
        ...err.toJSON,
      });
    }

    const handled = errorHandler(err);
    c.status(handled.status);
    return c.json({
      success: false,
      ...handled.body,
    });
  });

  return app;
}
