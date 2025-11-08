/**
 * Token estimation utilities for Routex
 * Provides accurate token counting for different model families
 */

import type { Message, ContentBlock } from '../types';

export interface TokenCounter {
  name: string;
  countTokens(text: string): number;
  estimateMessages(messages: Message[]): TokenEstimate;
}

export interface TokenEstimate {
  inputTokens: number;
  breakdown?: {
    messages: number;
    system?: number;
    tools?: number;
  };
}

/**
 * Claude token counter using heuristic estimation
 * Based on Anthropic's documented token ratios
 */
export class ClaudeTokenCounter implements TokenCounter {
  name = 'claude';

  /**
   * Estimate token count for text
   * Heuristic: ~3.5 characters per token for English text
   */
  countTokens(text: string): number {
    // More accurate estimation considering:
    // - Whitespace and punctuation
    // - Common words vs rare words
    // - Unicode characters

    let charCount = text.length;

    // Adjust for whitespace (typically tokenized separately)
    const whitespaceCount = (text.match(/\s/g) || []).length;

    // Adjust for punctuation
    const punctCount = (text.match(/[.,!?;:()[\]{}'"]/g) || []).length;

    // Heuristic formula based on empirical data
    // Average: 3.5 chars/token for English
    // Whitespace adds tokens
    // Punctuation is usually separate tokens
    const baseTokens = Math.ceil(charCount / 3.5);
    const whitespaceTokens = Math.ceil(whitespaceCount * 0.3);
    const punctTokens = Math.ceil(punctCount * 0.5);

    return baseTokens + whitespaceTokens + punctTokens;
  }

  /**
   * Estimate tokens for a list of messages
   */
  estimateMessages(messages: Message[]): TokenEstimate {
    let messageTokens = 0;
    let systemTokens = 0;

    for (const msg of messages) {
      // Message overhead (role markers, formatting)
      const overhead = 4; // Approximate overhead per message

      if (typeof msg.content === 'string') {
        messageTokens += this.countTokens(msg.content) + overhead;
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text' && block.text) {
            messageTokens += this.countTokens(block.text);
          } else if (block.type === 'image') {
            // Image tokens depend on size, typically 1000-2000 tokens
            messageTokens += 1500; // Conservative estimate
          }
        }
        messageTokens += overhead;
      }
    }

    return {
      inputTokens: messageTokens,
      breakdown: {
        messages: messageTokens,
        system: systemTokens,
      },
    };
  }
}

/**
 * OpenAI token counter using heuristic estimation
 * Based on OpenAI's GPT tokenizer patterns
 */
export class OpenAITokenCounter implements TokenCounter {
  name = 'openai';

  /**
   * Estimate token count for text
   * Heuristic: ~4 characters per token for English text (GPT models)
   */
  countTokens(text: string): number {
    // GPT tokenizer uses BPE (Byte Pair Encoding)
    // Average ratio is about 4 chars per token

    let charCount = text.length;

    // Whitespace handling
    const whitespaceCount = (text.match(/\s+/g) || []).length;

    // Numbers are often multiple tokens
    const numberMatches = text.match(/\d+/g) || [];
    let numberTokens = 0;
    for (const num of numberMatches) {
      numberTokens += Math.ceil(num.length / 2); // Numbers: ~2 chars/token
    }

    // Base estimation
    const baseTokens = Math.ceil((charCount - numberMatches.join('').length) / 4);

    return baseTokens + numberTokens + Math.ceil(whitespaceCount * 0.2);
  }

  /**
   * Estimate tokens for messages in OpenAI format
   */
  estimateMessages(messages: Message[]): TokenEstimate {
    let messageTokens = 0;

    // OpenAI has per-message overhead
    const perMessageOverhead = 3;
    const roleOverhead = 1;

    for (const msg of messages) {
      messageTokens += perMessageOverhead + roleOverhead;

      if (typeof msg.content === 'string') {
        messageTokens += this.countTokens(msg.content);
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text' && block.text) {
            messageTokens += this.countTokens(block.text);
          } else if (block.type === 'image' || block.type === 'image_url') {
            // GPT-4 Vision: depends on detail level
            // high: ~1000-2000 tokens, low: ~85 tokens
            messageTokens += 1000; // Default to high detail estimate
          }
        }
      }
    }

    // Add final overhead
    messageTokens += 3;

    return {
      inputTokens: messageTokens,
      breakdown: {
        messages: messageTokens,
      },
    };
  }
}

/**
 * Token counter manager
 */
export class TokenCounterManager {
  private counters: Map<string, TokenCounter> = new Map();
  private defaultCounter: TokenCounter;

  constructor() {
    // Register built-in counters
    const claude = new ClaudeTokenCounter();
    const openai = new OpenAITokenCounter();

    this.counters.set('claude', claude);
    this.counters.set('anthropic', claude);
    this.counters.set('openai', openai);
    this.counters.set('gpt', openai);

    this.defaultCounter = claude; // Default to Claude
  }

  /**
   * Get counter for model family
   */
  getCounter(model: string): TokenCounter {
    const lowerModel = model.toLowerCase();

    if (lowerModel.includes('claude')) {
      return this.counters.get('claude')!;
    } else if (lowerModel.includes('gpt') || lowerModel.includes('openai')) {
      return this.counters.get('openai')!;
    }

    return this.defaultCounter;
  }

  /**
   * Count tokens for text with specific model
   */
  countTokens(text: string, model: string = 'claude'): number {
    const counter = this.getCounter(model);
    return counter.countTokens(text);
  }

  /**
   * Estimate tokens for messages with specific model
   */
  estimateMessages(messages: Message[], model: string = 'claude'): TokenEstimate {
    const counter = this.getCounter(model);
    return counter.estimateMessages(messages);
  }

  /**
   * Register custom counter
   */
  register(name: string, counter: TokenCounter) {
    this.counters.set(name, counter);
  }
}

// Export singleton instance
export const tokenCounter = new TokenCounterManager();

// Helper function for quick token counting
export function countTokens(text: string, model: string = 'claude'): number {
  return tokenCounter.countTokens(text, model);
}

// Helper function for message token estimation
export function estimateMessageTokens(
  messages: Message[],
  model: string = 'claude'
): number {
  const estimate = tokenCounter.estimateMessages(messages, model);
  return estimate.inputTokens;
}
