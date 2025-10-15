import { describe, test, expect, beforeEach } from 'bun:test';
import { SmartRouter } from '../src/core/routing/smart-router';
import type { RoutingRule, Channel } from '../src/types';

describe('SmartRouter', () => {
  let router: SmartRouter;
  let testChannels: Channel[];

  beforeEach(() => {
    testChannels = [
      {
        id: 'ch1',
        name: 'anthropic-opus',
        type: 'anthropic',
        apiKey: 'test-key-1',
        models: ['claude-opus-4-20250514'],
        priority: 100,
        weight: 1,
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'ch2',
        name: 'anthropic-sonnet',
        type: 'anthropic',
        apiKey: 'test-key-2',
        models: ['claude-sonnet-4-20250514'],
        priority: 80,
        weight: 1,
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'ch3',
        name: 'anthropic-haiku',
        type: 'anthropic',
        apiKey: 'test-key-3',
        models: ['claude-haiku-4-20250514'],
        priority: 60,
        weight: 1,
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
  });

  describe('Token Threshold Routing', () => {
    test('should route to Opus for messages exceeding token threshold', async () => {
      const rules: RoutingRule[] = [
        {
          id: 'rule1',
          name: 'Long Context Route',
          type: 'longContext',
          condition: {
            tokenThreshold: 50000,
          },
          targetChannel: 'anthropic-opus',
          targetModel: 'claude-opus-4-20250514',
          priority: 90,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      router = new SmartRouter(rules);

      const context = {
        model: 'claude-sonnet-4-20250514',
        messages: [
          {
            role: 'user' as const,
            content: 'x'.repeat(200000), // 200k chars = ~50k tokens
          },
        ],
      };

      const result = await router.findMatchingChannel(context, testChannels);

      expect(result).not.toBeNull();
      expect(result?.channel.name).toBe('anthropic-opus');
      expect(result?.model).toBe('claude-opus-4-20250514');
    });

    test('should not match when below token threshold', async () => {
      const rules: RoutingRule[] = [
        {
          id: 'rule1',
          name: 'Long Context Route',
          type: 'longContext',
          condition: {
            tokenThreshold: 50000,
          },
          targetChannel: 'anthropic-opus',
          targetModel: 'claude-opus-4-20250514',
          priority: 90,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      router = new SmartRouter(rules);

      const context = {
        model: 'claude-sonnet-4-20250514',
        messages: [
          {
            role: 'user' as const,
            content: 'Short message',
          },
        ],
      };

      const result = await router.findMatchingChannel(context, testChannels);

      expect(result).toBeNull();
    });
  });

  describe('Keyword Routing', () => {
    test('should route based on keyword match', async () => {
      const rules: RoutingRule[] = [
        {
          id: 'rule2',
          name: 'Code Analysis Route',
          type: 'custom',
          condition: {
            keywords: ['code review', 'refactor', 'debug'],
          },
          targetChannel: 'anthropic-sonnet',
          targetModel: 'claude-sonnet-4-20250514',
          priority: 80,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      router = new SmartRouter(rules);

      const context = {
        model: 'claude-opus-4-20250514',
        messages: [
          {
            role: 'user' as const,
            content: 'Can you help me debug this code?',
          },
        ],
      };

      const result = await router.findMatchingChannel(context, testChannels);

      expect(result).not.toBeNull();
      expect(result?.channel.name).toBe('anthropic-sonnet');
    });

    test('should not match when no keywords found', async () => {
      const rules: RoutingRule[] = [
        {
          id: 'rule2',
          name: 'Code Analysis Route',
          type: 'custom',
          condition: {
            keywords: ['code review', 'refactor', 'debug'],
          },
          targetChannel: 'anthropic-sonnet',
          targetModel: 'claude-sonnet-4-20250514',
          priority: 80,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      router = new SmartRouter(rules);

      const context = {
        model: 'claude-opus-4-20250514',
        messages: [
          {
            role: 'user' as const,
            content: 'Tell me a joke',
          },
        ],
      };

      const result = await router.findMatchingChannel(context, testChannels);

      expect(result).toBeNull();
    });
  });

  describe('Model Pattern Routing', () => {
    test('should route based on model name pattern', async () => {
      const rules: RoutingRule[] = [
        {
          id: 'rule3',
          name: 'Haiku Model Route',
          type: 'custom',
          condition: {
            modelPattern: '.*haiku.*',
          },
          targetChannel: 'anthropic-haiku',
          targetModel: 'claude-haiku-4-20250514',
          priority: 70,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      router = new SmartRouter(rules);

      const context = {
        model: 'claude-haiku-4-20250514',
        messages: [
          {
            role: 'user' as const,
            content: 'Hello',
          },
        ],
      };

      const result = await router.findMatchingChannel(context, testChannels);

      expect(result).not.toBeNull();
      expect(result?.channel.name).toBe('anthropic-haiku');
    });
  });

  describe('Tool Use Routing', () => {
    test('should route when tools are present', async () => {
      const rules: RoutingRule[] = [
        {
          id: 'rule4',
          name: 'Tool Use Route',
          type: 'custom',
          condition: {
            hasTools: true,
          },
          targetChannel: 'anthropic-opus',
          targetModel: 'claude-opus-4-20250514',
          priority: 85,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      router = new SmartRouter(rules);

      const context = {
        model: 'claude-sonnet-4-20250514',
        messages: [
          {
            role: 'user' as const,
            content: 'Use the calculator tool',
          },
        ],
        tools: [
          {
            name: 'calculator',
            description: 'A calculator tool',
            input_schema: { type: 'object', properties: {} },
          },
        ],
      };

      const result = await router.findMatchingChannel(context, testChannels);

      expect(result).not.toBeNull();
      expect(result?.channel.name).toBe('anthropic-opus');
    });

    test('should not match when no tools present', async () => {
      const rules: RoutingRule[] = [
        {
          id: 'rule4',
          name: 'Tool Use Route',
          type: 'custom',
          condition: {
            hasTools: true,
          },
          targetChannel: 'anthropic-opus',
          targetModel: 'claude-opus-4-20250514',
          priority: 85,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      router = new SmartRouter(rules);

      const context = {
        model: 'claude-sonnet-4-20250514',
        messages: [
          {
            role: 'user' as const,
            content: 'Hello',
          },
        ],
      };

      const result = await router.findMatchingChannel(context, testChannels);

      expect(result).toBeNull();
    });
  });

  describe('Image Routing', () => {
    test('should route when images are present', async () => {
      const rules: RoutingRule[] = [
        {
          id: 'rule5',
          name: 'Image Route',
          type: 'image',
          condition: {
            hasImages: true,
          },
          targetChannel: 'anthropic-opus',
          targetModel: 'claude-opus-4-20250514',
          priority: 87,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      router = new SmartRouter(rules);

      const context = {
        model: 'claude-sonnet-4-20250514',
        messages: [
          {
            role: 'user' as const,
            content: [
              { type: 'text', text: 'What is in this image?' },
              { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'abc123' } },
            ],
          },
        ],
      };

      const result = await router.findMatchingChannel(context, testChannels);

      expect(result).not.toBeNull();
      expect(result?.channel.name).toBe('anthropic-opus');
    });
  });

  describe('Priority Ordering', () => {
    test('should select highest priority matching rule', async () => {
      const rules: RoutingRule[] = [
        {
          id: 'rule-low',
          name: 'Low Priority Route',
          type: 'custom',
          condition: {
            keywords: ['help'],
          },
          targetChannel: 'anthropic-haiku',
          targetModel: 'claude-haiku-4-20250514',
          priority: 50,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'rule-high',
          name: 'High Priority Route',
          type: 'custom',
          condition: {
            keywords: ['help'],
          },
          targetChannel: 'anthropic-opus',
          targetModel: 'claude-opus-4-20250514',
          priority: 90,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      router = new SmartRouter(rules);

      const context = {
        model: 'claude-sonnet-4-20250514',
        messages: [
          {
            role: 'user' as const,
            content: 'Can you help me?',
          },
        ],
      };

      const result = await router.findMatchingChannel(context, testChannels);

      expect(result).not.toBeNull();
      expect(result?.channel.name).toBe('anthropic-opus');
      expect(result?.rule?.priority).toBe(90);
    });
  });

  describe('Combined Conditions', () => {
    test('should match only when all conditions are met', async () => {
      const rules: RoutingRule[] = [
        {
          id: 'rule-combined',
          name: 'Combined Conditions Route',
          type: 'custom',
          condition: {
            keywords: ['analysis'],
            tokenThreshold: 10000,
          },
          targetChannel: 'anthropic-opus',
          targetModel: 'claude-opus-4-20250514',
          priority: 85,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      router = new SmartRouter(rules);

      // Should match - both conditions met
      const context1 = {
        model: 'claude-sonnet-4-20250514',
        messages: [
          {
            role: 'user' as const,
            content: 'Please do a detailed analysis of ' + 'x'.repeat(40000), // ~10k tokens
          },
        ],
      };

      const result1 = await router.findMatchingChannel(context1, testChannels);
      expect(result1).not.toBeNull();
      expect(result1?.channel.name).toBe('anthropic-opus');

      // Should not match - token threshold not met
      const context2 = {
        model: 'claude-sonnet-4-20250514',
        messages: [
          {
            role: 'user' as const,
            content: 'x'.repeat(40000), // ~10k tokens but no keyword
          },
        ],
      };

      const result2 = await router.findMatchingChannel(context2, testChannels);
      expect(result2).toBeNull();

      // Should not match - token threshold not met
      const context3 = {
        model: 'claude-sonnet-4-20250514',
        messages: [
          {
            role: 'user' as const,
            content: 'Please do an analysis',
          },
        ],
      };

      const result3 = await router.findMatchingChannel(context3, testChannels);
      expect(result3).toBeNull();
    });
  });

  describe('Disabled Rules', () => {
    test('should skip disabled rules', async () => {
      const rules: RoutingRule[] = [
        {
          id: 'rule-disabled',
          name: 'Disabled Route',
          type: 'custom',
          condition: {
            keywords: ['test'],
          },
          targetChannel: 'anthropic-opus',
          targetModel: 'claude-opus-4-20250514',
          priority: 90,
          enabled: false, // Disabled
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      router = new SmartRouter(rules);

      const context = {
        model: 'claude-sonnet-4-20250514',
        messages: [
          {
            role: 'user' as const,
            content: 'This is a test',
          },
        ],
      };

      const result = await router.findMatchingChannel(context, testChannels);

      expect(result).toBeNull();
    });
  });

  describe('No Matching Rules', () => {
    test('should return null when no rules match', async () => {
      const rules: RoutingRule[] = [
        {
          id: 'rule1',
          name: 'Specific Route',
          type: 'custom',
          condition: {
            keywords: ['specific-keyword'],
          },
          targetChannel: 'anthropic-opus',
          targetModel: 'claude-opus-4-20250514',
          priority: 90,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      router = new SmartRouter(rules);

      const context = {
        model: 'claude-sonnet-4-20250514',
        messages: [
          {
            role: 'user' as const,
            content: 'This does not match any rules',
          },
        ],
      };

      const result = await router.findMatchingChannel(context, testChannels);

      expect(result).toBeNull();
    });
  });
});
