/**
 * Custom/Generic Provider
 * 用于自定义提供商或兼容 OpenAI API 的提供商
 */

import { BaseProvider, type ProviderCapabilities } from './base';
import type { Channel } from '../types';

export class CustomProvider extends BaseProvider {
  readonly name = 'Custom Provider';
  readonly type = 'custom';
  readonly capabilities: ProviderCapabilities = {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsSystemMessages: true,
    maxTokens: undefined, // 未知
  };

  getDefaultBaseUrl(): string {
    // 自定义提供商没有默认 URL
    return '';
  }

  prepareAuthHeaders(channel: Channel): Record<string, string> {
    // 默认使用 Bearer token（OpenAI 兼容）
    if (!channel.apiKey) {
      return {};
    }

    return {
      'Authorization': `Bearer ${channel.apiKey}`,
    };
  }

  validateChannel(channel: Channel): { valid: boolean; error?: string } {
    if (!channel.baseUrl) {
      return { valid: false, error: 'Base URL is required for custom providers' };
    }
    return { valid: true };
  }
}
