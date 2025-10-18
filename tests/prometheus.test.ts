/**
 * Prometheus Exporter Tests
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { exportPrometheusMetrics } from '../src/core/prometheus';
import { metrics } from '../src/core/metrics';

describe('Prometheus Exporter', () => {
  beforeEach(() => {
    metrics.reset();
  });

  describe('Counter Export', () => {
    test('should export counter with HELP and TYPE', () => {
      metrics.registerCounter('test_counter_total', 'Test counter');
      metrics.incrementCounter('test_counter_total', 5);

      const output = exportPrometheusMetrics();

      expect(output).toContain('# HELP test_counter_total Test counter');
      expect(output).toContain('# TYPE test_counter_total counter');
      expect(output).toContain('test_counter_total 5');
    });

    test('should export counter with labels', () => {
      metrics.registerCounter('http_requests_total', 'HTTP requests');
      metrics.incrementCounter('http_requests_total', 10, { method: 'GET', status: '200' });
      metrics.incrementCounter('http_requests_total', 5, { method: 'POST', status: '201' });

      const output = exportPrometheusMetrics();

      expect(output).toContain('http_requests_total{method="GET",status="200"} 10');
      expect(output).toContain('http_requests_total{method="POST",status="201"} 5');
    });
  });

  describe('Gauge Export', () => {
    test('should export gauge', () => {
      metrics.registerGauge('temperature_celsius', 'Temperature');
      metrics.setGauge('temperature_celsius', 23.5);

      const output = exportPrometheusMetrics();

      expect(output).toContain('# HELP temperature_celsius Temperature');
      expect(output).toContain('# TYPE temperature_celsius gauge');
      expect(output).toContain('temperature_celsius 23.5');
    });

    test('should export gauge with labels', () => {
      metrics.registerGauge('memory_bytes', 'Memory usage');
      metrics.setGauge('memory_bytes', 1024000, { type: 'heap' });
      metrics.setGauge('memory_bytes', 2048000, { type: 'rss' });

      const output = exportPrometheusMetrics();

      expect(output).toContain('memory_bytes{type="heap"} 1024000');
      expect(output).toContain('memory_bytes{type="rss"} 2048000');
    });
  });

  describe('Histogram Export', () => {
    test('should export histogram with buckets', () => {
      metrics.registerHistogram('request_duration_seconds', 'Request duration', [0.1, 0.5, 1, 5]);

      metrics.observeHistogram('request_duration_seconds', 0.05);
      metrics.observeHistogram('request_duration_seconds', 0.3);
      metrics.observeHistogram('request_duration_seconds', 2);

      const output = exportPrometheusMetrics();

      expect(output).toContain('# HELP request_duration_seconds Request duration');
      expect(output).toContain('# TYPE request_duration_seconds histogram');

      // Buckets
      expect(output).toContain('request_duration_seconds_bucket{le="0.1"} 1');
      expect(output).toContain('request_duration_seconds_bucket{le="0.5"} 2');
      expect(output).toContain('request_duration_seconds_bucket{le="1"} 2');
      expect(output).toContain('request_duration_seconds_bucket{le="5"} 3');
      expect(output).toContain('request_duration_seconds_bucket{le="+Inf"} 3');

      // Sum and count
      expect(output).toContain('request_duration_seconds_sum 2.35');
      expect(output).toContain('request_duration_seconds_count 3');
    });

    test('should export histogram with labels', () => {
      metrics.registerHistogram('api_latency_seconds', 'API latency', [0.1, 1]);

      metrics.observeHistogram('api_latency_seconds', 0.5, { endpoint: '/api/channels' });

      const output = exportPrometheusMetrics();

      expect(output).toContain('api_latency_seconds_bucket{endpoint="/api/channels",le="0.1"} 0');
      expect(output).toContain('api_latency_seconds_bucket{endpoint="/api/channels",le="1"} 1');
      expect(output).toContain('api_latency_seconds_sum{endpoint="/api/channels"} 0.5');
      expect(output).toContain('api_latency_seconds_count{endpoint="/api/channels"} 1');
    });
  });

  describe('Summary Export', () => {
    test('should export summary with quantiles', () => {
      metrics.registerSummary('response_size_bytes', 'Response size', [0.5, 0.9, 0.99]);

      for (let i = 1; i <= 100; i++) {
        metrics.observeSummary('response_size_bytes', i * 100);
      }

      const output = exportPrometheusMetrics();

      expect(output).toContain('# HELP response_size_bytes Response size');
      expect(output).toContain('# TYPE response_size_bytes summary');

      // Quantiles
      expect(output).toMatch(/response_size_bytes\{quantile="0\.5"\} \d+/);
      expect(output).toMatch(/response_size_bytes\{quantile="0\.9"\} \d+/);
      expect(output).toMatch(/response_size_bytes\{quantile="0\.99"\} \d+/);

      // Sum and count
      expect(output).toContain('response_size_bytes_sum 505000');
      expect(output).toContain('response_size_bytes_count 100');
    });
  });

  describe('Label Escaping', () => {
    test('should escape special characters in labels', () => {
      metrics.registerCounter('escaped_counter', 'Counter with special chars');
      metrics.incrementCounter('escaped_counter', 1, {
        path: '/api/test\\special\n"quoted"'
      });

      const output = exportPrometheusMetrics();

      expect(output).toContain('escaped_counter{path="/api/test\\\\special\\n\\"quoted\\""} 1');
    });
  });

  describe('Multiple Metrics', () => {
    test('should export multiple metrics correctly', () => {
      metrics.registerCounter('total_requests', 'Total requests');
      metrics.registerGauge('active_connections', 'Active connections');
      metrics.registerHistogram('latency', 'Latency', [0.1, 1]);

      metrics.incrementCounter('total_requests', 100);
      metrics.setGauge('active_connections', 50);
      metrics.observeHistogram('latency', 0.5);

      const output = exportPrometheusMetrics();

      expect(output).toContain('# TYPE total_requests counter');
      expect(output).toContain('# TYPE active_connections gauge');
      expect(output).toContain('# TYPE latency histogram');

      expect(output).toContain('total_requests 100');
      expect(output).toContain('active_connections 50');
      expect(output).toContain('latency_count 1');
    });
  });

  describe('Empty Metrics', () => {
    test('should handle empty metrics gracefully', () => {
      const output = exportPrometheusMetrics();
      // May contain default initialized metrics, so just ensure it doesn't crash
      expect(output).toBeDefined();
      expect(typeof output).toBe('string');
    });
  });

  describe('Format Compliance', () => {
    test('should follow Prometheus text format', () => {
      metrics.registerCounter('sample_metric', 'A sample metric');
      metrics.incrementCounter('sample_metric', 1);

      const output = exportPrometheusMetrics();

      // Should have HELP line
      expect(output).toMatch(/^# HELP sample_metric A sample metric$/m);

      // Should have TYPE line
      expect(output).toMatch(/^# TYPE sample_metric counter$/m);

      // Should have metric line
      expect(output).toMatch(/^sample_metric 1$/m);
    });
  });
});
