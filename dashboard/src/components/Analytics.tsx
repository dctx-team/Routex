import React, { useState, useEffect } from 'react';
import type { Analytics as AnalyticsData } from '../types';
import { t, type Locale } from '../i18n';

interface AnalyticsProps {
  apiBase: string;
  locale?: Locale;
}

export function Analytics({ apiBase, locale = 'en' }: AnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${apiBase}/analytics`);
      if (!response.ok) throw new Error('Failed to load analytics');
      const data = await response.json();
      setAnalytics(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, [apiBase]);

  if (loading && !analytics) {
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
          <h2 className="text-2xl font-bold text-gray-800">{t(locale, 'analytics.title')}</h2>
          <button onClick={loadAnalytics} className="btn btn-primary">
            {t(locale, 'common.retry')}
          </button>
        </div>
        <div className="card bg-yellow-50 border-l-4 border-yellow-500">
          <h3 className="text-yellow-800 font-semibold mb-2">{t(locale, 'analytics.notAvailable')}</h3>
          <p className="text-yellow-700 mb-4">{error}</p>
          <p className="text-sm text-yellow-600">
            {t(locale, 'analytics.notAvailableDesc')}
          </p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">{t(locale, 'analytics.title')}</h2>
          <button onClick={loadAnalytics} className="btn btn-primary">
            {t(locale, 'common.refresh')}
          </button>
        </div>
        <div className="card">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{t(locale, 'analytics.noData')}</h3>
            <p className="text-gray-600">
              {t(locale, 'analytics.noDataDesc')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => num.toLocaleString();
  const formatPercent = (num: number) => `${num.toFixed(2)}%`;
  const formatLatency = (ms: number) => `${ms.toFixed(0)}ms`;
  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">{t(locale, 'analytics.title')}</h2>
        <button onClick={loadAnalytics} className="btn btn-primary" disabled={loading}>
          {loading ? t(locale, 'common.refreshing') : t(locale, 'common.refresh')}
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div>
            <p className="text-sm text-gray-600">{t(locale, 'analytics.totalRequests')}</p>
            <p className="text-2xl stat-value">{formatNumber(analytics.totalRequests)}</p>
          </div>
          <div className="text-4xl">📊</div>
        </div>

        <div className="stat-card">
          <div>
            <p className="text-sm text-gray-600">{t(locale, 'analytics.successRate')}</p>
            <p className="text-2xl stat-value">{formatPercent(analytics.successRate)}</p>
          </div>
          <div className="text-4xl">✅</div>
        </div>

        <div className="stat-card">
          <div>
            <p className="text-sm text-gray-600">{t(locale, 'analytics.avgLatency')}</p>
            <p className="text-2xl stat-value">{formatLatency(analytics.averageLatency)}</p>
          </div>
          <div className="text-4xl">⚡</div>
        </div>

        <div className="stat-card">
          <div>
            <p className="text-sm text-gray-600">{t(locale, 'analytics.totalCost')}</p>
            <p className="text-2xl stat-value">{formatCost(analytics.totalCost)}</p>
          </div>
          <div className="text-4xl">💰</div>
        </div>
      </div>

      {/* Request Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
            Request Statistics
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Successful</span>
              <span className="font-semibold text-green-600">{formatNumber(analytics.successfulRequests)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Failed</span>
              <span className="font-semibold text-red-600">{formatNumber(analytics.failedRequests)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Tokens</span>
              <span className="font-semibold text-gray-800">{formatNumber(analytics.totalTokensUsed)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
            Latency Percentiles
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Median (P50)</span>
              <span className="font-semibold text-gray-800">{formatLatency(analytics.medianLatency)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">P95</span>
              <span className="font-semibold text-gray-800">{formatLatency(analytics.p95Latency)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">P99</span>
              <span className="font-semibold text-gray-800">{formatLatency(analytics.p99Latency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Requests by Channel */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
          Requests by Channel
        </h3>
        <div className="space-y-3">
          {Object.entries(analytics.requestsByChannel).length > 0 ? (
            Object.entries(analytics.requestsByChannel)
              .sort(([, a], [, b]) => b - a)
              .map(([channel, count]) => {
                const percentage = analytics.totalRequests > 0 ? (count / analytics.totalRequests) * 100 : 0;
                return (
                  <div key={channel}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">{channel}</span>
                      <span className="text-sm font-semibold text-gray-800">
                        {formatNumber(count)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
          ) : (
            <p className="text-gray-500 text-center py-4">No channel data available</p>
          )}
        </div>
      </div>

      {/* Requests by Model */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
          Requests by Model
        </h3>
        <div className="space-y-3">
          {Object.entries(analytics.requestsByModel).length > 0 ? (
            Object.entries(analytics.requestsByModel)
              .sort(([, a], [, b]) => b - a)
              .map(([model, count]) => {
                const percentage = analytics.totalRequests > 0 ? (count / analytics.totalRequests) * 100 : 0;
                return (
                  <div key={model}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">{model}</span>
                      <span className="text-sm font-semibold text-gray-800">
                        {formatNumber(count)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
          ) : (
            <p className="text-gray-500 text-center py-4">No model data available</p>
          )}
        </div>
      </div>

      {/* Errors by Type */}
      {Object.keys(analytics.errorsByType).length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
            Errors by Type
          </h3>
          <div className="space-y-3">
            {Object.entries(analytics.errorsByType)
              .sort(([, a], [, b]) => b - a)
              .map(([errorType, count]) => (
                <div key={errorType} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">{errorType}</span>
                  <span className="badge badge-error">{formatNumber(count)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Latency by Channel */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
          Average Latency by Channel
        </h3>
        <div className="space-y-3">
          {Object.entries(analytics.latencyByChannel).length > 0 ? (
            Object.entries(analytics.latencyByChannel)
              .sort(([, a], [, b]) => a - b)
              .map(([channel, latency]) => (
                <div key={channel} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">{channel}</span>
                  <span className="badge badge-info">{formatLatency(latency)}</span>
                </div>
              ))
          ) : (
            <p className="text-gray-500 text-center py-4">No latency data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
