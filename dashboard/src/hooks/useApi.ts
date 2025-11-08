/**
 * 自定义 Hooks 工具库
 * 提供常用的React Hooks封装
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAppStore } from '../store';
import type {
  SystemStatus,
  Channel,
  Analytics,
  RequestLog,
  RoutingRule,
  CacheStats,
  CacheConfig,
  Metrics,
  ChannelTestResult,
  TeeDestination,
  Transformer,
  TraceStats,
  Trace,
  Provider,
  LoadBalancerStrategy,
} from '../types';

// ==================== 系统状态 ====================

/**
 * 获取系统状态
 */
export function useSystemStatus(options?: Omit<UseQueryOptions<SystemStatus>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['systemStatus'],
    queryFn: () => api.getSystemStatus(),
    refetchInterval: 30000, // 每30秒自动刷新
    ...options,
  });
}

// ==================== 频道管理 ====================

/**
 * 获取所有频道
 */
export function useChannels(options?: Omit<UseQueryOptions<Channel[]>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['channels'],
    queryFn: () => api.getChannels(),
    refetchInterval: 30000,
    ...options,
  });
}

/**
 * 创建频道
 */
export function useCreateChannel() {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: (channel: Partial<Channel>) => api.createChannel(channel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      addToast('频道创建成功', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message || '创建频道失败', 'error');
    },
  });
}

/**
 * 更新频道
 */
export function useUpdateChannel() {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: ({ name, updates }: { name: string; updates: Partial<Channel> }) =>
      api.updateChannel(name, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      addToast('频道更新成功', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message || '更新频道失败', 'error');
    },
  });
}

/**
 * 删除频道
 */
export function useDeleteChannel() {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: (name: string) => api.deleteChannel(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      addToast('频道删除成功', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message || '删除频道失败', 'error');
    },
  });
}

/**
 * 测试频道
 */
export function useTestChannel() {
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: ({ name, model }: { name: string; model?: string }) =>
      api.testChannel(name, model),
    onSuccess: (result) => {
      if (result.success) {
        addToast(`频道测试成功,延迟: ${result.latency}ms`, 'success');
      } else {
        addToast(`频道测试失败: ${result.error}`, 'error');
      }
    },
    onError: (error: Error) => {
      addToast(error.message || '测试频道失败', 'error');
    },
  });
}

/**
 * 批量测试所有频道
 */
export function useTestAllChannels() {
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: () => api.testAllChannels(),
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      addToast(`测试完成: ${successCount}/${results.length} 个频道正常`, 'success');
    },
    onError: (error: Error) => {
      addToast(error.message || '批量测试失败', 'error');
    },
  });
}

// ==================== 负载均衡策略 ====================

/**
 * 更新负载均衡策略
 */
export function useUpdateStrategy() {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: (strategy: LoadBalancerStrategy) => api.updateStrategy(strategy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
      addToast('负载均衡策略已更新', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message || '更新策略失败', 'error');
    },
  });
}

// ==================== 分析数据 ====================

/**
 * 获取分析数据
 */
export function useAnalytics(timeRange?: string, options?: Omit<UseQueryOptions<Analytics>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: () => api.getAnalytics(timeRange),
    refetchInterval: 60000, // 每分钟刷新
    ...options,
  });
}

// ==================== 请求日志 ====================

/**
 * 获取请求日志
 */
export function useRequestLogs(limit?: number, offset?: number, options?: Omit<UseQueryOptions<RequestLog[]>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['logs', limit, offset],
    queryFn: () => api.getRequestLogs(limit, offset),
    refetchInterval: 10000, // 每10秒刷新
    ...options,
  });
}

// ==================== 路由规则 ====================

/**
 * 获取路由规则
 */
export function useRoutingRules(options?: Omit<UseQueryOptions<RoutingRule[]>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['routingRules'],
    queryFn: () => api.getRoutingRules(),
    ...options,
  });
}

/**
 * 创建路由规则
 */
export function useCreateRoutingRule() {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: (rule: Partial<RoutingRule>) => api.createRoutingRule(rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routingRules'] });
      addToast('路由规则创建成功', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message || '创建路由规则失败', 'error');
    },
  });
}

/**
 * 更新路由规则
 */
export function useUpdateRoutingRule() {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<RoutingRule> }) =>
      api.updateRoutingRule(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routingRules'] });
      addToast('路由规则更新成功', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message || '更新路由规则失败', 'error');
    },
  });
}

/**
 * 删除路由规则
 */
