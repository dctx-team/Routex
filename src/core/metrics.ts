/**
 * Metrics collection system for monitoring Routex performance
 */

import { logger } from '../utils/logger';

export interface MetricPoint {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface Counter {
  name: string;
  help: string;
  value: number;
  labels: Map<string, number>;
}

export interface Gauge {
  name: string;
  help: string;
  value: number;
  labels: Map<string, number>;
}

export interface Histogram {
  name: string;
  help: string;
  sum: number;
  count: number;
  buckets: Map<number, number>; // bucket upper bound -> count
  labels: Map<string, { sum: number; count: number; buckets: Map<number, number> }>;
}

export interface Summary {
  name: string;
  help: string;
  sum: number;
  count: number;
  quantiles: Map<number, number>; // quantile -> value
  values: number[]; // for calculating quantiles
  maxSize: number;
}

export class MetricsCollector {
  private counters = new Map<string, Counter>();
  private gauges = new Map<string, Gauge>();
  private histograms = new Map<string, Histogram>();
  private summaries = new Map<string, Summary>();
  private startTime = Date.now();

  constructor() {
    this.initializeDefaultMetrics();
    logger.info('📊 Metrics collector initialized');
  }

  /**
   * Initialize default metrics
   */
  private initializeDefaultMetrics() {
    // Request metrics
    this.registerCounter('routex_requests_total', 'Total number of requests');
    this.registerCounter('routex_requests_success_total', 'Total number of successful requests');
    this.registerCounter('routex_requests_failed_total', 'Total number of failed requests');

    // Token metrics
    this.registerCounter('routex_tokens_input_total', 'Total input tokens processed');
    this.registerCounter('routex_tokens_output_total', 'Total output tokens processed');
    this.registerCounter('routex_tokens_cached_total', 'Total cached tokens used');

    // Latency metrics
    this.registerHistogram(
      'routex_request_duration_seconds',
      'Request duration in seconds',
      [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30]
    );

    // Channel metrics
    this.registerGauge('routex_channels_total', 'Total number of channels');
    this.registerGauge('routex_channels_enabled', 'Number of enabled channels');
    this.registerCounter('routex_channel_requests_total', 'Total requests per channel');

    // Circuit breaker metrics
    this.registerCounter('routex_circuit_breaker_open_total', 'Total circuit breaker opens');
    this.registerGauge('routex_circuit_breaker_open', 'Current circuit breaker state (1=open, 0=closed)');

    // Transformer metrics
    this.registerCounter('routex_transformer_runs_total', 'Total transformer runs');
    this.registerCounter('routex_transformer_errors_total', 'Total transformer errors');

    // Tee stream metrics
    this.registerCounter('routex_tee_sent_total', 'Total tee operations sent');
    this.registerCounter('routex_tee_failed_total', 'Total tee operations failed');
    this.registerGauge('routex_tee_queue_size', 'Current tee queue size');

    // Cache metrics
    this.registerCounter('routex_cache_hits_total', 'Total cache hits');
    this.registerCounter('routex_cache_misses_total', 'Total cache misses');
    this.registerGauge('routex_cache_size', 'Current cache size');

    // System metrics
    this.registerGauge('routex_uptime_seconds', 'Uptime in seconds');
    this.registerGauge('routex_memory_usage_bytes', 'Memory usage in bytes');
  }

  // ============================================================================
  // Counter Operations
  // ============================================================================

  registerCounter(name: string, help: string): void {
    if (!this.counters.has(name)) {
      this.counters.set(name, {
        name,
        help,
        value: 0,
        labels: new Map(),
      });
    }
  }

  incrementCounter(name: string, value = 1, labels?: Record<string, string>): void {
    const counter = this.counters.get(name);
    if (!counter) {
      logger.warn({ metric: name }, `⚠️  Counter ${name} not found`);
      return;
    }

    if (labels) {
      const labelKey = this.serializeLabels(labels);
      counter.labels.set(labelKey, (counter.labels.get(labelKey) || 0) + value);
    } else {
      counter.value += value;
    }
  }

  getCounter(name: string, labels?: Record<string, string>): number {
    const counter = this.counters.get(name);
    if (!counter) return 0;

    if (labels) {
      const labelKey = this.serializeLabels(labels);
      return counter.labels.get(labelKey) || 0;
    }
    return counter.value;
  }

  // ============================================================================
  // Gauge Operations
  // ============================================================================

  registerGauge(name: string, help: string): void {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, {
        name,
        help,
        value: 0,
        labels: new Map(),
      });
    }
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const gauge = this.gauges.get(name);
    if (!gauge) {
      logger.warn({ metric: name }, `⚠️  Gauge ${name} not found`);
      return;
    }

