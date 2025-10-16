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
import {
  MaxTokenTransformer,
  SamplingTransformer,
  CleanCacheTransformer,
} from './builtin';

/**
 * Create and initialize default transformer manager
 * transformer
 */
export function createTransformerManager(): TransformerManager {
  const manager = new TransformerManager();

  //// Register format transformers / transformers
  manager.register(new AnthropicTransformer());
  manager.register(new OpenAITransformer());

  //// Register built-in utility transformers / transformers
  manager.register(new MaxTokenTransformer());
  manager.register(new SamplingTransformer());
  manager.register(new CleanCacheTransformer());

  return manager;
}
