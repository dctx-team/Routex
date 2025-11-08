import React, { useState, useEffect, useMemo } from 'react';
import type { SystemStatus, Channel, LoadBalancerStrategy } from './types';
import { Dashboard } from './components/Dashboard';
import { ChannelList } from './components/ChannelList';
import { ChannelModal } from './components/ChannelModal';
import { Analytics } from './components/Analytics';
import { RequestLogs } from './components/RequestLogs';
import { MetricsView } from './components/MetricsView';
import { CacheManager } from './components/CacheManager';
import { RoutingRules } from './components/RoutingRules';
import { TransformersManager } from './components/TransformersManager';
import { TeeManager } from './components/TeeManager';
import { Tracing } from './components/Tracing';
import { Providers } from './components/Providers';
import { OAuthLogin } from './components/OAuthLogin';
import { OAuthManager } from './components/OAuthManager';
import { Toast } from './components/Toast';
import { Settings } from './components/Settings';
import { ThemeToggle } from './components/ThemeProvider';
import { t } from './i18n';

const API_BASE = import.meta.env.DEV ? '/api' : window.location.origin + '/api';

type Tab = 'overview' | 'channels' | 'routing' | 'transformers' | 'tee' | 'analytics' | 'logs' | 'tracing' | 'metrics' | 'cache' | 'providers' | 'oauth' | 'settings';

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
  const [pendingTraceId, setPendingTraceId] = useState<string | null>(null);

  // Load locale from localStorage or API on mount
  useEffect(() => {
    // First try to load from localStorage
    const savedLocale = localStorage.getItem('routex-locale') as 'en' | 'zh-CN' | null;
    if (savedLocale) {
      setLocale(savedLocale);
    }
    // Then try to fetch from API (optional)
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
      // Silently fail - use localStorage or default
      console.debug('API locale not available, using local storage');
    }
  };

  const handleLocaleChange = async (newLocale: 'en' | 'zh-CN') => {
    // Always update local state and localStorage
    setLocale(newLocale);
    localStorage.setItem('routex-locale', newLocale);
    showToast(`${t(newLocale, 'toast.languageChanged')} ${newLocale === 'en' ? t(newLocale, 'toast.english') : t(newLocale, 'toast.chinese')}`);

    // Try to update API if available
    try {
      await fetch(`${API_BASE}/i18n/locale`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      });
    } catch (err) {
      // Silently fail - local change is already applied
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
    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // 监听 RequestLogs 发出的 open-trace 事件，自动切换到追踪页并加载详情
  useEffect(() => {
    const onOpenTrace = (e: Event) => {
      const detail = (e as CustomEvent).detail as { traceId?: string };
      if (detail?.traceId) {
        setPendingTraceId(detail.traceId);
        setActiveTab('tracing');
      }
    };
    window.addEventListener('open-trace', onOpenTrace as EventListener);
    return () => window.removeEventListener('open-trace', onOpenTrace as EventListener);
  }, []);

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

  const tabs: { id: Tab; label: string; icon: string }[] = useMemo(() => [
    { id: 'overview', label: t(locale, 'tab.overview'), icon: '🏠' },
    { id: 'channels', label: t(locale, 'tab.channels'), icon: '📡' },
    { id: 'oauth', label: t(locale, 'tab.oauth'), icon: '🔐' },
    { id: 'routing', label: t(locale, 'tab.routing'), icon: '🛣️' },
    { id: 'transformers', label: t(locale, 'tab.transformers'), icon: '🔄' },
    { id: 'tee', label: t(locale, 'tab.tee'), icon: '📤' },
    { id: 'analytics', label: t(locale, 'tab.analytics'), icon: '📊' },
    { id: 'logs', label: t(locale, 'tab.logs'), icon: '📜' },
    { id: 'tracing', label: t(locale, 'tab.tracing'), icon: '🔍' },
    { id: 'metrics', label: t(locale, 'tab.metrics'), icon: '📈' },
    { id: 'cache', label: t(locale, 'tab.cache'), icon: '💾' },
    { id: 'providers', label: t(locale, 'tab.providers'), icon: '🔌' },
    { id: 'settings', label: t(locale, 'tab.settings'), icon: '⚙️' },
  ], [locale]); // 依赖 locale,确保语言切换时重新计算

  // 改进的加载和错误处理 - 即使在加载或错误状态下也显示基本界面
  const showBasicLayout = loading || error || !status;

  // 创建一个模拟的空状态，用于在数据加载失败时显示
  const mockStatus: SystemStatus = status || {
    version: '1.0.0',
    uptime: 0,
    loadBalancer: {
      strategy: 'priority',
      cacheStats: {
        size: 0,
        maxCapacity: 1000,
        utilization: 0
      }
    },
    totalChannels: 0,
    enabledChannels: 0,
    routingRules: 0,
    transformers: 0,
    apiEndpoints: 0
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 错误和加载状态提示 - 保持在顶部 */}
        {error && (
          <div className="mb-6 bg-red-500 text-white rounded-lg p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold mb-1">连接问题</h3>
              <p className="text-sm">{error}</p>
              <p className="text-xs mt-1 opacity-90">后端服务可能未启动，但您仍可以使用基本功能</p>
            </div>
            <button
              onClick={loadData}
              className="btn btn-secondary bg-white/20 hover:bg-white/30 text-white px-4 py-2"
              disabled={loading}
            >
              {loading ? '重试中...' : '重试连接'}
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="mb-6 bg-blue-500 text-white rounded-lg p-4 flex items-center">
            <div className="spinner mr-3" style={{ width: '1.5rem', height: '1.5rem' }}></div>
            <div>
              <p className="font-medium">正在连接后端服务...</p>
              <p className="text-sm opacity-90">请稍候，界面功能仍可正常使用</p>
            </div>
          </div>
        )}

        {/* Header with Language Switcher */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-white">
            <h1 className="text-3xl font-bold mb-1">{t(locale, 'header.title')}</h1>
            <p className="text-sm text-white/80">{t(locale, 'header.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Language Switcher */}
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

        {/* Tab Navigation */}
        <div className="card mb-6 p-0 overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-thin">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
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

        {/* Tab Content */}
        {/* 移除 status 依赖,允许组件在没有数据时也能显示友好界面 */}
        <>
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

          {activeTab === 'tracing' && (
            <Tracing apiBase={API_BASE} showToast={showToast} locale={locale} />
          )}

          {activeTab === 'metrics' && <MetricsView apiBase={API_BASE} locale={locale} />}

          {activeTab === 'cache' && <CacheManager apiBase={API_BASE} showToast={showToast} locale={locale} />}

          {activeTab === 'providers' && (
            <Providers apiBase={API_BASE} showToast={showToast} locale={locale} />
          )}

          {activeTab === 'settings' && (
            <Settings apiBase={API_BASE} showToast={showToast} locale={locale} />
          )}
        </>

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
