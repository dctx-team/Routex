/**
 * Unified API routes using Hono
 *  Hono  API
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Database } from '../db/database';
import type { ProxyEngine } from '../core/proxy';
import type { LoadBalancer } from '../core/loadbalancer';
import type { TransformerManager } from '../transformers';
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

export function createAPI(
  db: Database,
  proxy: ProxyEngine,
  loadBalancer: LoadBalancer,
  transformerManager?: TransformerManager,
): Hono {
  const app = new Hono();

  //// CORS middleware / CORS
  app.use('/*', cors());

  //// Health check
  app.get('/health', (c) => {
    return c.json({
      status: 'healthy',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================================
  //// Channel API /  API
  // ============================================================================

  //// List channels
  app.get('/api/channels', (c) => {
    const channels = db.getChannels();
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
    const body = await c.req.json();

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

    return c.json({ success: true, data: channel }, 201);
  });

  //// Update channel
  app.put('/api/channels/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();

    const channel = db.updateChannel(id, body);
    return c.json({ success: true, data: channel });
  });

  //// Delete channel
  app.delete('/api/channels/:id', (c) => {
    const id = c.req.param('id');
    const deleted = db.deleteChannel(id);

    if (!deleted) {
      throw new NotFoundError(`Channel ${id} not found`);
    }

    return c.json({ success: true, message: 'Channel deleted' });
  });

  //// Export channels
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

  //// Import channels
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
    const analytics = db.getAnalytics();
    return c.json({ success: true, data: analytics });
  });

  // ============================================================================
  //// Routing API /  API
  // ============================================================================

  const routingAPI = createRoutingAPI(db);
  app.route('/api/routing', routingAPI);

  // ============================================================================
  // Transformers API / Transformers API
  // ============================================================================

  if (transformerManager) {
    const transformersAPI = createTransformersAPI(transformerManager);
    app.route('/api/transformers', transformersAPI);
  }

  // ============================================================================
  //// Load Balancer API /  API
  // ============================================================================

  //// Get current strategy
  app.get('/api/load-balancer/strategy', (c) => {
    const strategy = loadBalancer.getStrategy();
    return c.json({ success: true, data: { strategy } });
  });

  //// Update strategy
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
  //// Proxy Endpoint
  // ============================================================================

  //// Forward all /v1/* requests to proxy /  /v1/*
  app.all('/v1/*', async (c) => {
    return proxy.handle(c.req.raw);
  });

  // ============================================================================
  //// Error Handler
  // ============================================================================

  app.onError((err, c) => {
    console.error('API Error:', err);

    if (err instanceof RoutexError) {
      return c.json(
        {
          success: false,
          ...err.toJSON(),
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
