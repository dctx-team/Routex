/**
 * Base Provider interface and abstract class
 * 所有 AI 提供商的基础接口
 */

import type { Channel, ParsedRequest } from '../types';

/**
 * Provider 请求配置
 */
export interface ProviderRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

/**
 * Provider 响应
 */
export interface ProviderResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

/**
 * Provider 能力配置
 */
export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsSystemMessages: boolean;
  maxTokens?: number;
}

/**
 * 抽象 Provider 基类
 */
export abstract class BaseProvider {
  abstract readonly name: string;
  abstract readonly type: string;
  abstract readonly capabilities: ProviderCapabilities;

  /**
   * 获取默认的 API Base URL
   */
  abstract getDefaultBaseUrl(): string;

  /**
   * 准备认证头
   */
  abstract prepareAuthHeaders(channel: Channel): Record<string, string>;

  /**
   * 构建完整的请求 URL
   */
  buildRequestUrl(channel: Channel, path: string): string {
    const baseUrl = channel.baseUrl || this.getDefaultBaseUrl();
    // 移除尾部斜杠
    const cleanBase = baseUrl.replace(/\/$/, '');
    // 确保路径以斜杠开头
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }

  /**
   * 准备请求头（认证 + 通用头）
   */
  prepareHeaders(
    channel: Channel,
    request: ParsedRequest,
    additionalHeaders: Record<string, string> = {}
  ): Record<string, string> {
    const authHeaders = this.prepareAuthHeaders(channel);

    return {
      ...request.headers,
      'Content-Type': 'application/json',
      ...authHeaders,
      ...additionalHeaders, // 额外的头（如 transformer 提供的）优先级最高
    };
  }

  /**
   * 转换请求体（可选，子类可以覆盖）
   */
  async transformRequest(body: unknown, channel: Channel): Promise<unknown> {
    return body;
  }

  /**
   * 转换响应体（可选，子类可以覆盖）
   */
  async transformResponse(body: unknown, channel: Channel): Promise<unknown> {
    return body;
  }

  /**
   * 提取 token 使用信息
   */
  extractTokenUsage(responseBody: any): {
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
  } {
    const usage = responseBody?.usage || {};
    return {
      inputTokens: usage.input_tokens || usage.prompt_tokens || 0,
      outputTokens: usage.output_tokens || usage.completion_tokens || 0,
      cachedTokens: usage.cache_read_input_tokens || usage.cached_tokens || 0,
    };
  }

  /**
   * 验证渠道配置是否有效
   */
  validateChannel(channel: Channel): { valid: boolean; error?: string } {
    if (!channel.apiKey) {
      return { valid: false, error: 'API Key is required' };
    }
    return { valid: true };
  }

  /**
   * 准备完整的 Provider 请求
   */
  async prepareRequest(
    channel: Channel,
    request: ParsedRequest,
    additionalHeaders: Record<string, string> = {}
  ): Promise<ProviderRequest> {
    const url = this.buildRequestUrl(channel, request.path);
    const headers = this.prepareHeaders(channel, request, additionalHeaders);
    const body = await this.transformRequest(request.body, channel);

    return {
      url,
      method: request.method,
      headers,
      body,
    };
  }

  /**
   * 处理 Provider 响应
   */
  async handleResponse(
    response: Response,
    channel: Channel
  ): Promise<ProviderResponse> {
    const body = await response.json();
    const transformedBody = await this.transformResponse(body, channel);

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: transformedBody,
    };
  }
}
