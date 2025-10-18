/**
 * Prometheus metrics exporter
 * Converts internal metrics to Prometheus text format
 */

import { metrics } from './metrics';

/**
 * Escape label value for Prometheus format
 */
function escapeLabel(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"');
}

/**
 * Format labels for Prometheus
 */
function formatLabels(labels: Record<string, string>): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return '';

  const formatted = entries
    .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
    .join(',');

  return `{${formatted}}`;
}

/**
 * Export metrics in Prometheus text format
 */
export function exportPrometheusMetrics(): string {
  const allMetrics = metrics.getAllMetrics();
  const lines: string[] = [];

  // Export counters
  for (const counter of allMetrics.counters) {
    // HELP and TYPE lines
    lines.push(`# HELP ${counter.name} ${counter.help}`);
    lines.push(`# TYPE ${counter.name} counter`);

    // Main value (no labels)
    if (counter.value > 0) {
      lines.push(`${counter.name} ${counter.value}`);
    }

    // Labeled values
    for (const labelData of counter.labels) {
      if (labelData.value > 0) {
        const labelStr = formatLabels(labelData.labels);
        lines.push(`${counter.name}${labelStr} ${labelData.value}`);
      }
    }

    lines.push(''); // Empty line between metrics
  }

  // Export gauges
  for (const gauge of allMetrics.gauges) {
    lines.push(`# HELP ${gauge.name} ${gauge.help}`);
    lines.push(`# TYPE ${gauge.name} gauge`);

    // Main value (no labels)
    if (gauge.value !== 0) {
      lines.push(`${gauge.name} ${gauge.value}`);
    }

    // Labeled values
    for (const labelData of gauge.labels) {
      if (labelData.value !== 0) {
        const labelStr = formatLabels(labelData.labels);
        lines.push(`${gauge.name}${labelStr} ${labelData.value}`);
      }
    }

    lines.push('');
  }

  // Export histograms
  for (const histogram of allMetrics.histograms) {
    lines.push(`# HELP ${histogram.name} ${histogram.help}`);
    lines.push(`# TYPE ${histogram.name} histogram`);

    // Main histogram (no labels)
    if (histogram.count > 0) {
      for (const bucket of histogram.buckets) {
        const le = bucket.le === Infinity ? '+Inf' : bucket.le.toString();
        lines.push(`${histogram.name}_bucket{le="${le}"} ${bucket.count}`);
      }
      lines.push(`${histogram.name}_sum ${histogram.sum}`);
      lines.push(`${histogram.name}_count ${histogram.count}`);
    }

    // Labeled histograms
    for (const labelData of histogram.labels) {
      if (labelData.count > 0) {
        const baseLabels = labelData.labels;

        for (const bucket of labelData.buckets) {
          const le = bucket.le === Infinity ? '+Inf' : bucket.le.toString();
          const labels = { ...baseLabels, le };
          const labelStr = formatLabels(labels);
          lines.push(`${histogram.name}_bucket${labelStr} ${bucket.count}`);
        }

        const labelStr = formatLabels(baseLabels);
        lines.push(`${histogram.name}_sum${labelStr} ${labelData.sum}`);
        lines.push(`${histogram.name}_count${labelStr} ${labelData.count}`);
      }
    }

    lines.push('');
  }

  // Export summaries
  for (const summary of allMetrics.summaries) {
    lines.push(`# HELP ${summary.name} ${summary.help}`);
    lines.push(`# TYPE ${summary.name} summary`);

    if (summary.count > 0) {
      // Quantiles
      for (const quantile of summary.quantiles) {
        lines.push(
          `${summary.name}{quantile="${quantile.quantile}"} ${quantile.value}`
        );
      }

      // Sum and count
      lines.push(`${summary.name}_sum ${summary.sum}`);
      lines.push(`${summary.name}_count ${summary.count}`);
    }

    lines.push('');
  }

  // Add scrape timestamp
  lines.push(`# Generated at ${new Date().toISOString()}`);
  lines.push(`# Routex Metrics Exporter`);

  return lines.join('\n');
}

/**
 * Get Prometheus metrics as Response
 */
export function getPrometheusMetricsResponse(): Response {
  const metricsText = exportPrometheusMetrics();

  return new Response(metricsText, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
