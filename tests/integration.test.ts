/**
 * Integration Tests for Routex
 * 端到端集成测试
 *
 * 这些测试验证整个系统的端到端功能，包括：
 * - API 端点
 * - 缓存预热
 * - 追踪系统
 * - 负载均衡
 * - 指标收集
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Database } from '../src/db/database';
import { LoadBalancer } from '../src/core/loadbalancer';
import { ProxyEngine } from '../src/core/proxy';
import { CacheWarmer } from '../src/core/cache-warmer';
import { SmartRouter } from '../src/core/routing/smart-router';
import { createTransformerManager } from '../src/transformers';
import { createAPI } from '../src/api/routes';
import { metrics } from '../src/core/metrics';
import { tracer } from '../src/core/tracing';

describe('Integration Tests', () => {
  let db: Database;
  let loadBalancer: LoadBalancer;
  let proxy: ProxyEngine;
  let cacheWarmer: CacheWarmer;
  let smartRouter: SmartRouter;
  let app: any;

  beforeAll(() => {
    // 初始化测试数据库（内存模式）
    db = new Database(':memory:');

    // 创建测试渠道
    db.createChannel({
      name: 'Test Integration Channel',
      type: 'anthropic',
      apiKey: 'test-key',
      baseUrl: 'https://api.anthropic.com',
      models: ['claude-sonnet-4', 'claude-opus-4'],
      priority: 1,
      weight: 100,
    });

    // 初始化组件
    loadBalancer = new LoadBalancer('priority');
    smartRouter = new SmartRouter(db.getEnabledRoutingRules());
    const transformerManager = createTransformerManager();
    proxy = new ProxyEngine(db, loadBalancer, smartRouter, transformerManager);
    cacheWarmer = new CacheWarmer(db, loadBalancer);

    // 创建 API
    app = createAPI(db, proxy, loadBalancer, smartRouter, transformerManager, cacheWarmer);

    // 重置 metrics
    metrics.reset();
  });

  afterAll(async () => {
    await cacheWarmer.stop();
    db.close();
  });

  describe('Health Check Endpoints', () => {
    test('should return basic health status', async () => {
      const req = new Request('http://localhost:8080/health');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.version).toBe('1.1.0-beta');
      expect(data.uptime).toBeGreaterThanOrEqual(0);
      expect(data.timestamp).toBeDefined();
    });

    test('should return detailed health status', async () => {
      const req = new Request('http://localhost:8080/health/detailed');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.channels).toBeDefined();
      expect(data.channels.total).toBeGreaterThan(0);
      expect(data.routing).toBeDefined();
      expect(data.loadBalancer).toBeDefined();
    });

    test('should return liveness probe', async () => {
      const req = new Request('http://localhost:8080/health/live');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('alive');
    });

    test('should return readiness probe', async () => {
      const req = new Request('http://localhost:8080/health/ready');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('ready');
      expect(data.enabledChannels).toBeGreaterThan(0);
    });
  });

  describe('Channels API', () => {
    test('should list all channels', async () => {
      const req = new Request('http://localhost:8080/api/channels');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    test('should get a specific channel', async () => {
      const channels = db.getChannels();
      const channelId = channels[0].id;

      const req = new Request(`http://localhost:8080/api/channels/${channelId}`);
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(channelId);
      expect(data.data.name).toBeDefined();
    });

    test('should create a new channel', async () => {
      const newChannel = {
        name: 'Integration Test Channel',
        type: 'openai',
        apiKey: 'test-key-123',
        baseUrl: 'https://api.openai.com',
        models: ['gpt-4'],
        priority: 2,
        weight: 50,
      };

      const req = new Request('http://localhost:8080/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChannel),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(newChannel.name);
      expect(data.data.id).toBeDefined();
    });

    test('should update a channel', async () => {
      const channels = db.getChannels();
      const channelId = channels[0].id;

      const updates = {
        priority: 10,
        weight: 200,
      };

      const req = new Request(`http://localhost:8080/api/channels/${channelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.priority).toBe(updates.priority);
      expect(data.data.weight).toBe(updates.weight);
    });

    test('should return 404 for non-existent channel', async () => {
      const req = new Request('http://localhost:8080/api/channels/non-existent-id');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('Cache Warmer API', () => {
    test('should get cache warmer stats', async () => {
      const req = new Request('http://localhost:8080/api/cache/stats');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalWarms).toBeGreaterThanOrEqual(0);
      expect(data.data.itemsCached).toBeDefined();
      expect(data.data.itemsCached.channels).toBeGreaterThanOrEqual(0);
    });

    test('should get cache warmer config', async () => {
      const req = new Request('http://localhost:8080/api/cache/config');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.enabled).toBeDefined();
      expect(data.data.warmOnStartup).toBeDefined();
      expect(data.data.backgroundRefresh).toBeDefined();
    });

    test('should manually warm cache', async () => {
      const statsBefore = cacheWarmer.getStats();

      const req = new Request('http://localhost:8080/api/cache/warm', {
        method: 'POST',
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalWarms).toBeGreaterThan(statsBefore.totalWarms);
    });

    test('should invalidate cache', async () => {
      const req = new Request('http://localhost:8080/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'channels' }),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('invalidated');
    });

    test('should invalidate and warm cache', async () => {
      const statsBefore = cacheWarmer.getStats();

      const req = new Request('http://localhost:8080/api/cache/invalidate-and-warm', {
        method: 'POST',
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalWarms).toBeGreaterThan(statsBefore.totalWarms);
    });

    test('should update cache config', async () => {
      const newConfig = {
        backgroundRefresh: {
          enabled: false,
        },
      };

      const req = new Request('http://localhost:8080/api/cache/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.backgroundRefresh.enabled).toBe(false);
    });
  });

  describe('Tracing API', () => {
    test('should get tracing stats', async () => {
      const req = new Request('http://localhost:8080/api/tracing/stats');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalSpans).toBeGreaterThanOrEqual(0);
      expect(data.data.maxSpans).toBe(10000);
    });

    test('should create and retrieve a trace', async () => {
      const traceId = 'test-integration-trace-001';
      const span = tracer.startSpan('test.integration', traceId);
      tracer.endSpan(span.spanId, 'success');

      const req = new Request(`http://localhost:8080/api/tracing/traces/${traceId}`);
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.traceId).toBe(traceId);
      expect(data.data.spans).toBeDefined();
      expect(data.data.spans.length).toBeGreaterThan(0);
    });

    test('should get specific span', async () => {
      const span = tracer.startSpan('test.span');
      tracer.endSpan(span.spanId, 'success');

      const req = new Request(`http://localhost:8080/api/tracing/spans/${span.spanId}`);
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.spanId).toBe(span.spanId);
      expect(data.data.status).toBe('success');
    });

    test('should return 404 for non-existent trace', async () => {
      const req = new Request('http://localhost:8080/api/tracing/traces/non-existent-trace');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });

    test('should clear old spans', async () => {
      const req = new Request('http://localhost:8080/api/tracing/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThanMs: 0 }), // 清除所有
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.removedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Metrics API', () => {
    test('should get metrics summary', async () => {
      const req = new Request('http://localhost:8080/api/metrics');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    test('should get all metrics', async () => {
      const req = new Request('http://localhost:8080/api/metrics/all');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.counters).toBeDefined();
      expect(data.data.gauges).toBeDefined();
    });

    test('should reset metrics', async () => {
      const req = new Request('http://localhost:8080/api/metrics/reset', {
        method: 'POST',
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('reset');
    });

    test('should get Prometheus metrics', async () => {
      const req = new Request('http://localhost:8080/metrics');
      const res = await app.fetch(req);
      const text = await res.text();

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/plain');
      expect(text).toContain('# HELP');
      expect(text).toContain('# TYPE');
    });
  });

  describe('Load Balancer API', () => {
    test('should get current strategy', async () => {
      const req = new Request('http://localhost:8080/api/load-balancer/strategy');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.strategy).toBeDefined();
    });

    test('should update strategy', async () => {
      const req = new Request('http://localhost:8080/api/load-balancer/strategy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: 'round_robin' }),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.strategy).toBe('round_robin');
    });

    test('should reject invalid strategy', async () => {
      const req = new Request('http://localhost:8080/api/load-balancer/strategy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: 'invalid_strategy' }),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('Analytics API', () => {
    test('should get analytics', async () => {
      const req = new Request('http://localhost:8080/api/analytics');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalRequests).toBeGreaterThanOrEqual(0);
      expect(data.data.totalInputTokens).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Providers API', () => {
    test('should get all providers', async () => {
      const req = new Request('http://localhost:8080/api/providers');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(typeof data.data).toBe('object');
      expect(Object.keys(data.data).length).toBeGreaterThan(0);
    });

    test('should get specific provider', async () => {
      const req = new Request('http://localhost:8080/api/providers/anthropic');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.type).toBe('anthropic');
      expect(data.data.name).toBeDefined();
    });

    test('should return 404 for non-existent provider', async () => {
      const req = new Request('http://localhost:8080/api/providers/invalid-provider');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('i18n API', () => {
    test('should get current locale', async () => {
      const req = new Request('http://localhost:8080/api/i18n/locale');
      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.locale).toBeDefined();
      expect(data.data.available).toContain('en');
      expect(data.data.available).toContain('zh-CN');
    });

    test('should set locale', async () => {
      const req = new Request('http://localhost:8080/api/i18n/locale', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: 'zh-CN' }),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.locale).toBe('zh-CN');
    });

    test('should reject invalid locale', async () => {
      const req = new Request('http://localhost:8080/api/i18n/locale', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: 'invalid' }),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing required fields', async () => {
      const req = new Request('http://localhost:8080/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Incomplete Channel' }), // 缺少必需字段
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    test('should handle invalid JSON', async () => {
      const req = new Request('http://localhost:8080/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });

      try {
        const res = await app.fetch(req);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } catch (error) {
        // JSON 解析错误是预期的
        expect(error).toBeDefined();
      }
    });

    test('should handle non-existent routes', async () => {
      const req = new Request('http://localhost:8080/api/non-existent-route');
      const res = await app.fetch(req);

      expect(res.status).toBe(404);
    });
  });

  describe('CORS', () => {
    test('should include CORS headers', async () => {
      const req = new Request('http://localhost:8080/api/channels', {
        headers: { 'Origin': 'http://example.com' },
      });

      const res = await app.fetch(req);

      expect(res.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    });
  });
});
