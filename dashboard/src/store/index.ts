/**
 * 全局状态管理 Store
 * 使用 Zustand 进行轻量级状态管理
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { SystemStatus, Channel } from '../types';

// Toast 通知类型
export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

// 全局应用状态接口
export interface AppState {
  // UI状态
  locale: 'en' | 'zh-CN';
  theme: 'light' | 'dark' | 'auto';
  sidebarCollapsed: boolean;

  // 数据状态
  systemStatus: SystemStatus | null;
  channels: Channel[];

  // Toast通知队列
  toasts: ToastMessage[];

  // 加载状态
  isLoading: boolean;

  // 错误状态
  error: string | null;

  // 刷新间隔(毫秒)
  refreshInterval: number;
}

// Actions接口
export interface AppActions {
  // UI Actions
  setLocale: (locale: 'en' | 'zh-CN') => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  toggleSidebar: () => void;

  // 数据 Actions
  setSystemStatus: (status: SystemStatus | null) => void;
  setChannels: (channels: Channel[]) => void;
  updateChannel: (name: string, updates: Partial<Channel>) => void;

  // Toast Actions
  addToast: (message: string, type?: ToastMessage['type'], duration?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // 加载和错误 Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // 刷新间隔
  setRefreshInterval: (interval: number) => void;

  // 重置状态
  reset: () => void;
}

// 初始状态
const initialState: AppState = {
  locale: 'en',
  theme: 'auto',
  sidebarCollapsed: false,
  systemStatus: null,
  channels: [],
  toasts: [],
  isLoading: false,
  error: null,
  refreshInterval: 30000, // 默认30秒
};

/**
 * 全局应用 Store
 *
 * 使用方式:
 * const { locale, setLocale } = useAppStore();
 */
export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      immer((set) => ({
        // 初始状态
        ...initialState,

        // UI Actions
        setLocale: (locale) => {
          set((state) => {
            state.locale = locale;
          });
          // 同步到 localStorage
          localStorage.setItem('routex-locale', locale);
        },

        setTheme: (theme) => {
          set((state) => {
            state.theme = theme;
          });
        },

        toggleSidebar: () => {
          set((state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
          });
        },

        // 数据 Actions
        setSystemStatus: (status) => {
          set((state) => {
            state.systemStatus = status;
          });
        },

        setChannels: (channels) => {
          set((state) => {
            state.channels = channels;
          });
        },

        updateChannel: (name, updates) => {
          set((state) => {
            const index = state.channels.findIndex(ch => ch.name === name);
            if (index !== -1) {
              state.channels[index] = { ...state.channels[index], ...updates };
            }
          });
        },

        // Toast Actions
        addToast: (message, type = 'success', duration = 3000) => {
          const id = `toast-${Date.now()}-${Math.random()}`;
          set((state) => {
            state.toasts.push({ id, message, type, duration });
          });

          // 自动移除
          if (duration > 0) {
            setTimeout(() => {
              set((state) => {
                state.toasts = state.toasts.filter(t => t.id !== id);
              });
            }, duration);
          }
        },

        removeToast: (id) => {
          set((state) => {
            state.toasts = state.toasts.filter(t => t.id !== id);
          });
        },

        clearToasts: () => {
          set((state) => {
            state.toasts = [];
          });
        },

        // 加载和错误 Actions
        setLoading: (loading) => {
          set((state) => {
            state.isLoading = loading;
          });
        },

        setError: (error) => {
          set((state) => {
            state.error = error;
          });
        },

        // 刷新间隔
        setRefreshInterval: (interval) => {
          set((state) => {
            state.refreshInterval = interval;
          });
        },

        // 重置状态
        reset: () => {
          set(initialState);
        },
      })),
      {
        name: 'routex-app-store', // localStorage key
        partialize: (state) => ({
          // 只持久化这些字段
          locale: state.locale,
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          refreshInterval: state.refreshInterval,
        }),
      }
    ),
    {
      name: 'Routex App Store', // DevTools 名称
    }
  )
);

// 便捷的 selector hooks
export const useLocale = () => useAppStore((state) => state.locale);
export const useTheme = () => useAppStore((state) => state.theme);
export const useToasts = () => useAppStore((state) => state.toasts);
export const useSystemStatus = () => useAppStore((state) => state.systemStatus);
export const useChannels = () => useAppStore((state) => state.channels);
