/**
 * 主题提供者组件
 * Theme Provider Component
 */

import React, { useEffect } from 'react';
import { useGlobalStore } from '../stores/globalStore';
import { themes } from '../config/themes';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { preferences } = useGlobalStore();
  const theme = themes[preferences.theme.mode] || themes.light;

  useEffect(() => {
    // 应用主题到CSS变量
    const root = document.documentElement;

    // 设置所有颜色变量
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // 添加/移除 dark class
    if (theme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 设置 meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme.colors.background);
    }
  }, [theme]);

  return <>{children}</>;
}

/**
 * 主题切换按钮组件
 */
export function ThemeToggle() {
  const { preferences, setTheme } = useGlobalStore();
  const currentMode = preferences.theme.mode;

  const toggleTheme = () => {
    const newMode = currentMode === 'light' ? 'dark' : 'light';
    setTheme(themes[newMode]);
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
      title={`Switch to ${currentMode === 'light' ? 'dark' : 'light'} mode`}
    >
      {currentMode === 'light' ? (
        // 月亮图标（暗黑模式）
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ) : (
        // 太阳图标（明亮模式）
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )}
    </button>
  );
}

/**
 * 自动检测系统主题
 */
export function useSystemTheme(): 'light' | 'dark' {
  const [systemTheme, setSystemTheme] = React.useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // 设置初始值
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    // 监听变化
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return systemTheme;
}
