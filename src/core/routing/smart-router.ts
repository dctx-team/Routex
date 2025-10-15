/**
 * Smart Router Engine for Routex
 * Routex
 *
 * This module provides intelligent request routing based on:
 *
 * - Content analysis (keywords, patterns)
 * - Token count (long context detection) / Token
 * - Request features (tools, images, web search)
 * - Custom routing functions
 */

import type {
  Channel,
  RoutingRule,
  RoutingRuleType,
  Message,
  ContentBlock,
  Tool,
} from '../types';

export interface RouterContext {
  model: string;
  messages: Message[];
  tools?: Tool[];
  sessionId?: string;
  [key: string]: any;
}

export interface RouterResult {
  channel: Channel;
  model?: string; //// Override model if specified in rule
  rule?: RoutingRule; //// The rule that matched
}

export class SmartRouter {
  private rules: RoutingRule[] = [];
  private customRouters: Map<string, Function> = new Map();

  constructor(rules: RoutingRule[] = []) {
    this.rules = rules
      .filter((r) => r.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Add or update routing rules
 *
   */
  setRules(rules: RoutingRule[]) {
    this.rules = rules
      .filter((r) => r.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Register a custom routing function
 *
   */
  registerCustomRouter(name: string, fn: Function) {
    this.customRouters.set(name, fn);
  }

  /**
   * Find matching channel based on request context
 *
   */
  async findMatchingChannel(
    context: RouterContext,
    availableChannels: Channel[]
  ): Promise<RouterResult | null> {
    //// 1. Try to match routing rules
    for (const rule of this.rules) {
      if (await this.matchesRule(rule, context)) {
        //// Find the target channel
        const channel = availableChannels.find(
          (c) =>
            c.id === rule.targetChannel ||
            c.name === rule.targetChannel
        );

        if (channel) {
          return {
            channel,
            model: rule.targetModel,
            rule,
          };
        }
      }
    }

    //// 2. No rule matched
    return null;
  }

  /**
   * Check if a request matches a routing rule
 *
   */
  private async matchesRule(
    rule: RoutingRule,
    context: RouterContext
  ): Promise<boolean> {
    const { condition } = rule;

    //// Check token threshold / token
    if (condition.tokenThreshold !== undefined) {
      const tokenCount = this.estimateTokenCount(context.messages);
      if (tokenCount < condition.tokenThreshold) {
        return false;
      }
    }

    //// Check keywords
    if (condition.keywords && condition.keywords.length > 0) {
      const userMessage = this.extractUserMessage(context.messages);
      const hasKeyword = condition.keywords.some((keyword) =>
        userMessage.toLowerCase().includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        return false;
      }
    }

    //// Check user pattern (regex)
    if (condition.userPattern) {
      const userMessage = this.extractUserMessage(context.messages);
      const regex = new RegExp(condition.userPattern, 'i');
      if (!regex.test(userMessage)) {
        return false;
      }
    }

    //// Check model pattern
    if (condition.modelPattern) {
      const regex = new RegExp(condition.modelPattern, 'i');
      if (!regex.test(context.model)) {
        return false;
      }
    }

    //// Check if has tools
    if (condition.hasTools !== undefined) {
      const hasTools = context.tools && context.tools.length > 0;
      if (condition.hasTools !== hasTools) {
        return false;
      }
    }

    //// Check if has images
    if (condition.hasImages !== undefined) {
      const hasImages = this.containsImages(context.messages);
      if (condition.hasImages !== hasImages) {
        return false;
      }
    }

    //// Check custom function
    if (condition.customFunction) {
      const customFn = this.customRouters.get(condition.customFunction);
      if (customFn) {
        try {
          const result = await customFn(context);
          if (!result) {
            return false;
          }
        } catch (error) {
          console.error(
            `Custom router function "${condition.customFunction}" failed:`,
            error
          );
          return false;
        }
      }
    }

    //// All conditions matched
    return true;
  }

  /**
   * Extract user message content
 *
   */
  private extractUserMessage(messages: Message[]): string {
    const parts: string[] = [];

    for (const msg of messages) {
      if (msg.role === 'user') {
        if (typeof msg.content === 'string') {
          parts.push(msg.content);
        } else if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === 'text' && block.text) {
              parts.push(block.text);
            }
          }
        }
      }
    }

    return parts.join(' ');
  }

  /**
   * Check if messages contain images
 *
   */
  private containsImages(messages: Message[]): boolean {
    for (const msg of messages) {
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'image') {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Estimate token count (rough approximation)
 * token
   */
  private estimateTokenCount(messages: Message[]): number {
    let totalChars = 0;

    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        totalChars += msg.content.length;
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text' && block.text) {
            totalChars += block.text.length;
          }
        }
      }
    }

    // Rough estimate: 1 token ≈ 4 characters for English
    //// 1token ≈ 4
    return Math.ceil(totalChars / 4);
  }

  /**
   * Get default routing configuration
 *
   */
  static getDefaultRules(): RoutingRule[] {
    const now = Date.now();

    return [
      {
        id: 'rule-longcontext',
        name: 'Long Context Detection',
        type: 'longContext',
        condition: {
          tokenThreshold: 60000,
        },
        targetChannel: 'default',
        priority: 100,
        enabled: false, //// Disabled by default
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rule-background',
        name: 'Background Task Detection',
        type: 'background',
        condition: {
          keywords: ['background', 'batch', 'analyze all files'],
        },
        targetChannel: 'default',
        priority: 90,
        enabled: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rule-think',
        name: 'Reasoning Task Detection',
        type: 'think',
        condition: {
          keywords: ['plan', 'analyze', 'think through', 'step by step'],
        },
        targetChannel: 'default',
        priority: 85,
        enabled: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rule-websearch',
        name: 'Web Search Detection',
        type: 'webSearch',
        condition: {
          keywords: ['search', 'find online', 'look up'],
        },
        targetChannel: 'default',
        priority: 80,
        enabled: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rule-image',
        name: 'Image Task Detection',
        type: 'image',
        condition: {
          hasImages: true,
        },
        targetChannel: 'default',
        priority: 75,
        enabled: false,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
}
