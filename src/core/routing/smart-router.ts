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
} from '../../types';
import { estimateMessageTokens } from '../token-counter';
import { ContentAnalyzer, type ContentAnalysis } from './content-analyzer';
import {
  CustomRouterRegistry,
  type CustomRouterFunction,
  globalRouterRegistry,
} from './custom-routers';
import {
  isContentCondition,
  type ContentCondition,
  type RoutingCondition,
} from './types';

export interface RouterContext {
  model: string;
  messages: Message;
  tools?: Tool;
  sessionId?: string;
  system?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface RouterResult {
  channel: Channel;
  model?: string; //// Override model if specified in rule
  rule?: RoutingRule; //// The rule that matched
  analysis?: ContentAnalysis; //// Content analysis result
}

export class SmartRouter {
  private rules: RoutingRule[] = [];
  private customRouters: Map<string, Function> = new Map(); // Legacy support
  private contentAnalyzer: ContentAnalyzer;
  private routerRegistry: CustomRouterRegistry;

  constructor(rules: RoutingRule[] = [], useGlobalRegistry: boolean = true) {
    this.rules = rules
      .filter((r) => r.enabled)
      .sort((a, b) => b.priority - a.priority);
    this.contentAnalyzer = new ContentAnalyzer();
    this.routerRegistry = useGlobalRegistry
      ? globalRouterRegistry
      : new CustomRouterRegistry();
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
   * Register a custom routing function (legacy method)
   * 
   */
  registerCustomRouter(name: string, fn: Function) {
    this.customRouters.set(name, fn);
  }

  /**
   * Register a custom routing function with metadata
   * 
   */
  registerRouter(
    name: string,
    fn: CustomRouterFunction,
    info?: { description?: string; version?: string; author?: string }
  ) {
    this.routerRegistry.register(name, fn, info);
  }

  /**
   * Get router registry
   *
   */
  getRegistry(): CustomRouterRegistry {
    return this.routerRegistry;
  }

  /**
   * List all registered custom routers
   *
   */
  listCustomRouters() {
    return this.routerRegistry.list();
  }

  /**
   * Find matching channel based on request context
 *
   */
  async findMatchingChannel(
    context: RouterContext,
    availableChannels: Channel[]
  ): Promise<RouterResult | null> {
    //// Perform content analysis
    const analysis = this.contentAnalyzer.analyze(context.messages, context.tools);

    //// 1. Try to match routing rules
    for (const rule of this.rules) {
      if (await this.matchesRule(rule, context, analysis)) {
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
            analysis,
          };
        }
      }
    }

    //// 2. No rule matched
    return null;
  }

  /**
   * Get content analysis for a request
   * 
   */
  analyzeContent(messages: Message, tools?: Tool): ContentAnalysis {
    return this.contentAnalyzer.analyze(messages, tools);
  }

  /**
   * Find best channel based on content analysis
   * 
   */
  findChannelByContent(
    analysis: ContentAnalysis,
    availableChannels: Channel[]
  ): Channel | null {
    //// Strategy: Match channel capabilities with content requirements

    //// 1. For coding tasks, prefer channels with better code generation
    if (analysis.category === 'coding' || analysis.hasCode) {
      // Could be configured per channel
      const codingChannels = availableChannels.filter(c =>
        c.models.some(m => /claude-3.*opus|gpt-4|claude-sonnet/i.test(m))
      );
      if (codingChannels.length > 0) {
        return codingChannels[0];
      }
    }

    //// 2. For complex tasks, prefer high-capability models
    if (analysis.complexity === 'very_complex' || analysis.complexity === 'complex') {
      const highCapChannels = availableChannels.filter(c =>
        c.models.some(m => /opus|gpt-4|pro/i.test(m))
      );
      if (highCapChannels.length > 0) {
        return highCapChannels[0];
      }
    }

    //// 3. For simple conversations, any channel is fine
    if (analysis.complexity === 'simple' && analysis.category === 'conversation') {
      return availableChannels[0];
    }

    return null;
  }

  /**
   * Check if a request matches a routing rule
 *
   */
  private async matchesRule(
    rule: RoutingRule,
    context: RouterContext,
    analysis?: ContentAnalysis
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
      // Try new registry first
      let customFn = this.routerRegistry.get(condition.customFunction);

      // Fallback to legacy map
      if (!customFn) {
        customFn = this.customRouters.get(condition.customFunction) as CustomRouterFunction;
      }

      if (customFn) {
        try {
          const result = await customFn(context, analysis);

          // Handle boolean result
          if (typeof result === 'boolean') {
            if (!result) {
              return false;
            }
          }
          // Handle channel result (router selected a specific channel)
          else if (typeof result === 'object' && result !== null) {
            // Custom router can return a channel directly
            // This will be handled in findMatchingChannel
            return true;
          }
        } catch (error) {
          console.error(
            `Custom router function ${condition.customFunction} failed:`,
            error
          );
          return false;
        }
      }
    }

    //// Content-based conditions (if analysis is available)
    if (analysis && isContentCondition(condition)) {
      //// Check content category
      if (condition.contentCategory) {
        if (analysis.category !== condition.contentCategory) {
          return false;
        }
      }

      //// Check complexity level
      if (condition.complexityLevel) {
        if (analysis.complexity !== condition.complexityLevel) {
          return false;
        }
      }

      //// Check if has code
      if (condition.hasCode !== undefined) {
        if (analysis.hasCode !== condition.hasCode) {
          return false;
        }
      }

      //// Check programming language
      if (condition.programmingLanguage) {
        const requiredLang = condition.programmingLanguage;
        if (!analysis.languages.includes(requiredLang)) {
          return false;
        }
      }

      //// Check intent
      if (condition.intent) {
        if (analysis.intent !== condition.intent) {
          return false;
        }
      }

      //// Check word count threshold
      if (condition.minWordCount !== undefined) {
        if (analysis.wordCount < condition.minWordCount) {
          return false;
        }
      }

      if (condition.maxWordCount !== undefined) {
        if (analysis.wordCount > condition.maxWordCount) {
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
  private extractUserMessage(messages: Message): string {
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
  private containsImages(messages: Message): boolean {
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
   * Estimate token count using improved token counter
   */
  private estimateTokenCount(messages: Message, model: string = 'claude'): number {
    return estimateMessageTokens(messages, model);
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
