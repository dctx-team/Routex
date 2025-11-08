/**
 * Optimized App Component with Lazy Loading and Feature Grouping
 */

import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import type { SystemStatus, Channel, LoadBalancerStrategy } from './types';
import { Toast } from './components/Toast';
import { ThemeToggle } from './components/ThemeProvider';
import { t } from './i18n';

// Eager-loaded components (shown immediately)
import { Dashboard } from './components/Dashboard';
import { ChannelList } from './components/ChannelList';
import { ChannelModal } from './components/ChannelModal';

// Lazy-loaded components (loaded on demand)
const Analytics = lazy(() => import('./components/Analytics').then(m => ({ default: m.Analytics })));
const RequestLogs = lazy(() => import('./components/RequestLogs').then(m => ({ default: m.RequestLogs })));
const MetricsView = lazy(() => import('./components/MetricsView').then(m => ({ default: m.MetricsView })));
const Tracing = lazy(() => import('./components/Tracing').then(m => ({ default: m.Tracing })));
const RoutingRules = lazy(() => import('./components/RoutingRules').then(m => ({ default: m.RoutingRules })));
const TransformersManager = lazy(() => import('./components/TransformersManager').then(m => ({ default: m.TransformersManager })));
const TeeManager = lazy(() => import('./components/TeeManager').then(m => ({ default: m.TeeManager })));
const CacheManager = lazy(() => import('./components/CacheManager').then(m => ({ default: m.CacheManager })));
const Providers = lazy(() => import('./components/Providers').then(m => ({ default: m.Providers })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const OAuthLogin = lazy(() => import('./components/OAuthLogin').then(m => ({ default: m.OAuthLogin })));
const OAuthManager = lazy(() => import('./components/OAuthManager').then(m => ({ default: m.OAuthManager })));

const API_BASE = import.meta.env.DEV ? '/api' : window.location.origin + '/api';

// 分组Tab类型
type TabGroup = 'core' | 'traffic' | 'monitoring' | 'system';
type Tab =
  | 'overview' | 'channels' | 'oauth'  // core
  | 'routing' | 'transformers' | 'tee' // traffic
  | 'analytics' | 'logs' | 'metrics' | 'tracing'  // monitoring
  | 'cache' | 'providers' | 'settings'; // system

// 骨架屏组件
const LoadingSkeleton = () => (
  <div className="card p-6 animate-pulse">
    <div className="h-8 bg-white/20 rounded w-1/4 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-white/10 rounded w-3/4"></div>
      <div className="h-4 bg-white/10 rounded w-1/2"></div>
      <div className="h-4 bg-white/10 rounded w-5/6"></div>
    </div>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [locale, setLocale] = useState<'en' | 'zh-CN'>('en');

  // Load locale from localStorage or API on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('routex-locale') as 'en' | 'zh-CN' | null;
    if (savedLocale) {
      setLocale(savedLocale);
    }
    fetchLocale();
  }, []);

  const fetchLocale = async () => {
    try {
      const response = await fetch(`${API_BASE}/i18n/locale`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.locale) {
          setLocale(result.data.locale);
          localStorage.setItem('routex-locale', result.data.locale);
        }
      }
    } catch (err) {
      console.debug('API locale not available, using local storage');
    }
  };

  const handleLocaleChange = async (newLocale: 'en' | 'zh-CN') => {
    setLocale(newLocale);
    localStorage.setItem('routex-locale', newLocale);
    showToast(`${t(newLocale, 'toast.languageChanged')} ${newLocale === 'en' ? t(newLocale, 'toast.english') : t(newLocale, 'toast.chinese')}`);

    try {
      await fetch(`${API_BASE}/i18n/locale`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      });
    } catch (err) {
      console.debug('Could not sync locale to API');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusRes, channelsRes] = await Promise.all([
        fetch(`${API_BASE}`),
        fetch(`${API_BASE}/channels`),
      ]);

      if (!statusRes.ok || !channelsRes.ok) {
        throw new Error('Failed to load data');
      }

      const statusData = await statusRes.json();
      const channelsData = await channelsRes.json();

      setStatus(statusData);
      setChannels(channelsData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (refreshInterval > 0) {
      const interval = setInterval(loadData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const handleCreateChannel = () => {
    setEditingChannel(null);
    setShowModal(true);
  };

  const handleEditChannel = (channel: Channel) => {
    setEditingChannel(channel);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingChannel(null);
  };

  const handleSaveChannel = async (channelData: Channel) => {
    try {
      const isEdit = !!editingChannel;
      const url = isEdit
        ? `${API_BASE}/channels/${editingChannel.name}`
        : `${API_BASE}/channels`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channelData),
      });

      if (!response.ok) {
        throw new Error(`Failed to save channel: ${response.statusText}`);
      }

      showToast(isEdit ? 'Channel updated' : 'Channel created');
      handleCloseModal();
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    }
  };

  const handleDeleteChannel = async (name: string) => {
    if (!confirm(`Are you sure you want to delete channel "${name}"?`)) return;

    try {
      const response = await fetch(`${API_BASE}/channels/${name}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete channel');
      }

      showToast('Channel deleted');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete', 'error');
    }
  };

  const handleToggleChannel = async (channel: Channel) => {
    try {
      const newStatus = channel.status === 'enabled' ? 'disabled' : 'enabled';
      const response = await fetch(`${API_BASE}/channels/${channel.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...channel, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle channel');
      }

      showToast(`Channel ${newStatus === 'enabled' ? 'enabled' : 'disabled'}`);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to toggle', 'error');
    }
  };

  const handleChangeStrategy = async (strategy: LoadBalancerStrategy) => {
    try {
      const response = await fetch(`${API_BASE}/strategy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy }),
      });

      if (!response.ok) {
        throw new Error('Failed to change strategy');
      }

      showToast('Load balancer strategy updated');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to change strategy', 'error');
    }
  };

  // 分组的Tab配置
  const tabGroups: Record<TabGroup, { id: Tab; label: string; icon: string }[]> = useMemo(() => ({
    core: [
      { id: 'overview', label: t(locale, 'tab.overview'), icon: '🏠' },
      { id: 'channels', label: t(locale, 'tab.channels'), icon: '📡' },
      { id: 'oauth', label: t(locale, 'tab.oauth'), icon: '🔐' },
    ],
    traffic: [
      { id: 'routing', label: t(locale, 'tab.routing'), icon: '🛣️' },
      { id: 'transformers', label: t(locale, 'tab.transformers'), icon: '🔄' },
      { id: 'tee', label: t(locale, 'tab.tee'), icon: '📤' },
    ],
    monitoring: [
      { id: 'analytics', label: t(locale, 'tab.analytics'), icon: '📊' },
      { id: 'logs', label: t(locale, 'tab.logs'), icon: '📜' },
      { id: 'metrics', label: t(locale, 'tab.metrics'), icon: '📈' },
      { id: 'tracing', label: t(locale, 'tab.tracing'), icon: '🔍' },
    ],
    system: [
      { id: 'cache', label: t(locale, 'tab.cache'), icon: '💾' },
      { id: 'providers', label: t(locale, 'tab.providers'), icon: '🔌' },
      { id: 'settings', label: t(locale, 'tab.settings'), icon: '⚙️' },
    ],
  }), [locale]);

  const groupLabels: Record<TabGroup, string> = {
    core: locale === 'zh-CN' ? '核心' : 'Core',
    traffic: locale === 'zh-CN' ? '流量' : 'Traffic',
    monitoring: locale === 'zh-CN' ? '监控' : 'Monitoring',
    system: locale === 'zh-CN' ? '系统' : 'System',
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Error and Loading State */}
        {error && (
          <div className="mb-6 bg-red-500 text-white rounded-lg p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold mb-1">{locale === 'zh-CN' ? '连接问题' : 'Connection Issue'}</h3>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={loadData}
              className="btn btn-secondary bg-white/20 hover:bg-white/30 text-white px-4 py-2"
              disabled={loading}
            >
              {loading ? (locale === 'zh-CN' ? '重试中...' : 'Retrying...') : (locale === 'zh-CN' ? '重试' : 'Retry')}
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-white">
            <h1 className="text-3xl font-bold mb-1">{t(locale, 'header.title')}</h1>
            <p className="text-sm text-white/80">{t(locale, 'header.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1 flex items-center gap-1">
              <button
                onClick={() => handleLocaleChange('en')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  locale === 'en'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                English
              </button>
              <button
                onClick={() => handleLocaleChange('zh-CN')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  locale === 'zh-CN'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                中文
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Grouped */}
        <div className="card mb-6 p-0 overflow-hidden">
          <div className="flex flex-col md:flex-row overflow-x-auto scrollbar-thin">
            {(Object.entries(tabGroups) as [TabGroup, typeof tabGroups[TabGroup]][]).map(([groupKey, tabs]) => (
              <div key={groupKey} className="flex-shrink-0">
                <div className="text-xs font-semibold text-white/60 px-4 py-2 bg-white/5">
                  {groupLabels[groupKey]}
                </div>
                <div className="flex md:flex-col">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`tab whitespace-nowrap ${activeTab === tab.id ? 'active' : ''}`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Refresh Interval Control */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <label className="text-sm font-medium text-white">
              {t(locale, 'header.autoRefresh')}
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="border-0 text-sm bg-white/90 rounded px-2 py-1 focus:ring-0 text-gray-800"
            >
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
              <option value={300000}>5m</option>
              <option value={0}>{t(locale, 'header.off')}</option>
            </select>
          </div>
        </div>

        {/* Tab Content with Suspense */}
        <Suspense fallback={<LoadingSkeleton />}>
          {activeTab === 'overview' && (
            <Dashboard
              status={status}
              onRefresh={loadData}
              onCreateChannel={handleCreateChannel}
              onChangeStrategy={handleChangeStrategy}
              loading={loading}
              locale={locale}
            />
          )}

          {activeTab === 'channels' && (
            <ChannelList
              channels={channels}
              onEdit={handleEditChannel}
              onDelete={handleDeleteChannel}
              onToggle={handleToggleChannel}
              apiBase={API_BASE}
              showToast={showToast}
              locale={locale}
            />
          )}

          {activeTab === 'oauth' && (
            <div className="space-y-6">
              <OAuthLogin onSessionCreated={() => loadData()} />
              <OAuthManager />
            </div>
          )}

          {activeTab === 'routing' && (
            <RoutingRules apiBase={API_BASE} showToast={showToast} locale={locale} />
          )}

          {activeTab === 'transformers' && (
            <TransformersManager apiBase={API_BASE} showToast={showToast} locale={locale} />
          )}

          {activeTab === 'tee' && (
            <TeeManager apiBase={API_BASE} showToast={showToast} locale={locale} />
          )}

          {activeTab === 'analytics' && <Analytics apiBase={API_BASE} locale={locale} />}

          {activeTab === 'logs' && <RequestLogs apiBase={API_BASE} locale={locale} />}

          {activeTab === 'metrics' && <MetricsView apiBase={API_BASE} locale={locale} />}

          {activeTab === 'tracing' && (
            <Tracing apiBase={API_BASE} showToast={showToast} locale={locale} />
          )}

          {activeTab === 'cache' && <CacheManager apiBase={API_BASE} showToast={showToast} locale={locale} />}

          {activeTab === 'providers' && (
            <Providers apiBase={API_BASE} showToast={showToast} locale={locale} />
          )}

          {activeTab === 'settings' && (
            <Settings apiBase={API_BASE} showToast={showToast} locale={locale} />
          )}
        </Suspense>

        {showModal && (
          <ChannelModal
            channel={editingChannel}
            onClose={handleCloseModal}
            onSave={handleSaveChannel}
          />
        )}

        {toast && <Toast message={toast.message} type={toast.type} />}

        <footer className="text-center text-white mt-12 pb-4">
          <p className="text-sm">
            Routex {status?.version || ''} © 2025 |{' '}
            <a
              href="https://github.com/dctx-team/Routex"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary-200"
            >
              GitHub
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
