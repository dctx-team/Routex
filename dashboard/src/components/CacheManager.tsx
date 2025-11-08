import React, { useState, useEffect } from 'react';
import type { CacheStats, CacheConfig } from '../types';
import { t, type Locale } from '../i18n';

interface CacheManagerProps {
  apiBase: string;
  showToast: (message: string, type: 'success' | 'error') => void;
  locale?: Locale;
}

export function CacheManager({ apiBase, showToast, locale = 'en' }: CacheManagerProps) {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [config, setConfig] = useState<CacheConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warming, setWarming] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CacheConfig | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, configRes] = await Promise.all([
        fetch(`${apiBase}/cache/stats`),
        fetch(`${apiBase}/cache/config`),
      ]);

      if (!statsRes.ok || !configRes.ok) {
        throw new Error('Failed to load cache data');
      }

      const statsData = await statsRes.json();
      const configData = await configRes.json();

      setStats(statsData.data);
      setConfig(configData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [apiBase]);

  const handleWarmCache = async () => {
    try {
      setWarming(true);
      const response = await fetch(`${apiBase}/cache/warm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Failed to warm cache');
      showToast(t(locale, 'cache.warmStarted'), 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to warm cache', 'error');
    } finally {
      setWarming(false);
    }
  };

  const handleInvalidateCache = async () => {
    if (!confirm(t(locale, 'cache.confirmInvalidate'))) {
      return;
    }

    try {
      const response = await fetch(`${apiBase}/cache/invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Failed to invalidate cache');
      showToast(t(locale, 'cache.invalidated'), 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to invalidate cache', 'error');
    }
  };

  const handleInvalidateAndWarm = async () => {
    try {
      setWarming(true);
      const response = await fetch(`${apiBase}/cache/invalidate-and-warm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Failed to invalidate and warm cache');
      showToast(t(locale, 'cache.invalidateAndWarmStarted'), 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to invalidate and warm cache', 'error');
    } finally {
      setWarming(false);
    }
  };

  const handleResetStats = async () => {
    if (!confirm(t(locale, 'cache.confirmResetStats'))) {
      return;
    }

    try {
      const response = await fetch(`${apiBase}/cache/reset-stats`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to reset stats');
      showToast(t(locale, 'cache.statsReset'), 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reset stats', 'error');
    }
  };

  const handleToggleCache = async () => {
    if (!config) return;

    try {
      const response = await fetch(`${apiBase}/cache/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, enabled: !config.enabled }),
      });

      if (!response.ok) throw new Error('Failed to update cache config');
      const action = !config.enabled ? t(locale, 'cache.enabled').toLowerCase() : t(locale, 'cache.disabled').toLowerCase();
      showToast(t(locale, 'cache.toggled').replace('{0}', action), 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update cache config', 'error');
    }
  };

  const handleEditConfig = () => {
    if (!config) return;
    setEditingConfig({ ...config });
    setShowConfigModal(true);
  };

  const handleSaveConfig = async () => {
    if (!editingConfig) return;

    try {
      const response = await fetch(`${apiBase}/cache/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingConfig),
      });

      if (!response.ok) throw new Error('Failed to save cache config');
      showToast(t(locale, 'cache.configSaved'), 'success');
      setShowConfigModal(false);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save config', 'error');
    }
  };

  if (loading && !stats && !config) {
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
          <h2 className="text-2xl font-bold text-gray-800">{t(locale, 'cache.title')}</h2>
          <button onClick={loadData} className="btn btn-primary">
            {t(locale, 'common.retry')}
          </button>
        </div>
        <div className="card bg-yellow-50 border-l-4 border-yellow-500">
          <h3 className="text-yellow-800 font-semibold mb-2">{t(locale, 'cache.notAvailable')}</h3>
          <p className="text-yellow-700 mb-4">{error}</p>
          <p className="text-sm text-yellow-600">
            {t(locale, 'cache.notAvailableDesc')}
          </p>
        </div>
      </div>
    );
  }

  if (!stats || !config) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">{t(locale, 'cache.title')}</h2>
          <button onClick={loadData} className="btn btn-primary">
            {t(locale, 'common.refresh')}
          </button>
        </div>
        <div className="card">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💾</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{t(locale, 'cache.noData')}</h3>
            <p className="text-gray-600">
              {t(locale, 'cache.noDataDesc')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-white">{t(locale, 'cache.title')}</h2>
        <div className="flex gap-3">
          <button onClick={loadData} className="btn btn-primary" disabled={loading}>
            {loading ? t(locale, 'common.refreshing') : t(locale, 'common.refresh')}
          </button>
          <button onClick={handleToggleCache} className="btn btn-secondary">
            {config.enabled ? t(locale, 'cache.disableCache') : t(locale, 'cache.enableCache')}
          </button>
        </div>
      </div>

      {/* Cache Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div>
            <p className="text-sm text-gray-600">{t(locale, 'cache.status')}</p>
            <p className="text-2xl stat-value">{stats.enabled ? t(locale, 'cache.enabled') : t(locale, 'cache.disabled')}</p>
          </div>
          <div className="text-4xl">{stats.enabled ? '✅' : '❌'}</div>
        </div>

        <div className="stat-card">
          <div>
            <p className="text-sm text-gray-600">{t(locale, 'cache.itemsInCache')}</p>
            <p className="text-2xl stat-value">{stats.itemsInCache.toLocaleString()}</p>
          </div>
          <div className="text-4xl">💾</div>
        </div>

        <div className="stat-card">
          <div>
            <p className="text-sm text-gray-600">{t(locale, 'cache.hitRate')}</p>
            <p className="text-2xl stat-value">{(stats.cacheHitRate || 0).toFixed(2)}%</p>
          </div>
          <div className="text-4xl">🎯</div>
        </div>

        <div className="stat-card">
          <div>
            <p className="text-sm text-gray-600">{t(locale, 'cache.totalWarms')}</p>
            <p className="text-2xl stat-value">{stats.totalWarms.toLocaleString()}</p>
          </div>
          <div className="text-4xl">🔥</div>
        </div>
      </div>

      {/* Cache Statistics */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
          {t(locale, 'cache.statistics')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">{t(locale, 'cache.successfulWarms')}</p>
            <p className="text-3xl font-bold text-green-600">{stats.successfulWarms.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">{t(locale, 'cache.failedWarms')}</p>
            <p className="text-3xl font-bold text-red-600">{stats.failedWarms.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">{t(locale, 'cache.lastWarmTime')}</p>
            <p className="text-xl font-bold text-gray-800">
              {stats.lastWarmTime ? new Date(stats.lastWarmTime).toLocaleString() : t(locale, 'cache.never')}
            </p>
          </div>
        </div>

        {stats.totalWarms > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{t(locale, 'cache.successRate')}</span>
              <span className="font-semibold">
                {(stats.totalWarms > 0 ? (stats.successfulWarms / stats.totalWarms) * 100 : 0).toFixed(2)}%
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${stats.totalWarms > 0 ? (stats.successfulWarms / stats.totalWarms) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Cache Configuration */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{t(locale, 'cache.configuration')}</h3>
          <button onClick={handleEditConfig} className="btn btn-primary text-sm">
            {t(locale, 'cache.editConfiguration')}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">{t(locale, 'cache.warmInterval')}</p>
            <p className="text-2xl font-bold text-gray-800">{config.interval.toLocaleString()}ms</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">{t(locale, 'cache.maxConcurrency')}</p>
            <p className="text-2xl font-bold text-gray-800">{config.maxConcurrency}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">{t(locale, 'cache.warmOnStartup')}</p>
            <p className="text-2xl font-bold text-gray-800">{config.warmOnStartup ? t(locale, 'cache.yes') : t(locale, 'cache.no')}</p>
          </div>
        </div>
      </div>

      {/* Cache Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
          {t(locale, 'cache.actions')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={handleWarmCache}
            className="btn btn-success w-full"
            disabled={warming || !stats.enabled}
          >
            {warming ? t(locale, 'cache.warming') : t(locale, 'cache.warmCache')}
          </button>
          <button
            onClick={handleInvalidateCache}
            className="btn btn-danger w-full"
            disabled={warming}
          >
            {t(locale, 'cache.invalidateCache')}
          </button>
          <button
            onClick={handleInvalidateAndWarm}
            className="btn btn-primary w-full"
            disabled={warming || !stats.enabled}
          >
            {warming ? t(locale, 'cache.processing') : t(locale, 'cache.invalidateAndWarm')}
          </button>
          <button
            onClick={handleResetStats}
            className="btn btn-secondary w-full"
          >
            {t(locale, 'cache.resetStatistics')}
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-4">
          {t(locale, 'cache.operationsNote')}
        </p>
      </div>

      {/* Cache Items */}
      {config.items && config.items.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
            {t(locale, 'cache.configuredItems')} ({config.items.length})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
            {config.items.map((item, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="badge badge-info">{item.model}</span>
                  {item.maxTokens && (
                    <span className="text-sm text-gray-600">{t(locale, 'cache.maxTokens')}: {item.maxTokens}</span>
                  )}
                </div>
                <p className="text-sm text-gray-700 font-mono bg-white p-2 rounded border border-gray-200 mb-2">
                  {item.prompt}
                </p>
                {item.systemPrompt && (
                  <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border border-gray-200">
                    {t(locale, 'cache.system')}: {item.systemPrompt}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && editingConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideIn">
            <h3 className="text-xl font-bold mb-4 text-gray-800">{t(locale, 'cache.editConfigTitle')}</h3>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingConfig.enabled}
                    onChange={(e) => setEditingConfig({ ...editingConfig, enabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">{t(locale, 'cache.enableCache')}</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  {t(locale, 'cache.warmIntervalMs')}
                </label>
                <input
                  type="number"
                  value={editingConfig.interval}
                  onChange={(e) => setEditingConfig({ ...editingConfig, interval: parseInt(e.target.value) })}
                  className="input"
                  min="1000"
                />
                <p className="text-xs text-gray-500 mt-1">{t(locale, 'cache.warmIntervalDesc')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  {t(locale, 'cache.maxConcurrency')}
                </label>
                <input
                  type="number"
                  value={editingConfig.maxConcurrency}
                  onChange={(e) => setEditingConfig({ ...editingConfig, maxConcurrency: parseInt(e.target.value) })}
                  className="input"
                  min="1"
                  max="10"
                />
                <p className="text-xs text-gray-500 mt-1">{t(locale, 'cache.maxConcurrencyDesc')}</p>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingConfig.warmOnStartup}
                    onChange={(e) => setEditingConfig({ ...editingConfig, warmOnStartup: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">{t(locale, 'cache.warmOnStartup')}</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">{t(locale, 'cache.warmOnStartupDesc')}</p>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button onClick={() => setShowConfigModal(false)} className="btn btn-secondary">
                  {t(locale, 'common.cancel')}
                </button>
                <button onClick={handleSaveConfig} className="btn btn-primary">
                  {t(locale, 'common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
