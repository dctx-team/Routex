/**
 * 统一的 API 路由（使用 Hono 框架）
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

export async function createAPI(
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

  // CORS 中间件 - 使用配置的白名单
  const config = ConfigManager.getInstance().getConfig();
  if (config.server.cors.enabled) {
    const corsOrigins = config.server.cors.origins;
    app.use('/*', cors({
      origin: corsOrigins.includes('*') ? '*' : corsOrigins,
      credentials: true,
    }));
  }

  // 请求 ID 中间件 - 为所有请求添加或生成 requestId
  app.use('/*', async (c, next) => {
    // 从 header 获取或生成新的 requestId
    const requestId = c.req.header('x-request-id') || crypto.randomUUID();

    // 设置到 context 中供后续使用
    c.set('requestId', requestId);

    // 添加到响应 header
    c.header('x-request-id', requestId);

    await next();
  });

  // ============================================================================
  // 速率限制中间件（全局）
  // Rate Limiting Middleware (Global)
  // ============================================================================

  // 从环境变量读取配置，默认启用
  const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED !== 'false';
  const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || 100;
  const rateLimitWindow = Number(process.env.RATE_LIMIT_WINDOW) || 60000; // 1 分钟

  if (rateLimitEnabled) {
    const { createRateLimiter } = await import('../middleware/rate-limit');

    const rateLimiter = createRateLimiter({
      windowMs: rateLimitWindow,
      max: rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests from this IP, please try again later.',
    });

    // 对所有 API 路由应用速率限制（排除静态文件和健康检查）
    app.use('/api/*', rateLimiter);
    app.use('/v1/*', rateLimiter);

    logger.info('🛡️  Rate limiting enabled', {
      max: rateLimitMax,
      window: `${rateLimitWindow}ms`,
    });
  }

  // 静态文件中间件（带缓存）
  // 生产环境中缓存静态资源 1 小时
  const isProduction = process.env.NODE_ENV === 'production';
  const cacheMaxAge = isProduction ? STATIC_CACHE_MAX_AGE : 0;

  // 提供仪表板静态文件
  const dashboardPath = './public/dashboard';

  // 提供仪表板资源文件
  app.get('/dashboard/assets/*', async (c) => {
    const filePath = c.req.path.replace('/dashboard', dashboardPath);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file, {
        headers: {
          'Content-Type': file.type,
          'Cache-Control': isProduction ? `public, max-age=${cacheMaxAge}` : 'no-cache',
        },
      });
    }

    return c.notFound();
  });

  // 提供仪表板 HTML
  app.get('/dashboard', async (c) => {
    const file = Bun.file(`${dashboardPath}/index.html`);
    if (await file.exists()) {
      return new Response(file, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }
    return c.notFound();
  });

  app.get('/dashboard/', async (c) => {
    const file = Bun.file(`${dashboardPath}/index.html`);
    if (await file.exists()) {
      return new Response(file, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }
    return c.notFound();
  });

  // 根端点 - 重定向到仪表板
  app.get('/', (c) => {
    return c.redirect('/dashboard/');
  });

  // API 信息端点
  app.get('/api', (c) => {
    const channels = db.getChannels();
    const enabledChannels = channels.filter((ch) => ch.status === 'enabled');
    const routingRules = db.getEnabledRoutingRules();

    return c.json({
      name: APP_INFO.NAME,
      version: APP_INFO.VERSION,
      description: APP_INFO.DESCRIPTION,
      status: 'running',
      uptime: process.uptime(),
      stats: {
        totalChannels: channels.length,
        enabledChannels: enabledChannels.length,
        routingRules: routingRules.length,
        transformers: transformerManager ? transformerManager.list.length : 0,
      },
      loadBalancer: {
        strategy: loadBalancer.getStrategy(),
        cacheStats: loadBalancer.getCacheStats(),
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
      timestamp: new Date().toISOString(),
    });
  });

  // 健康检查 - 基础版
  app.get('/health', (c) => {
    return c.json({
      status: 'healthy',
      version: APP_INFO.VERSION,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // 健康检查 - 详细版
  app.get('/health/detailed', async (c) => {
    const channels = db.getChannels();
    const enabledChannels = channels.filter((ch) => ch.status === 'enabled');
    const routingRules = db.getEnabledRoutingRules();

    // 内存使用情况
    const memUsage = process.memoryUsage();

    // 检查数据库连接
    const dbConnected = db.isConnected();

    // 检查是否有已配置且启用的频道
    const hasChannels = channels.length > 0;
    const hasEnabledChannels = enabledChannels.length > 0;

    // 确定总体健康状态
    let status = 'healthy';
    const issues: string[] = [];

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
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
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
        strategy: loadBalancer.getStrategy(),
        cacheSize: loadBalancer.getCacheStats().size,
      },
      issues: issues.length > 0 ? issues : undefined,
    });
  });

  // 健康检查 - 存活探测（用于 Kubernetes liveness probe）
  app.get('/health/live', (c) => {
    // 检查进程是否响应
    return c.json({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  });

  // 健康检查 - 就绪探测（用于 Kubernetes readiness probe）
  app.get('/health/ready', (c) => {
    const channels = db.getChannels();
    const enabledChannels = channels.filter((ch) => ch.status === 'enabled');

    // 检查服务是否准备好处理流量
    const isReady = enabledChannels.length > 0;

    if (!isReady) {
      return c.json(
        {
          status: 'not_ready',
          reason: 'No enabled channels available',
          timestamp: new Date().toISOString(),
        },
        HTTP_STATUS.SERVICE_UNAVAILABLE,
      );
    }

    return c.json({
      status: 'ready',
      enabledChannels: enabledChannels.length,
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================================
  // 频道 API
  // ============================================================================

  // 列出所有频道
  app.get('/api/channels', (c) => {
    const channels = db.getChannels();
    return c.json({ success: true, data: channels });
  });

  // 获取单个频道
  app.get('/api/channels/:id', validateParams(idParamSchema), (c) => {
    const { id } = c.get('validatedParams');
    const channel = db.getChannel(id);

    if (!channel) {
      throw new NotFoundError(`Channel ${id} not found`);
    }

    return c.json({ success: true, data: channel });
  });

  // 创建频道
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

  // 更新频道
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

  // 删除频道
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

  // 导出频道配置
  app.get('/api/channels/export', (c) => {
    const channels = db.getChannels();
    return c.json({
      version: '1.0',
      exportedAt: new Date().toISOString(),
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

  // 导入频道配置
  app.post('/api/channels/import', validateBody(channelImportSchema), async (c) => {
    const { channels, replaceExisting } = c.get('validatedBody');

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const channelData of channels) {
      try {
        const existing = db.getChannels().find((ch) => ch.name === channelData.name);

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
  // 频道测试 API
  // ============================================================================

  // 测试单个频道
  app.post('/api/channels/:id/test', validateParams(idParamSchema), async (c) => {
    const { id } = c.get('validatedParams');
    const channel = db.getChannel(id);

    if (!channel) {
      throw new NotFoundError(`Channel ${id} not found`);
    }

    const result = await channelTester.testChannel(channel);
    return c.json({ success: true, data: result });
  });

  // 测试所有频道
  app.post('/api/channels/test/all', async (c) => {
    const channels = db.getChannels();
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

  // 仅测试已启用的频道
  app.post('/api/channels/test/enabled', async (c) => {
    const channels = db.getChannels().filter((ch) => ch.status === 'enabled');
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
  // 请求日志 API
  // ============================================================================

  // 列出请求记录（增强版 + 过滤器 + 分页）
  app.get('/api/requests', validateQuery(requestLogQuerySchema), (c) => {
    const query = c.get('validatedQuery');

    const { rows, total } = db.getRequestsFiltered(query);

    const channels = db.getChannels();
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
    return c.json({ success: true, data, meta: { total, limit, offset, timestamp: new Date().toISOString() } });
  });

  // 按频道获取请求记录（为仪表板增强）
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
  // 分析统计 API
  // ============================================================================

  // 获取分析数据
  app.get('/api/analytics', (c) => {
    const analytics = db.getAnalytics();
    return c.json({ success: true, data: analytics });
  });

  // ============================================================================
  // 路由规则 API
  // ============================================================================

  const routingAPI = createRoutingAPI(db, smartRouter);
  app.route('/api/routing', routingAPI);

  // ============================================================================
  // 转换器 API
  // ============================================================================

  if (transformerManager) {
    const transformersAPI = createTransformersAPI(transformerManager);
    app.route('/api/transformers', transformersAPI);
  }

  // ============================================================================
  // 提供商 API
  // ============================================================================

  // 获取所有提供商信息
  app.get('/api/providers', (c) => {
    const providers = providerRegistry.getAllProvidersInfo();
    return c.json({ success: true, data: providers });
  });

  // 获取特定提供商信息
  app.get('/api/providers/:type', validateParams(z.object({ type: z.string() })), (c) => {
    const type = c.req.param('type') as ChannelType;
    const provider = providerRegistry.getProviderInfo(type);

    if (!provider) {
      throw new NotFoundError(`Provider ${type} not found`);
    }

    return c.json({ success: true, data: provider });
  });

  // ============================================================================
  // 负载均衡器 API
  // ============================================================================

  // 获取当前策略
  app.get('/api/load-balancer/strategy', (c) => {
    const strategy = loadBalancer.getStrategy();
    return c.json({ success: true, data: { strategy } });
  });

  // 更新策略
  app.put('/api/load-balancer/strategy', validateBody(updateStrategySchema), async (c) => {
    const { strategy } = c.get('validatedBody');

    loadBalancer.setStrategy(strategy);
    return c.json({ success: true, data: { strategy } });
  });

  // 策略快捷端点（用于仪表板兼容性）
  app.get('/api/strategy', (c) => {
    const strategy = loadBalancer.getStrategy();
    return c.json({ success: true, data: { strategy } });
  });

  app.put('/api/strategy', validateBody(updateStrategySchema), async (c) => {
    const { strategy } = c.get('validatedBody');

    loadBalancer.setStrategy(strategy);
    return c.json({ success: true, data: { strategy } });
  });

  // ============================================================================
  // Tee 目标 API
  // ============================================================================

  // 列出所有 tee 目标
  app.get('/api/tee', (c) => {
    const destinations = db.getTeeDestinations();
    return c.json({ success: true, data: destinations });
  });

  // 获取 tee 目标
  app.get('/api/tee/:id', validateParams(idParamSchema), (c) => {
    const { id } = c.get('validatedParams');
    const destination = db.getTeeDestination(id);

    if (!destination) {
      throw new NotFoundError(`Tee destination ${id} not found`);
    }

    return c.json({ success: true, data: destination });
  });

  // 创建 tee 目标
  app.post('/api/tee', validateBody(createTeeDestinationSchema), async (c) => {
    const body = c.get('validatedBody');

    const destination = db.createTeeDestination(body);

    // 更新代理引擎的 tee 目标
    proxy.updateTeeDestinations();

    c.status(HTTP_STATUS.CREATED);
    return c.json({ success: true, data: destination });
  });

  // 更新 tee 目标
  app.put('/api/tee/:id', validateParams(idParamSchema), validateBody(updateTeeDestinationSchema), async (c) => {
    const { id } = c.get('validatedParams');
    const body = c.get('validatedBody');

    const destination = db.updateTeeDestination(id, body);

    // 更新代理引擎的 tee 目标
    proxy.updateTeeDestinations();

    return c.json({ success: true, data: destination });
  });

  // 删除 tee 目标
  app.delete('/api/tee/:id', validateParams(idParamSchema), (c) => {
    const { id } = c.get('validatedParams');
    const deleted = db.deleteTeeDestination(id);

    if (!deleted) {
      throw new NotFoundError(`Tee destination ${id} not found`);
    }

    // 更新代理引擎的 tee 目标
    proxy.updateTeeDestinations();

    return c.json({ success: true, message: 'Tee destination deleted' });
  });

  // ============================================================================
  // 指标统计 API
  // ============================================================================

  // 获取指标摘要
  app.get('/api/metrics', (c) => {
    const summary = metrics.getSummary();
    return c.json({ success: true, data: summary });
  });

  // 获取所有指标（详细版）
  app.get('/api/metrics/all', (c) => {
    const allMetrics = metrics.getAllMetrics();
    return c.json({ success: true, data: allMetrics });
  });

  // 重置指标
  app.post('/api/metrics/reset', (c) => {
    metrics.reset();
    return c.json({ success: true, message: 'Metrics reset' });
  });

  // Prometheus 指标端点
  app.get('/metrics', () => {
    return getPrometheusMetricsResponse();
  });

  // ============================================================================
  // 追踪 API
  // ============================================================================

  // 获取追踪统计信息
  app.get('/api/tracing/stats', (c) => {
    const stats = tracer.getStats();
    return c.json({ success: true, data: stats });
  });

  // 根据 ID 获取追踪详情
  app.get('/api/tracing/traces/:traceId', validateParams(idParamSchema), (c) => {
    const { id: traceId } = c.get('validatedParams');
    const spans = tracer.getTraceSpans(traceId);

    if (spans.length === 0) {
      throw new NotFoundError(`Trace ${traceId} not found`);
    }

    return c.json({ success: true, data: { traceId, spans } });
  });

  // 获取特定 span
  app.get('/api/tracing/spans/:spanId', validateParams(idParamSchema), (c) => {
    const { id: spanId } = c.get('validatedParams');
    const span = tracer.getSpan(spanId);

    if (!span) {
      throw new NotFoundError(`Span ${spanId} not found`);
    }

    return c.json({ success: true, data: span });
  });

  // 清除旧的 span
  app.post('/api/tracing/clear', validateBody(tracingCleanupSchema), async (c) => {
    const { olderThanMs } = c.get('validatedBody');

    const removedCount = tracer.clearOldSpans(olderThanMs);

    return c.json({
      success: true,
      data: { removedCount, remainingSpans: tracer.getStats().totalSpans },
    });
  });

  // ============================================================================
  // 国际化 API
  // ============================================================================

  // 获取当前语言环境
  app.get('/api/i18n/locale', (c) => {
    return c.json({
      success: true,
      data: {
        locale: i18n.getLocale(),
        available: ['en', 'zh-CN'],
      },
    });
  });

  // 设置语言环境
  app.put('/api/i18n/locale', validateBody(updateLocaleSchema), async (c) => {
    const { locale } = c.get('validatedBody');

    i18n.setLocale(locale);

    return c.json({
      success: true,
      data: { locale },
    });
  });

  // ============================================================================
  // 日志配置 API
  // ============================================================================

  // 获取当前日志配置
  app.get('/api/logging/config', async (c) => {
    const { getLogConfig } = await import('../utils/logger');
    const config = getLogConfig();
    return c.json({ success: true, data: config });
  });

  // 为特定模块设置日志级别
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
  // 配置管理 API
  // ============================================================================

  // 获取当前配置
  app.get('/api/config', async (c) => {
    const { ConfigManager } = await import('../config/config');
    const configManager = ConfigManager.getInstance();
    const config = configManager.getConfig();

    return c.json({ success: true, data: config });
  });

  // 获取配置文件路径
  app.get('/api/config/path', async (c) => {
    const { ConfigManager } = await import('../config/config');
    const configManager = ConfigManager.getInstance();
    const path = configManager.getConfigFilePath();

    return c.json({
      success: true,
      data: { path: path || null }
    });
  });

  // 运行时更新配置
  app.put('/api/config', async (c) => {
    const body = await c.req.json();
    const { ConfigManager, ConfigValidationError } = await import('../config/config');
    const configManager = ConfigManager.getInstance();

    try {
      configManager.updateConfig(body);
      return c.json({
        success: true,
        data: configManager.getConfig(),
        message: 'Configuration updated successfully'
      });
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        throw new ValidationError(error.message);
      }
      throw error;
    }
  });

  // 从文件重新加载配置
  app.post('/api/config/reload', async (c) => {
    const { ConfigManager } = await import('../config/config');
    const configManager = ConfigManager.getInstance();

    try {
      configManager.reloadConfig();
      return c.json({
        success: true,
        data: configManager.getConfig(),
        message: 'Configuration reloaded successfully'
      });
    } catch (error) {
      throw new ValidationError(
        error instanceof Error ? error.message : 'Failed to reload configuration'
      );
    }
  });

  // 保存配置到文件
  app.post('/api/config/save', validateBody(configSaveSchema), async (c) => {
    const { path } = c.get('validatedBody');

    const { ConfigManager } = await import('../config/config');
    const configManager = ConfigManager.getInstance();

    try {
      configManager.saveConfig(path);
      return c.json({
        success: true,
        data: { path: configManager.getConfigFilePath() },
        message: 'Configuration saved successfully'
      });
    } catch (error) {
      throw new ValidationError(
        error instanceof Error ? error.message : 'Failed to save configuration'
      );
    }
  });

  // 导出配置为 JSON
  app.get('/api/config/export', async (c) => {
    const { ConfigManager } = await import('../config/config');
    const configManager = ConfigManager.getInstance();
    const configJson = configManager.exportConfig();

    return new Response(configJson, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="routex-config-${Date.now()}.json"`,
      },
    });
  });

  // ============================================================================
  // 缓存预热 API
  // ============================================================================

  if (cacheWarmer) {
    // 获取缓存预热统计
    app.get('/api/cache/stats', (c) => {
      const stats = cacheWarmer.getStats();
      return c.json({ success: true, data: stats });
    });

    // 获取缓存预热配置
    app.get('/api/cache/config', (c) => {
      const config = cacheWarmer.getConfig();
      return c.json({ success: true, data: config });
    });

    // 更新缓存预热配置
    app.put('/api/cache/config', async (c) => {
      const body = await c.req.json();
      cacheWarmer.updateConfig(body);
      return c.json({ success: true, data: cacheWarmer.getConfig() });
    });

    // 手动预热缓存
    app.post('/api/cache/warm', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const items = body.items;

      await cacheWarmer.warmCache(items);

      return c.json({
        success: true,
        data: cacheWarmer.getStats(),
      });
    });

    // 使缓存失效
    app.post('/api/cache/invalidate', validateBody(cacheInvalidationSchema), async (c) => {
      const { type } = c.get('validatedBody');

      cacheWarmer.invalidateCache(type);

      return c.json({
        success: true,
        message: `Cache${type ? ` (${type})` : ''} invalidated`,
      });
    });

    // 使缓存失效并重新预热
    app.post('/api/cache/invalidate-and-warm', validateBody(cacheInvalidationSchema), async (c) => {
      const { type } = c.get('validatedBody');

      await cacheWarmer.invalidateAndWarm(type);

      return c.json({
        success: true,
        data: cacheWarmer.getStats(),
      });
    });

    // 重置缓存预热统计
    app.post('/api/cache/reset-stats', (c) => {
      cacheWarmer.resetStats();
      return c.json({
        success: true,
        message: 'Cache warmer stats reset',
      });
    });
  }

  // ============================================================================
  // 数据库性能 API
  // ============================================================================

  // 获取数据库缓存统计和性能指标
  app.get('/api/database/cache/stats', (c) => {
    const stats = db.getCacheStats();
    return c.json({ success: true, data: stats });
  });

  // 重置数据库性能指标
  app.post('/api/database/performance/reset', (c) => {
    db.resetPerformanceMetrics();
    return c.json({
      success: true,
      message: 'Database performance metrics reset',
    });
  });

  // ============================================================================
  // OAuth 认证 API
  // ============================================================================

  if (oauthService) {
    // 获取支持的 OAuth 提供商
    app.get('/api/oauth/providers', (c) => {
      const providers = Array.from(oauthService['configs'].keys());
      return c.json({
        success: true,
        data: providers.map(provider => ({
          name: provider,
          enabled: true,
        }))
      });
    });

    // 生成授权 URL
    app.get('/api/oauth/:provider/authorize', (c) => {
      const provider = c.req.param('provider') as ChannelType;

      // 生成随机 state 用于 CSRF 保护
      const state = crypto.randomUUID();

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

    // 处理 OAuth 回调
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

        // 重定向到仪表板并显示成功消息
        return c.redirect(`/dashboard?oauth=success&sessionId=${session.id}&provider=${provider}`);
      } catch (error) {
        // 重定向到仪表板并显示错误消息
        const message = error instanceof Error ? error.message : 'OAuth authentication failed';
        return c.redirect(`/dashboard?oauth=error&message=${encodeURIComponent(message)}`);
      }
    });

    // 列出所有 OAuth 会话
    app.get('/api/oauth/sessions', (c) => {
      const sessions = db.getOAuthSessions();

      // 列表中不暴露敏感 token
      const safeSessions = sessions.map(session => ({
        id: session.id,
        channelId: session.channelId,
        provider: session.provider,
        expiresAt: session.expiresAt,
        scopes: session.scopes,
        userInfo: session.userInfo,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        isExpired: Date.now() >= session.expiresAt - 60000,
      }));

      return c.json({ success: true, data: safeSessions });
    });

    // 获取特定 OAuth 会话
    app.get('/api/oauth/sessions/:sessionId', (c) => {
      const sessionId = c.req.param('sessionId');
      const session = oauthService.getSession(sessionId);

      if (!session) {
        throw new NotFoundError(`OAuth session ${sessionId} not found`);
      }

      // 不暴露敏感 token
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

    // 刷新 OAuth token
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

    // 将 OAuth 会话链接到频道
    app.post('/api/oauth/sessions/:sessionId/link/:channelId', validateParams(z.object({
      sessionId: z.string(),
      channelId: z.string()
    })), async (c) => {
      const { sessionId, channelId } = c.get('validatedParams');

      // 验证频道存在
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

    // 撤销 OAuth 会话
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

    // 根据频道获取 OAuth 会话
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
  // 代理端点
  // ============================================================================

  // 将所有 /v1/* 请求转发到代理
  app.all('/v1/*', async (c) => {
    const start = Date.now();
    const requestId = c.get('requestId') as string;

    try {
      const response = await proxy.handle(c.req.raw);
      const duration = Date.now() - start;

      logRequest({
        method: c.req.method,
        url: c.req.url,
        status: response.status,
        duration,
        requestId,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - start;
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
  // 错误处理器
  // ============================================================================

  app.onError((err, c) => {
    const requestId = c.get('requestId') as string;
    logError(err, { component: 'API', path: c.req.path, requestId });

    if (err instanceof RoutexError) {
      c.status(err.statusCode);
      return c.json({
        success: false,
        ...err.toJSON(),
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