export function useDeleteRoutingRule() {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: (id: string) => api.deleteRoutingRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routingRules'] });
      addToast('路由规则删除成功', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message || '删除路由规则失败', 'error');
    },
  });
}

// ==================== 缓存管理 ====================

/**
 * 获取缓存统计
 */
export function useCacheStats(options?: Omit<UseQueryOptions<CacheStats>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['cacheStats'],
    queryFn: () => api.getCacheStats(),
    refetchInterval: 30000,
    ...options,
  });
}

/**
 * 获取缓存配置
 */
export function useCacheConfig(options?: Omit<UseQueryOptions<CacheConfig>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['cacheConfig'],
    queryFn: () => api.getCacheConfig(),
    ...options,
  });
}

/**
 * 更新缓存配置
 */
export function useUpdateCacheConfig() {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: (config: Partial<CacheConfig>) => api.updateCacheConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cacheConfig'] });
      queryClient.invalidateQueries({ queryKey: ['cacheStats'] });
      addToast('缓存配置已更新', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message || '更新缓存配置失败', 'error');
    },
  });
}

/**
 * 清空缓存
 */
export function useClearCache() {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: () => api.clearCache(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cacheStats'] });
      addToast('缓存已清空', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message || '清空缓存失败', 'error');
    },
  });
}

// ==================== 指标数据 ====================

/**
 * 获取系统指标
 */
export function useMetrics(options?: Omit<UseQueryOptions<Metrics>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: () => api.getMetrics(),
    refetchInterval: 30000,
    ...options,
  });
}

// ==================== Tee 目标管理 ====================

/**
 * 获取 Tee 目标
 */
export function useTeeDestinations(options?: Omit<UseQueryOptions<TeeDestination[]>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['teeDestinations'],
    queryFn: () => api.getTeeDestinations(),
    ...options,
  });
}

/**
 * 创建 Tee 目标
 */
export function useCreateTeeDestination() {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: (destination: Partial<TeeDestination>) => api.createTeeDestination(destination),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teeDestinations'] });
      addToast('Tee 目标创建成功', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message || '创建 Tee 目标失败', 'error');
    },
  });
}

/**
 * 更新 Tee 目标
 */
export function useUpdateTeeDestination() {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TeeDestination> }) =>
      api.updateTeeDestination(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teeDestinations'] });
      addToast('Tee 目标更新成功', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message || '更新 Tee 目标失败', 'error');
    },
  });
}

/**
 * 删除 Tee 目标
 */
export function useDeleteTeeDestination() {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: (id: string) => api.deleteTeeDestination(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teeDestinations'] });
      addToast('Tee 目标删除成功', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message || '删除 Tee 目标失败', 'error');
    },
  });
}

// ==================== 转换器管理 ====================

/**
 * 获取转换器
 */
export function useTransformers(options?: Omit<UseQueryOptions<Transformer[]>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['transformers'],
    queryFn: () => api.getTransformers(),
    ...options,
  });
}

/**
 * 更新转换器
 */
export function useUpdateTransformer() {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Transformer> }) =>
      api.updateTransformer(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transformers'] });
      addToast('转换器更新成功', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message || '更新转换器失败', 'error');
    },
  });
}

// ==================== 追踪数据 ====================

/**
 * 获取追踪统计
 */
export function useTraceStats(options?: Omit<UseQueryOptions<TraceStats>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['traceStats'],
    queryFn: () => api.getTraceStats(),
    refetchInterval: 30000,
    ...options,
  });
}

/**
 * 获取追踪详情
 */
export function useTrace(traceId: string, options?: Omit<UseQueryOptions<Trace>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['trace', traceId],
    queryFn: () => api.getTrace(traceId),
    enabled: !!traceId,
    ...options,
  });
}

// ==================== 提供商信息 ====================

/**
 * 获取提供商列表
 */
export function useProviders(options?: Omit<UseQueryOptions<Provider[]>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['providers'],
    queryFn: () => api.getProviders(),
    staleTime: Infinity, // 提供商信息几乎不变,无需频繁刷新
    ...options,
  });
}

// ==================== 国际化 ====================

/**
 * 设置语言
 */
export function useSetLocale() {
  const { setLocale, addToast } = useAppStore();

  return useMutation({
    mutationFn: (locale: 'en' | 'zh-CN') => api.setLocale(locale),
    onSuccess: (_, locale) => {
      setLocale(locale);
      addToast(`语言已切换为 ${locale === 'en' ? 'English' : '中文'}`, 'success');
    },
    onError: (error: Error) => {
      addToast(error.message || '切换语言失败', 'error');
    },
  });
}
