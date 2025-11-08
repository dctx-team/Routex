/**
 * Transformer Registry
 * Transformer
 *
 * Central export point for all transformers
 * transformers
 */

export { BaseTransformer, TransformerManager } from './base';
export { AnthropicTransformer } from './anthropic';
export { OpenAITransformer } from './openai';
export * from './builtin';
export * from './pipeline';

import { TransformerManager } from './base';
import { AnthropicTransformer } from './anthropic';
import { OpenAITransformer } from './openai';
import { ZhipuTransformer } from './zhipu';
import { GeminiTransformer } from './gemini';
import { AzureOpenAITransformer } from './azure-openai';
import {
  MaxTokenTransformer,
  SamplingTransformer,
  CleanCacheTransformer,
} from './builtin';

/**
 * Create and initialize default transformer manager
 * 创建并初始化默认转换器管理器
 */
export function createTransformerManager(): TransformerManager {
  const manager = new TransformerManager();

  //// Register format transformers / 注册格式转换器
  manager.register(new AnthropicTransformer());
  manager.register(new OpenAITransformer());
  manager.register(new ZhipuTransformer());
  manager.register(new GeminiTransformer());
  manager.register(new AzureOpenAITransformer());

  //// Register built-in utility transformers / 注册内置工具转换器
  manager.register(new MaxTokenTransformer());
  manager.register(new SamplingTransformer());
  manager.register(new CleanCacheTransformer());

  return manager;
}
