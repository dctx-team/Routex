/**
 * Base Provider interface and abstract class
 *  AI 
 */

import type { Channel, ParsedRequest } from '../types';

/**
 * Provider 
 */
export interface ProviderRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

/**
 * Provider 
 */
export interface ProviderResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

/**
 * Provider 
 */
export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsSystemMessages: boolean;
  maxTokens?: number;
}

/**
 *  Provider 
 */
export abstract class BaseProvider {
  abstract readonly name: string;
  abstract readonly type: string;
  abstract readonly capabilities: ProviderCapabilities;

  /**
   *  API Base URL
   */
  abstract getDefaultBaseUrl: string;

  /**
   * 
   */
  abstract prepareAuthHeaders(channel: Channel): Record<string, string>;

  /**
   *  URL
   */
  buildRequestUrl(channel: Channel, path: string): string {
    const baseUrl = channel.baseUrl || this.getDefaultBaseUrl;
    // 
    const cleanBase = baseUrl.replace(/\/$/, '');
    // 
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }

  /**
   *  + 
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
      ...additionalHeaders, //  transformer 
    };
  }

  /**
   * 
   */
  async transformRequest(body: unknown, channel: Channel): Promise<unknown> {
    return body;
  }

  /**
   * 
   */
  async transformResponse(body: unknown, channel: Channel): Promise<unknown> {
    return body;
  }

  /**
   *  token 
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
   * 
   */
  validateChannel(channel: Channel): { valid: boolean; error?: string } {
    if (!channel.apiKey) {
      return { valid: false, error: 'API Key is required' };
    }
    return { valid: true };
  }

  /**
   *  Provider 
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
   *  Provider 
   */
  async handleResponse(
    response: Response,
    channel: Channel
  ): Promise<ProviderResponse> {
    const body = await response.json;
    const transformedBody = await this.transformResponse(body, channel);

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries),
      body: transformedBody,
    };
  }
}
