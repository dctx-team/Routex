/**
 * 全局状态管理 - 使用 Zustand
 * Global state management using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale } from '../i18n';

// 主题定义
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface Theme {
  mode: ThemeMode;
  name: string;
}

// 通知定义
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// 用户偏好设置
export interface UserPreferences {
  theme: Theme;
  locale: Locale;
  refreshInterval: number;
  compactMode: boolean;
  showNotifications: boolean;
}

// 全局状态接口
interface GlobalState {
  // 用户偏好
  preferences: UserPreferences;

  // 通知
  notifications: Notification[];

  // UI 状态
  commandPaletteOpen: boolean;
  sidebarCollapsed: boolean;

  // Actions - 偏好设置
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  setRefreshInterval: (interval: number) => void;
  setCompactMode: (compact: boolean) => void;

  // Actions - 通知
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // Actions - UI
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

// 默认主题
const defaultTheme: Theme = {
  mode: 'light',
  name: 'Default Light',
};

// 默认偏好设置
const defaultPreferences: UserPreferences = {
  theme: defaultTheme,
  locale: 'en',
  refreshInterval: 30000,
  compactMode: false,
  showNotifications: true,
};

// 创建全局状态 store
export const useGlobalStore = create<GlobalState>()(
  persist(
    (set) => ({
      // 初始状态
      preferences: defaultPreferences,
      notifications: [],
      commandPaletteOpen: false,
      sidebarCollapsed: false,

      // 偏好设置 Actions
      setTheme: (theme) =>
        set((state) => ({
          preferences: { ...state.preferences, theme },
        })),

      setLocale: (locale) =>
        set((state) => ({
          preferences: { ...state.preferences, locale },
        })),

      setRefreshInterval: (interval) =>
        set((state) => ({
          preferences: { ...state.preferences, refreshInterval: interval },
        })),

      setCompactMode: (compact) =>
        set((state) => ({
          preferences: { ...state.preferences, compactMode: compact },
        })),

      // 通知 Actions
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              id: crypto.randomUUID(),
              timestamp: new Date(),
              read: false,
              ...notification,
            },
            ...state.notifications,
          ].slice(0, 50), // 最多保留 50 条通知
        })),

      markNotificationAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      clearNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearAllNotifications: () => set({ notifications: [] }),

      // UI Actions
      toggleCommandPalette: () =>
        set((state) => ({
          commandPaletteOpen: !state.commandPaletteOpen,
        })),

      setCommandPaletteOpen: (open) =>
        set({ commandPaletteOpen: open }),

      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),
    }),
    {
      name: 'routex-global-store', // localStorage key
      partialize: (state) => ({
        // 只持久化偏好设置
        preferences: state.preferences,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

// 导出选择器函数（优化性能）
export const selectTheme = (state: GlobalState) => state.preferences.theme;
export const selectLocale = (state: GlobalState) => state.preferences.locale;
export const selectRefreshInterval = (state: GlobalState) => state.preferences.refreshInterval;
export const selectNotifications = (state: GlobalState) => state.notifications;
export const selectUnreadCount = (state: GlobalState) =>
  state.notifications.filter((n) => !n.read).length;
