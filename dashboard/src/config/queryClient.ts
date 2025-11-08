/**
 * React Query 配置
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30秒内数据被视为新鲜
      staleTime: 30000,
      // 5分钟后缓存数据被清理
      gcTime: 300000,
      // 窗口聚焦时重新获取
      refetchOnWindowFocus: true,
      // 重连时重新获取
      refetchOnReconnect: true,
      // 失败后重试1次
      retry: 1,
      // 重试延迟
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Mutation 失败后重试1次
      retry: 1,
    },
  },
});
