/**
 * 应用常量定义
 */

// API相关
export const API_TIMEOUT = 30000; // 30秒
export const API_RETRY_COUNT = 2;

// 缓存相关
export const CACHE_STALE_TIME = 30000; // 30秒
export const CACHE_GC_TIME = 300000; // 5分钟

// 分页相关
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// 刷新间隔
export const REFRESH_INTERVALS = {
  FAST: 5000,    // 5秒
  NORMAL: 30000, // 30秒
  SLOW: 60000,   // 1分钟
  VERY_SLOW: 300000, // 5分钟
} as const;

// 主题相关
export const THEME_STORAGE_KEY = 'routex-theme';
export const LOCALE_STORAGE_KEY = 'routex-locale';

// 支持的语言
export const SUPPORTED_LOCALES = ['en', 'zh-CN'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

// 主题模式
export const THEME_MODES = ['light', 'dark', 'auto'] as const;
export type ThemeMode = typeof THEME_MODES[number];
