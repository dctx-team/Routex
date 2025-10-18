/**
 * Anthropic Claude Provider
 */

import { BaseProvider, type ProviderCapabilities } from './base';
import type { Channel } from '../types';

export class AnthropicProvider extends BaseProvider {
  readonly name = 'Anthropic';
  readonly type = 'anthropic';
  readonly capabilities: ProviderCapabilities = {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsSystemMessages: true,
    maxTokens: 200000, // Claude 3.5 Sonnet 支持 200K context
  };

  getDefaultBaseUrl(): string {
    return 'https://api.anthropic.com';
  }

  prepareAuthHeaders(channel: Channel): Record<string, string> {
    return {
      'x-api-key': channel.apiKey || '',
      'anthropic-version': '2023-06-01',
    };
  }

  /**
   * Anthropic 特定的请求转换
   */
  async transformRequest(body: unknown, channel: Channel): Promise<unknown> {
    // Anthropic API 已经是标准格式，无需转换
    return body;
  }

  /**
   * Anthropic 特定的响应转换
   */
  async transformResponse(body: unknown, channel: Channel): Promise<unknown> {
    // Anthropic API 已经是标准格式，无需转换
    return body;
  }

  extractTokenUsage(responseBody: any) {
    const usage = responseBody?.usage || {};
    return {
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      cachedTokens: usage.cache_read_input_tokens || 0,
    };
  }
}
