/**
 * Unified API routes using Hono
 * 使用 Hono 的统一 API 路由
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Database } from '../db/database';
import type { ProxyEngine } from '../core/proxy';
import type { LoadBalancer } from '../core/loadbalancer';
import { ValidationError, NotFoundError } from '../types';

export function createAPI(
  db: Database,
  proxy: ProxyEngine,
  loadBalancer: LoadBalancer,
): Hono {
  const app = new Hono();

  // CORS middleware / CORS 中间件
  app.use('/*', cors());

  // Health check / 健康检查
  app.get('/health', (c) => {
    return c.json({
      status: 'healthy',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================================
  // Channel API / 渠道 API
  // ============================================================================

  // List channels / 列出渠道
  app.get('/api/channels', (c) => {
    const channels = db.getChannels();
    return c.json({ success: true, data: channels });
  });

  // Get channel / 获取渠道
  app.get('/api/channels/:id', (c) => {
    const id = c.req.param('id');
    const channel = db.getChannel(id);

    if (!channel) {
      throw new NotFoundError(`Channel ${id} not found`);
    }

    return c.json({ success: true, data: channel });
  });

  // Create channel / 创建渠道
  app.post('/api/channels', async (c) => {
    const body = await c.req.json();

    // Validate required fields / 验证必填字段
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

    return c.json({ success: true, data: channel }, 201);
  });

  // Update channel / 更新渠道
  app.put('/api/channels/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();

    const channel = db.updateChannel(id, body);
    return c.json({ success: true, data: channel });
  });

  // Delete channel / 删除渠道
  app.delete('/api/channels/:id', (c) => {
    const id = c.req.param('id');
    const deleted = db.deleteChannel(id);

    if (!deleted) {
      throw new NotFoundError(`Channel ${id} not found`);
    }

    return c.json({ success: true, message: 'Channel deleted' });
  });

  // Export channels / 导出渠道
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

  // Import channels / 导入渠道
  app.post('/api/channels/import', async (c) => {
    const body = await c.req.json();
    const { channels, replaceExisting } = body;

    if (!Array.isArray(channels)) {
      throw new ValidationError('Invalid import format');
    }

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
  // Request Logs API / 请求日志 API
  // ============================================================================

  // List requests / 列出请求
  app.get('/api/requests', (c) => {
    const limit = Number(c.req.query('limit') || '100');
    const offset = Number(c.req.query('offset') || '0');

    const requests = db.getRequests(limit, offset);
    return c.json({ success: true, data: requests });
  });

  // Get requests by channel / 按渠道获取请求
  app.get('/api/requests/channel/:channelId', (c) => {
    const channelId = c.req.param('channelId');
    const limit = Number(c.req.query('limit') || '100');

    const requests = db.getRequestsByChannel(channelId, limit);
    return c.json({ success: true, data: requests });
  });

  // ============================================================================
  // Analytics API / 分析 API
  // ============================================================================

  // Get analytics / 获取分析
  app.get('/api/analytics', (c) => {
    const analytics = db.getAnalytics();
    return c.json({ success: true, data: analytics });
  });

  // ============================================================================
  // Load Balancer API / 负载均衡器 API
  // ============================================================================

  // Get current strategy / 获取当前策略
  app.get('/api/load-balancer/strategy', (c) => {
    const strategy = loadBalancer.getStrategy();
    return c.json({ success: true, data: { strategy } });
  });

  // Update strategy / 更新策略
  app.put('/api/load-balancer/strategy', async (c) => {
    const body = await c.req.json();
    const { strategy } = body;

    if (!strategy || !['priority', 'round_robin', 'weighted', 'least_used'].includes(strategy)) {
      throw new ValidationError('Invalid strategy');
    }

    loadBalancer.setStrategy(strategy);
    return c.json({ success: true, data: { strategy } });
  });

  // ============================================================================
  // Proxy Endpoint / 代理端点
  // ============================================================================

  // Forward all /v1/* requests to proxy / 将所有 /v1/* 请求转发到代理
  app.all('/v1/*', async (c) => {
    return proxy.handle(c.req.raw);
  });

  // ============================================================================
  // Error Handler / 错误处理器
  // ============================================================================

  app.onError((err, c) => {
    console.error('API Error:', err);

    if (err instanceof ValidationError || err instanceof NotFoundError) {
      return c.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        },
        err.statusCode,
      );
    }

    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      500,
    );
  });

  return app;
}
