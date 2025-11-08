/**
 * 主题配置
 * Theme configuration with light and dark modes
 */

export interface ThemeColors {
  // Primary colors
  primary: string;
  'primary-dark': string;
  'primary-light': string;

  // Background colors
  background: string;
  surface: string;
  'surface-elevated': string;

  // Text colors
  text: string;
  'text-secondary': string;
  'text-disabled': string;

  // Border colors
  border: string;
  'border-light': string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface Theme {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
}

// 明亮主题
export const lightTheme: Theme = {
  id: 'light',
  name: 'Light',
  mode: 'light',
  colors: {
    primary: '#3b82f6',
    'primary-dark': '#2563eb',
    'primary-light': '#60a5fa',

    background: '#ffffff',
    surface: '#f9fafb',
    'surface-elevated': '#ffffff',

    text: '#111827',
    'text-secondary': '#6b7280',
    'text-disabled': '#9ca3af',

    border: '#e5e7eb',
    'border-light': '#f3f4f6',

    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
};

// 暗黑主题
export const darkTheme: Theme = {
  id: 'dark',
  name: 'Dark',
  mode: 'dark',
  colors: {
    primary: '#60a5fa',
    'primary-dark': '#3b82f6',
    'primary-light': '#93c5fd',

    background: '#0f172a',
    surface: '#1e293b',
    'surface-elevated': '#334155',

    text: '#f1f5f9',
    'text-secondary': '#cbd5e1',
    'text-disabled': '#64748b',

    border: '#334155',
    'border-light': '#475569',

    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
  },
};

// 所有可用主题
export const themes: Record<string, Theme> = {
  light: lightTheme,
  dark: darkTheme,
};

// 默认主题
export const defaultTheme = lightTheme;
