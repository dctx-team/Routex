/**
 * Metrics Collector Tests
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MetricsCollector } from '../src/core/metrics';

describe('MetricsCollector', () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  describe('Counter', () => {
    test('should register and increment counter', () => {
      metrics.registerCounter('test_counter', 'Test counter');
      metrics.incrementCounter('test_counter');
      metrics.incrementCounter('test_counter', 5);

      expect(metrics.getCounter('test_counter')).toBe(6);
    });

    test('should support labels', () => {
      metrics.registerCounter('http_requests', 'HTTP requests');
      metrics.incrementCounter('http_requests', 1, { method: 'GET' });
      metrics.incrementCounter('http_requests', 2, { method: 'POST' });
      metrics.incrementCounter('http_requests', 1, { method: 'GET' });

      expect(metrics.getCounter('http_requests', { method: 'GET' })).toBe(2);
      expect(metrics.getCounter('http_requests', { method: 'POST' })).toBe(2);
    });

    test('should handle non-existent counter', () => {
      expect(metrics.getCounter('non_existent')).toBe(0);
    });
  });

  describe('Gauge', () => {
    test('should set and get gauge value', () => {
      metrics.registerGauge('temperature', 'Temperature');
      metrics.setGauge('temperature', 25.5);

      expect(metrics.getGauge('temperature')).toBe(25.5);
    });

    test('should increment gauge', () => {
      metrics.registerGauge('queue_size', 'Queue size');
      metrics.setGauge('queue_size', 10);
      metrics.incrementGauge('queue_size', 5);

      expect(metrics.getGauge('queue_size')).toBe(15);
    });

    test('should decrement gauge', () => {
      metrics.registerGauge('active_connections', 'Active connections');
      metrics.setGauge('active_connections', 100);
      metrics.decrementGauge('active_connections', 25);

      expect(metrics.getGauge('active_connections')).toBe(75);
    });

    test('should support labels', () => {
      metrics.registerGauge('memory_usage', 'Memory usage');
      metrics.setGauge('memory_usage', 1024, { type: 'heap' });
      metrics.setGauge('memory_usage', 2048, { type: 'rss' });

      expect(metrics.getGauge('memory_usage', { type: 'heap' })).toBe(1024);
      expect(metrics.getGauge('memory_usage', { type: 'rss' })).toBe(2048);
    });
  });

  describe('Histogram', () => {
    test('should observe values and calculate buckets', () => {
      metrics.registerHistogram('request_duration', 'Request duration', [0.1, 0.5, 1, 5]);

      metrics.observeHistogram('request_duration', 0.05);
      metrics.observeHistogram('request_duration', 0.3);
      metrics.observeHistogram('request_duration', 0.8);
      metrics.observeHistogram('request_duration', 2);
      metrics.observeHistogram('request_duration', 10);

      const histogram = metrics.getHistogram('request_duration');
      expect(histogram.count).toBe(5);
      expect(histogram.sum).toBe(13.15);
      expect(histogram.buckets.get(0.1)).toBe(1); // 0.05
      expect(histogram.buckets.get(0.5)).toBe(2); // 0.05, 0.3
      expect(histogram.buckets.get(1)).toBe(3); // 0.05, 0.3, 0.8
      expect(histogram.buckets.get(5)).toBe(4); // All except 10
      expect(histogram.buckets.get(Number.POSITIVE_INFINITY)).toBe(5); // All
    });

    test('should support labels', () => {
      metrics.registerHistogram('api_latency', 'API latency', [0.1, 1, 10]);

      metrics.observeHistogram('api_latency', 0.5, { endpoint: '/api/channels' });
      metrics.observeHistogram('api_latency', 2, { endpoint: '/api/metrics' });

      const channelsHist = metrics.getHistogram('api_latency', { endpoint: '/api/channels' });
      const metricsHist = metrics.getHistogram('api_latency', { endpoint: '/api/metrics' });

      expect(channelsHist.count).toBe(1);
      expect(metricsHist.count).toBe(1);
    });
  });

  describe('Summary', () => {
    test('should calculate quantiles', () => {
      metrics.registerSummary('response_time', 'Response time', [0.5, 0.9, 0.99]);

      // Add 100 values
      for (let i = 1; i <= 100; i++) {
        metrics.observeSummary('response_time', i);
      }

      const summary = metrics.getSummaryMetric('response_time');
      expect(summary.count).toBe(100);
      expect(summary.sum).toBe(5050); // Sum of 1..100

      // Check quantiles (approximate)
      expect(summary.quantiles.get(0.5)).toBeGreaterThanOrEqual(45);
      expect(summary.quantiles.get(0.5)).toBeLessThanOrEqual(55);

      expect(summary.quantiles.get(0.9)).toBeGreaterThanOrEqual(85);
      expect(summary.quantiles.get(0.9)).toBeLessThanOrEqual(95);
    });
  });

  describe('Reset', () => {
    test('should reset all metrics', () => {
      metrics.registerCounter('counter', 'Test counter');
      metrics.registerGauge('gauge', 'Test gauge');

      metrics.incrementCounter('counter', 10);
      metrics.setGauge('gauge', 100);

      expect(metrics.getCounter('counter')).toBe(10);
      expect(metrics.getGauge('gauge')).toBe(100);

      metrics.reset();

      expect(metrics.getCounter('counter')).toBe(0);
      expect(metrics.getGauge('gauge')).toBe(0);
    });
  });

  describe('GetAllMetrics', () => {
    test('should return all metrics', () => {
      metrics.registerCounter('requests', 'Total requests');
      metrics.registerGauge('connections', 'Active connections');

      metrics.incrementCounter('requests', 5);
      metrics.setGauge('connections', 10);

      const all = metrics.getAllMetrics();

      expect(all.counters).toBeDefined();
      expect(all.gauges).toBeDefined();
      expect(all.histograms).toBeDefined();
      expect(all.summaries).toBeDefined();
    });
  });

  describe('System Metrics', () => {
    test('should update system metrics', async () => {
      // Wait 1ms to ensure uptime > 0
      await new Promise(resolve => setTimeout(resolve, 1));

      metrics.updateSystemMetrics();

      const uptime = metrics.getGauge('routex_uptime_seconds');
      const heapMemory = metrics.getGauge('routex_memory_usage_bytes', { type: 'heap' });
      const rssMemory = metrics.getGauge('routex_memory_usage_bytes', { type: 'rss' });

      expect(uptime).toBeGreaterThan(0);
      expect(heapMemory).toBeGreaterThan(0);
      expect(rssMemory).toBeGreaterThan(0);
    });
  });
});
