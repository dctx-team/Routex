/**
 * Transformers API endpoints
 * Transformers API
 */

import { Hono } from 'hono';
import type { TransformerManager } from '../transformers';

export function createTransformersAPI(transformerManager: TransformerManager) {
  const app = new Hono;

  /**
   * GET /api/transformers
 * List all available transformers / transformers
   */
  app.get('/', (c) => {
    const transformers = transformerManager.list;

    return c.json({
      success: true,
      data: transformers.map((name) => ({
        name,
        description: getTransformerDescription(name),
      })),
    });
  });

  /**
   * POST /api/transformers/test
 * Test a transformer / transformer
   */
  app.post('/test', async (c) => {
    const body = await c.req.json;

    const { transformer, request, direction = 'request' } = body;

    if (!transformer || !request) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: transformer, request',
        },
        400
      );
    }

    try {
      let result;

      if (direction === 'request') {
        result = await transformerManager.transformRequest(request, [transformer]);
      } else if (direction === 'response') {
        result = await transformerManager.transformResponse(request, [transformer]);
      } else {
        return c.json(
          {
            success: false,
            error: 'Invalid direction. Must be request or response',
          },
          400
        );
      }

      return c.json({
        success: true,
        data: {
          input: request,
          output: result,
          transformer,
          direction,
        },
      });
    } catch (error: any) {
      return c.json(
        {
          success: false,
          error: error.message || 'Transformer test failed',
        },
        500
      );
    }
  });

  return app;
}

/**
 * Get transformer description / transformer
 */
function getTransformerDescription(name: string): string {
  const descriptions: Record<string, string> = {
    anthropic:
      'Anthropic Messages API format (base format) / AnthropicAPI',
    openai:
      'OpenAI Chat Completions API format / OpenAIAPI',
    gemini:
      'Google Gemini API format / Google Gemini API',
    deepseek:
      'DeepSeek API format / DeepSeek API',
    maxtoken:
      'Enforce max_tokens limit / max_tokens',
    reasoning:
      'Handle reasoning_content field / reasoning_content',
  };

  return descriptions[name] || 'Custom transformer / transformer';
}
