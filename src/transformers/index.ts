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

import { TransformerManager } from './base';
import { AnthropicTransformer } from './anthropic';
import { OpenAITransformer } from './openai';

/**
 * Create and initialize default transformer manager
 * transformer
 */
export function createTransformerManager(): TransformerManager {
  const manager = new TransformerManager();

  //// Register built-in transformers / transformers
  manager.register(new AnthropicTransformer());
  manager.register(new OpenAITransformer());

  return manager;
}
