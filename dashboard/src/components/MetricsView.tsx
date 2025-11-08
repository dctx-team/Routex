import React, { useState, useEffect } from 'react';
import type { Metrics } from '../types';
import { t, type Locale } from '../i18n';

interface MetricsViewProps {
  apiBase: string;
  locale?: Locale;
}

export function MetricsView({ apiBase, locale = 'en' }: MetricsViewProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${apiBase}/metrics`);
      if (!response.ok) throw new Error('Failed to load metrics');
      const data = await response.json();
      setMetrics(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all metrics? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${apiBase}/metrics/reset`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to reset metrics');
      await loadMetrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset metrics');
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [apiBase]);

  if (loading && !metrics) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="spinner"></div>
          <span className="ml-3 text-gray-600">{t(locale, 'common.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">{t(locale, 'metrics.title')}</h2>
          <button onClick={loadMetrics} className="btn btn-primary">
            {t(locale, 'common.retry')}
          </button>
        </div>
        <div className="card bg-yellow-50 border-l-4 border-yellow-500">
          <h3 className="text-yellow-800 font-semibold mb-2">{t(locale, 'metrics.notAvailable')}</h3>
          <p className="text-yellow-700 mb-4">{error}</p>
          <p className="text-sm text-yellow-600">
            {t(locale, 'metrics.notAvailableDesc')}
          </p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">{t(locale, 'metrics.title')}</h2>
          <button onClick={loadMetrics} className="btn btn-primary">
            {t(locale, 'common.refresh')}
          </button>
        </div>
        <div className="card">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📈</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{t(locale, 'metrics.noData')}</h3>
            <p className="text-gray-600">
              {t(locale, 'metrics.noDataDesc')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => num.toLocaleString();
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">{t(locale, 'metrics.title')}</h2>
        <div className="flex gap-3">
          <button onClick={loadMetrics} className="btn btn-primary" disabled={loading}>
            {loading ? t(locale, 'common.refreshing') : t(locale, 'common.refresh')}
          </button>
          <button onClick={handleReset} className="btn btn-danger">
            {t(locale, 'metrics.resetMetrics')}
          </button>
        </div>
      </div>

      {/* Request Metrics */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
          Request Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Requests</p>
            <p className="text-3xl font-bold text-gray-800">{formatNumber(metrics.requests.total)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Successful</p>
            <p className="text-3xl font-bold text-green-600">{formatNumber(metrics.requests.successful)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Failed</p>
            <p className="text-3xl font-bold text-red-600">{formatNumber(metrics.requests.failed)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Request Rate</p>
            <p className="text-3xl font-bold text-blue-600">{(metrics.requests.rate || 0).toFixed(2)}/s</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Success Rate</span>
            <span className="font-semibold">
              {metrics.requests.total > 0
                ? ((metrics.requests.successful / metrics.requests.total) * 100).toFixed(2)
                : 0}
              %
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width:
                  metrics.requests.total > 0
                    ? `${(metrics.requests.successful / metrics.requests.total) * 100}%`
                    : '0%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Latency Metrics */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
          Latency Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Average</p>
            <p className="text-2xl font-bold text-gray-800">{(metrics.latency.average || 0).toFixed(0)}ms</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Median</p>
            <p className="text-2xl font-bold text-gray-800">{(metrics.latency.median || 0).toFixed(0)}ms</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">P95</p>
            <p className="text-2xl font-bold text-yellow-600">{(metrics.latency.p95 || 0).toFixed(0)}ms</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">P99</p>
            <p className="text-2xl font-bold text-orange-600">{(metrics.latency.p99 || 0).toFixed(0)}ms</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Min</p>
            <p className="text-2xl font-bold text-green-600">{(metrics.latency.min || 0).toFixed(0)}ms</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Max</p>
            <p className="text-2xl font-bold text-red-600">{(metrics.latency.max || 0).toFixed(0)}ms</p>
          </div>
        </div>
      </div>

      {/* Token Metrics */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
          Token Usage
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Input Tokens</p>
            <p className="text-3xl font-bold text-blue-600">{formatNumber(metrics.tokens.input)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Output Tokens</p>
            <p className="text-3xl font-bold text-purple-600">{formatNumber(metrics.tokens.output)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Tokens</p>
            <p className="text-3xl font-bold text-gray-800">{formatNumber(metrics.tokens.total)}</p>
          </div>
        </div>
      </div>

      {/* Cost Metrics */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
          Cost Analysis
        </h3>
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-1">Total Cost</p>
          <p className="text-4xl font-bold text-gray-800">${(metrics.cost.total || 0).toFixed(4)}</p>
        </div>

        {Object.keys(metrics.cost.byChannel).length > 0 && (
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-700 mb-3">Cost by Channel</h4>
            <div className="space-y-2">
              {Object.entries(metrics.cost.byChannel)
                .sort(([, a], [, b]) => b - a)
                .map(([channel, cost]) => (
                  <div key={channel} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{channel}</span>
                    <span className="font-semibold text-gray-800">${(cost || 0).toFixed(4)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {Object.keys(metrics.cost.byModel).length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-gray-700 mb-3">Cost by Model</h4>
            <div className="space-y-2">
              {Object.entries(metrics.cost.byModel)
                .sort(([, a], [, b]) => b - a)
                .map(([model, cost]) => (
                  <div key={model} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 font-mono">{model}</span>
                    <span className="font-semibold text-gray-800">${(cost || 0).toFixed(4)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Channel Status & System Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
            Channel Status
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Channels</span>
              <span className="badge badge-success">{metrics.channels.active}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Inactive Channels</span>
              <span className="badge badge-warning">{metrics.channels.inactive}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Errored Channels</span>
              <span className="badge badge-error">{metrics.channels.errored}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
            System Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Uptime</span>
              <span className="font-semibold text-gray-800">{formatUptime(metrics.system.uptime)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Memory (RSS)</span>
              <span className="font-semibold text-gray-800">{metrics.system.memoryUsage.rss}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Heap Used</span>
              <span className="font-semibold text-gray-800">{metrics.system.memoryUsage.heapUsed}</span>
            </div>
            {metrics.system.cpuUsage !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">CPU Usage</span>
                <span className="font-semibold text-gray-800">{(metrics.system.cpuUsage || 0).toFixed(2)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