    if (labels) {
      const labelKey = this.serializeLabels(labels);
      gauge.labels.set(labelKey, value);
    } else {
      gauge.value = value;
    }
  }

  incrementGauge(name: string, value = 1, labels?: Record<string, string>): void {
    const gauge = this.gauges.get(name);
    if (!gauge) return;

    if (labels) {
      const labelKey = this.serializeLabels(labels);
      gauge.labels.set(labelKey, (gauge.labels.get(labelKey) || 0) + value);
    } else {
      gauge.value += value;
    }
  }

  decrementGauge(name: string, value = 1, labels?: Record<string, string>): void {
    this.incrementGauge(name, -value, labels);
  }

  getGauge(name: string, labels?: Record<string, string>): number {
    const gauge = this.gauges.get(name);
    if (!gauge) return 0;

    if (labels) {
      const labelKey = this.serializeLabels(labels);
      return gauge.labels.get(labelKey) || 0;
    }
    return gauge.value;
  }

  // ============================================================================
  // Histogram Operations
  // ============================================================================

  registerHistogram(name: string, help: string, buckets: number[]): void {
    if (!this.histograms.has(name)) {
      const bucketMap = new Map<number, number>();
      for (const bucket of [...buckets, Infinity]) {
        bucketMap.set(bucket, 0);
      }

      this.histograms.set(name, {
        name,
        help,
        sum: 0,
        count: 0,
        buckets: bucketMap,
        labels: new Map(),
      });
    }
  }

  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const histogram = this.histograms.get(name);
    if (!histogram) {
      logger.warn({ metric: name }, `⚠️  Histogram ${name} not found`);
      return;
    }

    if (labels) {
      const labelKey = this.serializeLabels(labels);
      let labelData = histogram.labels.get(labelKey);

      if (!labelData) {
        const bucketMap = new Map<number, number>();
        for (const bucket of histogram.buckets.keys()) {
          bucketMap.set(bucket, 0);
        }
        labelData = { sum: 0, count: 0, buckets: bucketMap };
        histogram.labels.set(labelKey, labelData);
      }

      labelData.sum += value;
      labelData.count++;

      for (const [bucket, count] of labelData.buckets.entries()) {
        if (value <= bucket) {
          labelData.buckets.set(bucket, count + 1);
        }
      }
    } else {
      histogram.sum += value;
      histogram.count++;

      for (const [bucket, count] of histogram.buckets.entries()) {
        if (value <= bucket) {
          histogram.buckets.set(bucket, count + 1);
        }
      }
    }
  }

  getHistogram(name: string, labels?: Record<string, string>): { sum: number; count: number; buckets: Map<number, number> } {
    const histogram = this.histograms.get(name);
    if (!histogram) {
      return { sum: 0, count: 0, buckets: new Map() };
    }

    if (labels) {
      const labelKey = this.serializeLabels(labels);
      const labelData = histogram.labels.get(labelKey);
      if (!labelData) {
        return { sum: 0, count: 0, buckets: new Map() };
      }
      return labelData;
    }

    return {
      sum: histogram.sum,
      count: histogram.count,
      buckets: histogram.buckets,
    };
  }

  // ============================================================================
  // Summary Operations
  // ============================================================================

  registerSummary(name: string, help: string, quantiles: number[], maxSize = 1000): void {
    if (!this.summaries.has(name)) {
      const quantileMap = new Map<number, number>();
      for (const quantile of quantiles) {
        quantileMap.set(quantile, 0);
      }

      this.summaries.set(name, {
        name,
        help,
        sum: 0,
        count: 0,
        quantiles: quantileMap,
        values: [],
        maxSize,
      });
    }
  }

  observeSummary(name: string, value: number): void {
    const summary = this.summaries.get(name);
    if (!summary) {
      logger.warn({ metric: name }, `⚠️  Summary ${name} not found`);
      return;
    }

    summary.sum += value;
    summary.count++;
    summary.values.push(value);

    // Keep only the most recent maxSize values
    if (summary.values.length > summary.maxSize) {
      summary.values.shift();
    }

    // Update quantiles
    this.updateQuantiles(summary);
  }

  private updateQuantiles(summary: Summary): void {
    if (summary.values.length === 0) return;

    const sorted = [...summary.values].sort((a, b) => a - b);

    for (const [quantile, _] of summary.quantiles.entries()) {
      const index = Math.ceil(quantile * sorted.length) - 1;
      summary.quantiles.set(quantile, sorted[Math.max(0, index)]);
    }
  }

  getSummaryMetric(name: string): { sum: number; count: number; quantiles: Map<number, number> } {
    const summary = this.summaries.get(name);
    if (!summary) {
      return { sum: 0, count: 0, quantiles: new Map() };
    }

    return {
      sum: summary.sum,
      count: summary.count,
      quantiles: summary.quantiles,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private serializeLabels(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics(): void {
    // Uptime
    const uptime = (Date.now() - this.startTime) / 1000;
    this.setGauge('routex_uptime_seconds', uptime);

    // Memory usage
    const memUsage = process.memoryUsage();
    this.setGauge('routex_memory_usage_bytes', memUsage.heapUsed, { type: 'heap' });
    this.setGauge('routex_memory_usage_bytes', memUsage.rss, { type: 'rss' });
    this.setGauge('routex_memory_usage_bytes', memUsage.external, { type: 'external' });
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    this.updateSystemMetrics();

    return {
      counters: Array.from(this.counters.values()).map(counter => ({
        name: counter.name,
        help: counter.help,
        type: 'counter',
        value: counter.value,
        labels: Array.from(counter.labels.entries()).map(([labels, value]) => ({
          labels: this.parseLabels(labels),
          value,
        })),
      })),
      gauges: Array.from(this.gauges.values()).map(gauge => ({
        name: gauge.name,
        help: gauge.help,
        type: 'gauge',
        value: gauge.value,
        labels: Array.from(gauge.labels.entries()).map(([labels, value]) => ({
          labels: this.parseLabels(labels),
          value,
        })),
      })),
      histograms: Array.from(this.histograms.values()).map(histogram => ({
        name: histogram.name,
        help: histogram.help,
        type: 'histogram',
        sum: histogram.sum,
        count: histogram.count,
        buckets: Array.from(histogram.buckets.entries()).map(([bucket, count]) => ({
          le: bucket,
          count,
        })),
        labels: Array.from(histogram.labels.entries()).map(([labels, data]) => ({
          labels: this.parseLabels(labels),
          sum: data.sum,
          count: data.count,
          buckets: Array.from(data.buckets.entries()).map(([bucket, count]) => ({
            le: bucket,
            count,
          })),
        })),
      })),
      summaries: Array.from(this.summaries.values()).map(summary => ({
        name: summary.name,
        help: summary.help,
        type: 'summary',
        sum: summary.sum,
        count: summary.count,
        quantiles: Array.from(summary.quantiles.entries()).map(([quantile, value]) => ({
          quantile,
          value,
        })),
      })),
    };
  }

  private parseLabels(labelStr: string): Record<string, string> {
    if (!labelStr) return {};

    const labels: Record<string, string> = {};
    const pairs = labelStr.split(',');

    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        labels[key] = value.replace(/^"|"$/g, '');
      }
    }

    return labels;
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    this.updateSystemMetrics();

    const totalRequests = this.getCounter('routex_requests_total');
    const successRequests = this.getCounter('routex_requests_success_total');
    const failedRequests = this.getCounter('routex_requests_failed_total');
    const successRate = totalRequests > 0 ? (successRequests / totalRequests) * 100 : 0;

    return {
      uptime: this.getGauge('routex_uptime_seconds'),
      requests: {
        total: totalRequests,
        success: successRequests,
        failed: failedRequests,
        successRate: successRate.toFixed(2) + '%',
      },
      tokens: {
        input: this.getCounter('routex_tokens_input_total'),
        output: this.getCounter('routex_tokens_output_total'),
        cached: this.getCounter('routex_tokens_cached_total'),
      },
      channels: {
        total: this.getGauge('routex_channels_total'),
        enabled: this.getGauge('routex_channels_enabled'),
      },
      cache: {
        hits: this.getCounter('routex_cache_hits_total'),
        misses: this.getCounter('routex_cache_misses_total'),
        size: this.getGauge('routex_cache_size'),
        hitRate: this.calculateCacheHitRate(),
      },
      memory: {
        heap: this.getGauge('routex_memory_usage_bytes', { type: 'heap' }),
        rss: this.getGauge('routex_memory_usage_bytes', { type: 'rss' }),
        external: this.getGauge('routex_memory_usage_bytes', { type: 'external' }),
      },
    };
  }

  private calculateCacheHitRate(): string {
    const hits = this.getCounter('routex_cache_hits_total');
    const misses = this.getCounter('routex_cache_misses_total');
    const total = hits + misses;

    if (total === 0) return '0.00%';
    return ((hits / total) * 100).toFixed(2) + '%';
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    for (const counter of this.counters.values()) {
      counter.value = 0;
      counter.labels.clear();
    }

    for (const gauge of this.gauges.values()) {
      gauge.value = 0;
      gauge.labels.clear();
    }

    for (const histogram of this.histograms.values()) {
      histogram.sum = 0;
      histogram.count = 0;
      for (const bucket of histogram.buckets.keys()) {
        histogram.buckets.set(bucket, 0);
      }
      histogram.labels.clear();
    }

    for (const summary of this.summaries.values()) {
      summary.sum = 0;
      summary.count = 0;
      summary.values = [];
      for (const quantile of summary.quantiles.keys()) {
        summary.quantiles.set(quantile, 0);
      }
    }

    this.startTime = Date.now();
    logger.info('📊 Metrics reset');
  }
}

// Global metrics instance
export const metrics = new MetricsCollector();
