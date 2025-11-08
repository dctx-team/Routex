import { create } from 'zustand';
import type { SystemStatus, Channel, LoadBalancerStrategy } from '../types';

// 应用全局状态类型定义
export interface AppState {
  // 基础状态
  activeTab: string;
  loading: boolean;
  error: string | null;
  refreshInterval: number;
  locale: 'en' | 'zh-CN';

  // 数据状态
  status: SystemStatus | null;
  channels: Channel[];

  // UI 状态
  showModal: boolean;
  editingChannel: Channel | null;
  toast: { message: string; type: 'success' | 'error' } | null;
  pendingTraceId: string | null;
}

export interface AppActions {
  // Tab 操作
  setActiveTab: (tab: string) => void;

  // 数据操作
  setStatus: (status: SystemStatus | null) => void;
  setChannels: (channels: Channel[]) => void;

  // 加载状态
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // 刷新间隔
  setRefreshInterval: (interval: number) => void;

  // 国际化
  setLocale: (locale: 'en' | 'zh-CN') => void;

  // Modal 操作
  setShowModal: (show: boolean) => void;
  setEditingChannel: (channel: Channel | null) => void;

  // Toast 操作
  showToast: (message: string, type?: 'success' | 'error') => void;
  clearToast: () => void;

  // 追踪操作
  setPendingTraceId: (traceId: string | null) => void;

  // 重置操作
  reset: () => void;
}

// 初始状态
const initialState: AppState = {
  activeTab: 'overview',
  loading: false,
  error: null,
  refreshInterval: 30000,
  locale: 'en',
  status: null,
  channels: [],
  showModal: false,
  editingChannel: null,
  toast: null,
  pendingTraceId: null,
};

// 创建 Zustand Store
export const useAppStore = create<AppState & AppActions>()(
  (set, get) => ({
      ...initialState,

      // Tab 操作
      setActiveTab: (tab: string) => set({ activeTab: tab }, false, 'setActiveTab'),

      // 数据操作
      setStatus: (status: SystemStatus | null) => set({ status }, false, 'setStatus'),
      setChannels: (channels: Channel[]) => set({ channels }, false, 'setChannels'),

      // 加载状态
      setLoading: (loading: boolean) => set({ loading }, false, 'setLoading'),
      setError: (error: string | null) => set({ error }, false, 'setError'),

      // 刷新间隔
      setRefreshInterval: (refreshInterval: number) =>
        set({ refreshInterval }, false, 'setRefreshInterval'),

      // 国际化
      setLocale: (locale: 'en' | 'zh-CN') => set({ locale }, false, 'setLocale'),

      // Modal 操作
      setShowModal: (showModal: boolean) =>
        set({ showModal }, false, 'setShowModal'),
      setEditingChannel: (editingChannel: Channel | null) =>
        set({ editingChannel }, false, 'setEditingChannel'),

      // Toast 操作
      showToast: (message: string, type: 'success' | 'error' = 'success') => {
        set({ toast: { message, type } }, false, 'showToast');
        // 3秒后自动清除
        setTimeout(() => {
          get().clearToast();
        }, 3000);
      },
      clearToast: () => set({ toast: null }, false, 'clearToast'),

      // 追踪操作
      setPendingTraceId: (pendingTraceId: string | null) =>
        set({ pendingTraceId }, false, 'setPendingTraceId'),

      // 重置操作
      reset: () => set(initialState),
    })
);

// 选择器 hooks - 优化性能，避免不必要的重渲染
export const useAppState = () => useAppStore((state) => state);
export const useAppActions = () => useAppStore((state) => {
  // 提取 actions，排除 state
  const {
    setActiveTab,
    setStatus,
    setChannels,
    setLoading,
    setError,
    setRefreshInterval,
    setLocale,
    setShowModal,
    setEditingChannel,
    showToast,
    clearToast,
    setPendingTraceId,
    reset,
  } = state;

  return {
    setActiveTab,
    setStatus,
    setChannels,
    setLoading,
    setError,
    setRefreshInterval,
    setLocale,
    setShowModal,
    setEditingChannel,
    showToast,
    clearToast,
    setPendingTraceId,
    reset,
  };
});

// 常用组合 hooks
export const useActiveTab = () => useAppStore((state) => state.activeTab);
export const useLoading = () => useAppStore((state) => state.loading);
export const useError = () => useAppStore((state) => state.error);
export const useStatus = () => useAppStore((state) => state.status);
export const useChannels = () => useAppStore((state) => state.channels);
export const useLocale = () => useAppStore((state) => state.locale);
export const useToast = () => useAppStore((state) => state.toast);
export const useRefreshInterval = () => useAppStore((state) => state.refreshInterval);

// UI 状态 hooks
export const useShowModal = () => useAppStore((state) => state.showModal);
export const useEditingChannel = () => useAppStore((state) => state.editingChannel);
export const usePendingTraceId = () => useAppStore((state) => state.pendingTraceId);