/**
 * Provider Factory
 * 负责创建和管理不同类型的 Provider 实例
 */

import type { Channel, ChannelType } from '../types';
import type { BaseProvider } from './base';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider, AzureOpenAIProvider } from './openai';
import { GoogleProvider } from './google';
import { CustomProvider } from './custom';
import { logger } from '../utils/logger';

/**
 * Provider 注册表
 */
class ProviderRegistry {
  private providers = new Map<ChannelType, BaseProvider>();
  private providerInstances = new Map<string, BaseProvider>();

  constructor() {
    // 注册所有内置 Provider
    this.registerProvider('anthropic', new AnthropicProvider());
    this.registerProvider('openai', new OpenAIProvider());
    this.registerProvider('azure', new AzureOpenAIProvider());
    this.registerProvider('google', new GoogleProvider());
    this.registerProvider('custom', new CustomProvider());
    this.registerProvider('zhipu', new CustomProvider()); // 智谱 AI 使用 OpenAI 兼容接口

    logger.info({
      registeredProviders: Array.from(this.providers.keys()),
    }, '📋 Provider registry initialized');
  }

  /**
   * 注册一个 Provider
   */
  registerProvider(type: ChannelType, provider: BaseProvider) {
    this.providers.set(type, provider);
  }

  /**
   * 获取 Provider 实例（单例，按 channel.id 缓存）
   */
  getProvider(channel: Channel): BaseProvider {
    // 检查是否已有该 channel 的实例
    if (this.providerInstances.has(channel.id)) {
      return this.providerInstances.get(channel.id)!;
    }

    // 获取对应类型的 Provider
    const provider = this.providers.get(channel.type);

    if (!provider) {
      logger.warn({
        channelType: channel.type,
        channelId: channel.id,
      }, `⚠️  No provider found for type ${channel.type}, using custom provider`);

      // 如果找不到，返回 custom provider
      const customProvider = this.providers.get('custom')!;
      this.providerInstances.set(channel.id, customProvider);
      return customProvider;
    }

    // 缓存实例
    this.providerInstances.set(channel.id, provider);
    return provider;
  }

  /**
   * 验证渠道配置
   */
  validateChannel(channel: Channel): { valid: boolean; error?: string } {
    const provider = this.getProvider(channel);
    return provider.validateChannel(channel);
  }

  /**
   * 获取所有已注册的 Provider 类型
   */
  getRegisteredTypes(): ChannelType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 获取 Provider 信息
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
   * 获取所有 Provider 信息
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
   * 清除指定 channel 的缓存实例
   */
  clearProviderInstance(channelId: string) {
    this.providerInstances.delete(channelId);
  }

  /**
   * 清除所有缓存实例
   */
  clearAllInstances() {
    this.providerInstances.clear();
  }
}

// 导出单例
export const providerRegistry = new ProviderRegistry();

/**
 * 便捷函数：获取 Provider
 */
export function getProvider(channel: Channel): BaseProvider {
  return providerRegistry.getProvider(channel);
}

/**
 * 便捷函数：验证渠道
 */
export function validateChannel(channel: Channel): { valid: boolean; error?: string } {
  return providerRegistry.validateChannel(channel);
}
