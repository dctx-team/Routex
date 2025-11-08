/**
 * Provider Factory
 *  Provider 
 */

import type { Channel, ChannelType } from '../types';
import type { BaseProvider } from './base';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider, AzureOpenAIProvider } from './openai';
import { GoogleProvider } from './google';
import { CustomProvider } from './custom';
import { logger } from '../utils/logger';

/**
 * Provider 
 */
class ProviderRegistry {
  private providers = new Map<ChannelType, BaseProvider>();
  private providerInstances = new Map<string, BaseProvider>();

  constructor() {
    //  Provider
    this.registerProvider('anthropic', new AnthropicProvider());
    this.registerProvider('openai', new OpenAIProvider());
    this.registerProvider('azure', new AzureOpenAIProvider());
    this.registerProvider('google', new GoogleProvider());
    this.registerProvider('custom', new CustomProvider());
    this.registerProvider('zhipu', new CustomProvider()); //  AI  OpenAI 

    logger.info({
      registeredProviders: Array.from(this.providers.keys()),
    }, '📋 Provider registry initialized');
  }

  /**
   *  Provider
   */
  registerProvider(type: ChannelType, provider: BaseProvider) {
    this.providers.set(type, provider);
  }

  /**
   *  Provider  channel.id 
   */
  getProvider(channel: Channel): BaseProvider {
    //  channel 
    if (this.providerInstances.has(channel.id)) {
      return this.providerInstances.get(channel.id)!;
    }

    //  Provider
    const provider = this.providers.get(channel.type);

    if (!provider) {
      logger.warn({
        channelType: channel.type,
        channelId: channel.id,
      }, `⚠️  No provider found for type ${channel.type}, using custom provider`);

      //  custom provider
      const customProvider = this.providers.get('custom')!;
      this.providerInstances.set(channel.id, customProvider);
      return customProvider;
    }

    // 
    this.providerInstances.set(channel.id, provider);
    return provider;
  }

  /**
   * 
   */
  validateChannel(channel: Channel): { valid: boolean; error?: string } {
    const provider = this.getProvider(channel);
    return provider.validateChannel(channel);
  }

  /**
   *  Provider
   */
  getRegisteredTypes(): ChannelType[] {
    return Array.from(this.providers.keys());
  }

  /**
   *  Provider 
   */
  getProviderInfo(type: ChannelType) {
    const provider = this.providers.get(type);
    if (!provider) {
      return null;
    }

    return {
      name: provider.name,
      type: provider.type,
      capabilities: provider.capabilities,
      defaultBaseUrl: provider.getDefaultBaseUrl(),
    };
  }

  /**
   *  Provider 
   */
  getAllProvidersInfo() {
    const infos: Record<string, any> = {};

    for (const [type, provider] of this.providers.entries()) {
      infos[type] = {
        name: provider.name,
        type: provider.type,
        capabilities: provider.capabilities,
        defaultBaseUrl: provider.getDefaultBaseUrl(),
      };
    }

    return infos;
  }

  /**
   *  channel 
   */
  clearProviderInstance(channelId: string) {
    this.providerInstances.delete(channelId);
  }

  /**
   * 
   */
  clearAllInstances() {
    this.providerInstances.clear();
  }
}

// 
export const providerRegistry = new ProviderRegistry();

/**
 *  Provider
 */
export function getProvider(channel: Channel): BaseProvider {
  return providerRegistry.getProvider(channel);
}

/**
 * 
 */
export function validateChannel(channel: Channel): { valid: boolean; error?: string } {
  return providerRegistry.validateChannel(channel);
}
