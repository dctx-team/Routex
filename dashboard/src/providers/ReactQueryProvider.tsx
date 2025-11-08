/**
 * React Query Provider 配置
 * 提供全局数据缓存和状态管理
 */

import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// 创建 Query Client 实例
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据缓存配置
      staleTime: 30000, // 30秒内数据被视为新鲜
      gcTime: 300000, // 5分钟后清理未使用的缓存(原 cacheTime)

      // 重试配置
      retry: 2, // 失败后重试2次
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // 自动刷新配置
      refetchOnWindowFocus: false, // 窗口获得焦点时不自动刷新
      refetchOnReconnect: true, // 重新连接时刷新
      refetchOnMount: true, // 组件挂载时刷新

      // 错误处理
      throwOnError: false,
    },
    mutations: {
      // 变更配置
      retry: 1, // 失败后重试1次
      throwOnError: false,
    },
  },
});

/**
 * React Query Provider 组件
 */
export function ReactQueryProvider({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 开发环境显示 DevTools */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
