/**
 * API 服务层
 * 统一处理所有 API 请求,包括错误处理、重试逻辑、请求拦截等
 */

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

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API 错误类
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API 客户端类
 */
class RoutexAPIClient {
  private baseURL: string;
  private retryCount: number = 2;
  private retryDelay: number = 1000;

  constructor() {
    // 根据环境设置 baseURL
    this.baseURL = import.meta.env.DEV ? '/api' : window.location.origin + '/api';
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    let lastError: Error | null = null;

    // 重试逻辑
    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        // 处理 HTTP 错误
        if (!response.ok) {
          let errorMessage = `请求失败: ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // 如果响应不是 JSON,使用默认错误消息
          }
          throw new ApiError(errorMessage, response.status);
        }

        // 解析响应
        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error as Error;

        // 如果是最后一次尝试,直接抛出错误
        if (attempt === this.retryCount) {
          break;
        }

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
      }
    }

    // 抛出最后的错误
    throw lastError || new Error('请求失败');
  }

  /**
   * GET 请求
   */
  private async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST 请求
   */
  private async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT 请求
   */
  private async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE 请求
   */
  private async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ==================== 系统状态 ====================

  /**
   * 获取系统状态
   */
  async getSystemStatus(): Promise<SystemStatus> {
    return this.get<SystemStatus>('/');
  }

  // ==================== 频道管理 ====================

  /**
   * 获取所有频道
   */
  async getChannels(): Promise<Channel[]> {
    const response = await this.get<ApiResponse<Channel[]>>('/channels');
    return response.data || [];
  }

  /**
   * 创建频道
   */
  async createChannel(channel: Partial<Channel>): Promise<Channel> {
    const response = await this.post<ApiResponse<Channel>>('/channels', channel);
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '创建频道失败');
    }
    return response.data;
  }

  /**
   * 更新频道
   */
  async updateChannel(name: string, updates: Partial<Channel>): Promise<Channel> {
    const response = await this.put<ApiResponse<Channel>>(`/channels/${name}`, updates);
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '更新频道失败');
    }
    return response.data;
  }

  /**
   * 删除频道
   */
  async deleteChannel(name: string): Promise<void> {
    const response = await this.delete<ApiResponse<void>>(`/channels/${name}`);
    if (!response.success) {
      throw new ApiError(response.error || '删除频道失败');
    }
  }

  /**
   * 测试频道
   */
  async testChannel(name: string, model?: string): Promise<ChannelTestResult> {
    const response = await this.post<ApiResponse<ChannelTestResult>>(
      `/channels/${name}/test`,
      { model }
    );
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '测试频道失败');
    }
    return response.data;
  }

  /**
   * 批量测试频道
   */
  async testAllChannels(): Promise<ChannelTestResult[]> {
    const response = await this.post<ApiResponse<ChannelTestResult[]>>('/channels/test-all');
    return response.data || [];
  }

  // ==================== 负载均衡策略 ====================

  /**
   * 修改负载均衡策略
   */
  async updateStrategy(strategy: LoadBalancerStrategy): Promise<void> {
    const response = await this.put<ApiResponse<void>>('/strategy', { strategy });
    if (!response.success) {
      throw new ApiError(response.error || '更新策略失败');
    }
  }

  // ==================== 分析数据 ====================

  /**
   * 获取分析数据
   */
  async getAnalytics(timeRange?: string): Promise<Analytics> {
    const endpoint = timeRange ? `/analytics?timeRange=${timeRange}` : '/analytics';
    const response = await this.get<ApiResponse<Analytics>>(endpoint);
    if (!response.data) {
      throw new ApiError('获取分析数据失败');
    }
    return response.data;
  }

  // ==================== 请求日志 ====================

  /**
   * 获取请求日志
   */
  async getRequestLogs(limit?: number, offset?: number): Promise<RequestLog[]> {
    let endpoint = '/requests';
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (params.toString()) endpoint += `?${params.toString()}`;

    const response = await this.get<ApiResponse<RequestLog[]>>(endpoint);
    return response.data || [];
  }

  // ==================== 路由规则 ====================

  /**
   * 获取路由规则
   */
  async getRoutingRules(): Promise<RoutingRule[]> {
    const response = await this.get<ApiResponse<RoutingRule[]>>('/routing/rules');
    return response.data || [];
  }

  /**
   * 创建路由规则
   */
  async createRoutingRule(rule: Partial<RoutingRule>): Promise<RoutingRule> {
    const response = await this.post<ApiResponse<RoutingRule>>('/routing/rules', rule);
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '创建路由规则失败');
    }
    return response.data;
  }

  /**
   * 更新路由规则
   */
  async updateRoutingRule(id: string, updates: Partial<RoutingRule>): Promise<RoutingRule> {
    const response = await this.put<ApiResponse<RoutingRule>>(`/routing/rules/${id}`, updates);
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '更新路由规则失败');
    }
    return response.data;
  }

  /**
   * 删除路由规则
   */
  async deleteRoutingRule(id: string): Promise<void> {
    const response = await this.delete<ApiResponse<void>>(`/routing/rules/${id}`);
    if (!response.success) {
      throw new ApiError(response.error || '删除路由规则失败');
    }
  }

  // ==================== 缓存管理 ====================

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<CacheStats> {
    const response = await this.get<ApiResponse<CacheStats>>('/cache/stats');
    if (!response.data) {
      throw new ApiError('获取缓存统计失败');
    }
    return response.data;
  }

  /**
   * 获取缓存配置
   */
  async getCacheConfig(): Promise<CacheConfig> {
    const response = await this.get<ApiResponse<CacheConfig>>('/cache/config');
    if (!response.data) {
      throw new ApiError('获取缓存配置失败');
    }
    return response.data;
  }

  /**
   * 更新缓存配置
   */
  async updateCacheConfig(config: Partial<CacheConfig>): Promise<CacheConfig> {
    const response = await this.put<ApiResponse<CacheConfig>>('/cache/config', config);
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '更新缓存配置失败');
    }
    return response.data;
  }

  /**
   * 清空缓存
   */
  async clearCache(): Promise<void> {
    const response = await this.post<ApiResponse<void>>('/cache/clear');
    if (!response.success) {
      throw new ApiError(response.error || '清空缓存失败');
    }
  }

  // ==================== 指标数据 ====================

  /**
   * 获取系统指标
   */
  async getMetrics(): Promise<Metrics> {
    const response = await this.get<ApiResponse<Metrics>>('/metrics');
    if (!response.data) {
      throw new ApiError('获取指标数据失败');
    }
    return response.data;
  }

  // ==================== Tee 目标管理 ====================

  /**
   * 获取 Tee 目标
   */
  async getTeeDestinations(): Promise<TeeDestination[]> {
    const response = await this.get<ApiResponse<TeeDestination[]>>('/tee/destinations');
    return response.data || [];
  }

  /**
   * 创建 Tee 目标
   */
  async createTeeDestination(destination: Partial<TeeDestination>): Promise<TeeDestination> {
    const response = await this.post<ApiResponse<TeeDestination>>('/tee/destinations', destination);
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '创建 Tee 目标失败');
    }
    return response.data;
  }

  /**
   * 更新 Tee 目标
   */
  async updateTeeDestination(id: string, updates: Partial<TeeDestination>): Promise<TeeDestination> {
    const response = await this.put<ApiResponse<TeeDestination>>(`/tee/destinations/${id}`, updates);
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '更新 Tee 目标失败');
    }
    return response.data;
  }

  /**
   * 删除 Tee 目标
   */
  async deleteTeeDestination(id: string): Promise<void> {
    const response = await this.delete<ApiResponse<void>>(`/tee/destinations/${id}`);
    if (!response.success) {
      throw new ApiError(response.error || '删除 Tee 目标失败');
    }
  }

  // ==================== 转换器管理 ====================

  /**
   * 获取转换器
   */
  async getTransformers(): Promise<Transformer[]> {
    const response = await this.get<ApiResponse<Transformer[]>>('/transformers');
    return response.data || [];
  }

  /**
   * 更新转换器
   */
  async updateTransformer(id: string, updates: Partial<Transformer>): Promise<Transformer> {
    const response = await this.put<ApiResponse<Transformer>>(`/transformers/${id}`, updates);
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '更新转换器失败');
    }
    return response.data;
  }

  // ==================== 追踪数据 ====================

  /**
   * 获取追踪统计
   */
  async getTraceStats(): Promise<TraceStats> {
    const response = await this.get<ApiResponse<TraceStats>>('/tracing/stats');
    if (!response.data) {
      throw new ApiError('获取追踪统计失败');
    }
    return response.data;
  }

  /**
   * 获取追踪详情
   */
  async getTrace(traceId: string): Promise<Trace> {
    const response = await this.get<ApiResponse<Trace>>(`/tracing/traces/${traceId}`);
    if (!response.data) {
      throw new ApiError('获取追踪详情失败');
    }
    return response.data;
  }

  // ==================== 提供商信息 ====================

  /**
   * 获取提供商列表
   */
  async getProviders(): Promise<Provider[]> {
    const response = await this.get<ApiResponse<Provider[]>>('/providers');
    return response.data || [];
  }

  // ==================== 国际化 ====================

  /**
   * 获取当前语言
   */
  async getLocale(): Promise<string> {
    const response = await this.get<ApiResponse<{ locale: string }>>('/i18n/locale');
    return response.data?.locale || 'en';
  }

  /**
   * 设置语言
   */
  async setLocale(locale: string): Promise<void> {
    const response = await this.put<ApiResponse<void>>('/i18n/locale', { locale });
    if (!response.success) {
      throw new ApiError(response.error || '设置语言失败');
    }
  }
}

// 导出单例实例
export const api = new RoutexAPIClient();
