/**
 * Google Gemini Provider
 */

import { BaseProvider, type ProviderCapabilities } from './base';
import type { Channel } from '../types';

export class GoogleProvider extends BaseProvider {
  readonly name = 'Google Gemini';
  readonly type = 'google';
  readonly capabilities: ProviderCapabilities = {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsSystemMessages: true,
    maxTokens: 1000000, // Gemini 1.5 Pro  1M context
  };

  getDefaultBaseUrl: string {
    return 'https://generativelanguage.googleapis.com';
  }

  prepareAuthHeaders(channel: Channel): Record<string, string> {
    // Google  API Key  header 
    return {};
  }

  /**
   * Google Gemini  URL API Key 
   */
  buildRequestUrl(channel: Channel, path: string): string {
    const baseUrl = channel.baseUrl || this.getDefaultBaseUrl;
    const cleanBase = baseUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${cleanBase}${cleanPath}`;

    //  API Key 
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}key=${channel.apiKey || ''}`;
  }

  extractTokenUsage(responseBody: any) {
    const usage = responseBody?.usageMetadata || {};
    return {
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      cachedTokens: usage.cachedContentTokenCount || 0,
    };
  }
}
