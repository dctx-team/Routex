import { useState, useEffect, useMemo } from 'react';
import type { SystemStatus, Channel, LoadBalancerStrategy, Tab } from '../types';
import { t } from '../i18n';

const API_BASE = import.meta.env.DEV ? '/api' : window.location.origin + '/api';

/**
 * 应用程序全局状态管理 Hook
 * 管理应用的核心状态，包括系统状态、渠道数据、UI状态等
 */
export const useAppState = () => {
  // ===== 核心业务状态 =====
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);

  // ===== UI 状态 =====
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30000);

  // ===== 国际化状态 =====
  const [locale, setLocale] = useState<'en' | 'zh-CN'>('en');

  // ===== 交互状态 =====
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [pendingTraceId, setPendingTraceId] = useState<string | null>(null);

  // ===== 计算属性 =====
  const tabs = useMemo(() => [
    { id: 'overview' as Tab, label: t(locale, 'tab.overview'), icon: '🏠' },
    { id: 'channels' as Tab, label: t(locale, 'tab.channels'), icon: '📡' },
    { id: 'oauth' as Tab, label: t(locale, 'tab.oauth'), icon: '🔐' },
    { id: 'routing' as Tab, label: t(locale, 'tab.routing'), icon: '🛣️' },
    { id: 'transformers' as Tab, label: t(locale, 'tab.transformers'), icon: '🔄' },
    { id: 'tee' as Tab, label: t(locale, 'tab.tee'), icon: '📤' },
    { id: 'analytics' as Tab, label: t(locale, 'tab.analytics'), icon: '📊' },
    { id: 'logs' as Tab, label: t(locale, 'tab.logs'), icon: '📜' },
    { id: 'tracing' as Tab, label: t(locale, 'tab.tracing'), icon: '🔍' },
    { id: 'metrics' as Tab, label: t(locale, 'tab.metrics'), icon: '📈' },
    { id: 'cache' as Tab, label: t(locale, 'tab.cache'), icon: '💾' },
    { id: 'providers' as Tab, label: t(locale, 'tab.providers'), icon: '🔌' },
    { id: 'settings' as Tab, label: t(locale, 'tab.settings'), icon: '⚙️' },
  ], [locale]);

  // ===== 动作方法 =====
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLocaleChange = (newLocale: 'en' | 'zh-CN') => {
    setLocale(newLocale);
    localStorage.setItem('routex-locale', newLocale);
    showToast(`${t(newLocale, 'toast.languageChanged')} ${newLocale === 'en' ? t(newLocale, 'toast.english') : t(newLocale, 'toast.chinese')}`);

    // 尝试同步到 API
    fetch(`${API_BASE}/i18n/locale`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    }).catch(() => {
      console.debug('Could not sync locale to API');
    });
  };

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

  // ===== 副作用 =====
  // 初始化语言设置
  useEffect(() => {
    const savedLocale = localStorage.getItem('routex-locale') as 'en' | 'zh-CN' | null;
    if (savedLocale) {
      setLocale(savedLocale);
    }

    // 从 API 获取语言设置
    fetch(`${API_BASE}/i18n/locale`)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data?.locale) {
          setLocale(result.data.locale);
          localStorage.setItem('routex-locale', result.data.locale);
        }
      })
      .catch(() => {
        console.debug('API locale not available, using local storage');
      });
  }, []);

  // 监听 trace 事件
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

  return {
    // 状态
    status,
    channels,
    activeTab,
    loading,
    error,
    refreshInterval,
    locale,
    showModal,
    editingChannel,
    toast,
    pendingTraceId,
    tabs,

    // 设置器
    setStatus,
    setChannels,
    setActiveTab,
    setLoading,
    setError,
    setRefreshInterval,
    setShowModal,
    setEditingChannel,
    setPendingTraceId,

    // 动作方法
    showToast,
    handleLocaleChange,
    handleCreateChannel,
    handleEditChannel,
    handleCloseModal,

    // 常量
    API_BASE,
  };
};