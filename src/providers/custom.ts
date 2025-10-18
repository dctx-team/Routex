/**
 * Custom/Generic Provider
 *  OpenAI API 
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
    maxTokens: undefined, // 
  };

  getDefaultBaseUrl: string {
    //  URL
    return '';
  }

  prepareAuthHeaders(channel: Channel): Record<string, string> {
    //  Bearer tokenOpenAI 
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
