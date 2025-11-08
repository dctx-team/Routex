/**
 * OpenAI Provider ( Azure OpenAI)
 */

import { BaseProvider, type ProviderCapabilities } from './base';
import type { Channel } from '../types';

export class OpenAIProvider extends BaseProvider {
  readonly name: string = 'OpenAI';
  readonly type: string = 'openai';
  readonly capabilities: ProviderCapabilities = {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsSystemMessages: true,
    maxTokens: 128000, // GPT-4 Turbo  128K context
  };

  getDefaultBaseUrl(): string {
    return 'https://api.openai.com';
  }

  prepareAuthHeaders(channel: Channel): Record<string, string> {
    return {
      'Authorization': `Bearer ${channel.apiKey || ''}`,
    };
  }

  /**
   *  token OpenAI 
   */
  extractTokenUsage(responseBody: any) {
    const usage = responseBody?.usage || {};
    return {
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      cachedTokens: usage.cached_tokens || 0,
    };
  }
}

/**
 * Azure OpenAI Provider
 */
export class AzureOpenAIProvider extends OpenAIProvider {
  readonly name = 'Azure OpenAI';
  readonly type = 'azure';

  getDefaultBaseUrl(): string {
    // Azure  URL
    return '';
  }

  prepareAuthHeaders(channel: Channel): Record<string, string> {
    return {
      'api-key': channel.apiKey || '',
    };
  }

  validateChannel(channel: Channel): { valid: boolean; error?: string } {
    if (!channel.apiKey) {
      return { valid: false, error: 'API Key is required' };
    }
    if (!channel.baseUrl) {
      return { valid: false, error: 'Base URL is required for Azure OpenAI' };
    }
    return { valid: true };
  }
}
