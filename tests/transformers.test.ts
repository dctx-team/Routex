import { describe, test, expect, beforeEach } from 'bun:test';
import { TransformerManager } from '../src/transformers';
import { OpenAITransformer } from '../src/transformers/openai';
import { AnthropicTransformer } from '../src/transformers/anthropic';

describe('TransformerManager', () => {
  let manager: TransformerManager;

  beforeEach(() => {
    manager = new TransformerManager();
    manager.register(new OpenAITransformer());
    manager.register(new AnthropicTransformer());
  });

  describe('Registration', () => {
    test('should register transformers', () => {
      const transformers = manager.list();
      expect(transformers).toContain('openai');
      expect(transformers).toContain('anthropic');
    });

    test('should get transformer by name', () => {
      const transformer = manager.get('openai');
      expect(transformer).not.toBeNull();
      expect(transformer?.name).toBe('openai');
    });

    test('should return undefined for unknown transformer', () => {
      const transformer = manager.get('unknown');
      expect(transformer).toBeUndefined();
    });
  });

  describe('Request Transformation', () => {
    test('should apply single transformer', async () => {
      const anthropicRequest = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      };

      const result = await manager.transformRequest(anthropicRequest, ['openai']);

      expect(result.messages).toBeDefined();
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content).toBe('Hello');
    });

    test('should apply multiple transformers in sequence', async () => {
      const request = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: 'Test',
          },
        ],
      };

      const result = await manager.transformRequest(request, ['openai', 'anthropic']);

      expect(result).toBeDefined();
      expect(result.messages).toBeDefined();
    });

    test('should skip unknown transformers', async () => {
      const request = {
        model: 'claude-sonnet-4-20250514',
        messages: [
          {
            role: 'user',
            content: 'Test',
          },
        ],
      };

      const result = await manager.transformRequest(request, ['unknown', 'openai']);

      expect(result).toBeDefined();
    });
  });

  describe('Response Transformation', () => {
    test('should transform OpenAI response to Anthropic format', async () => {
      const openaiResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello!',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      const result = await manager.transformResponse(openaiResponse, ['openai']);

      expect(result).toBeDefined();
      expect(result.type).toBe('message');
      expect(result.role).toBe('assistant');
    });
  });
});

describe('OpenAITransformer', () => {
  let transformer: OpenAITransformer;

  beforeEach(() => {
    transformer = new OpenAITransformer();
  });

  describe('Request Transformation', () => {
    test('should convert Anthropic request to OpenAI format', async () => {
      const anthropicRequest = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: 'Hello, how are you?',
          },
        ],
        system: 'You are a helpful assistant.',
      };

      const result = await transformer.transformRequest(anthropicRequest);

      expect(result.model).toBe('claude-sonnet-4-20250514');
      expect(result.messages).toHaveLength(2); // system + user
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[0].content).toBe('You are a helpful assistant.');
      expect(result.messages[1].role).toBe('user');
      expect(result.messages[1].content).toBe('Hello, how are you?');
      expect(result.max_tokens).toBe(1024);
    });

    test('should handle messages with content blocks', async () => {
      const anthropicRequest = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'What is in this image?',
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: 'iVBORw0KG...',
                },
              },
            ],
          },
        ],
      };

      const result = await transformer.transformRequest(anthropicRequest);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBeInstanceOf(Array);
      const content = result.messages[0].content as any[];
      expect(content[0].type).toBe('text');
      expect(content[1].type).toBe('image_url');
    });

    test('should convert tool definitions', async () => {
      const anthropicRequest = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: 'Calculate 2 + 2',
          },
        ],
        tools: [
          {
            name: 'calculator',
            description: 'A simple calculator',
            input_schema: {
              type: 'object',
              properties: {
                operation: { type: 'string' },
                a: { type: 'number' },
                b: { type: 'number' },
              },
              required: ['operation', 'a', 'b'],
            },
          },
        ],
      };

      const result = await transformer.transformRequest(anthropicRequest);

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].type).toBe('function');
      expect(result.tools[0].function.name).toBe('calculator');
      expect(result.tools[0].function.parameters).toEqual(anthropicRequest.tools[0].input_schema);
    });
  });

  describe('Response Transformation', () => {
    test('should convert OpenAI response to Anthropic format', async () => {
      const openaiResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! I am doing well, thank you.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 10,
          total_tokens: 30,
        },
      };

      const result = await transformer.transformResponse(openaiResponse);

      expect(result.id).toBe('chatcmpl-123');
      expect(result.type).toBe('message');
      expect(result.role).toBe('assistant');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Hello! I am doing well, thank you.');
      expect(result.model).toBe('gpt-4');
      expect(result.stop_reason).toBe('end_turn');
      expect(result.usage.input_tokens).toBe(20);
      expect(result.usage.output_tokens).toBe(10);
    });

    test('should handle tool calls in response', async () => {
      const openaiResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'calculator',
                    arguments: '{"operation":"add","a":2,"b":2}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 20,
          total_tokens: 70,
        },
      };

      const result = await transformer.transformResponse(openaiResponse);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('tool_use');
      expect(result.content[0].id).toBe('call_123');
      expect(result.content[0].name).toBe('calculator');
      expect(result.content[0].input).toEqual({ operation: 'add', a: 2, b: 2 });
      expect(result.stop_reason).toBe('tool_use');
    });
  });
});

describe('AnthropicTransformer', () => {
  let transformer: AnthropicTransformer;

  beforeEach(() => {
    transformer = new AnthropicTransformer();
  });

  test('should be identity transformer for requests', async () => {
    const request = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
    };

    const result = await transformer.transformRequest(request);

    expect(result).toEqual(request);
  });

  test('should be identity transformer for responses', async () => {
    const response = {
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'Hello!',
        },
      ],
      model: 'claude-sonnet-4-20250514',
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 10,
        output_tokens: 5,
      },
    };

    const result = await transformer.transformResponse(response);

    expect(result).toEqual(response);
  });
});
