/**
 * OpenAI API Transformer
 * OpenAI API
 *
 * Converts between OpenAI Chat Completions API and Anthropic Messages API
 * OpenAI Chat Completions APIAnthropic Messages API
 */

import { BaseTransformer } from './base';

export class OpenAITransformer extends BaseTransformer {
  name = 'openai';

  /**
   * Transform Anthropic format to OpenAI format
 * AnthropicOpenAI
   */
  async transformRequest(request: any, options?: any): Promise<any> {
    const transformed: any = {
      model: request.model,
      messages: this.convertMessagesToOpenAI(request.messages, request.system),
    };

    //// Map parameters
    if (request.max_tokens !== undefined) transformed.max_tokens = request.max_tokens;
    if (request.temperature !== undefined)
      transformed.temperature = request.temperature;
    if (request.top_p !== undefined) transformed.top_p = request.top_p;
    if (request.stream !== undefined) transformed.stream = request.stream;
    if (request.stop_sequences) transformed.stop = request.stop_sequences;

    //// Convert tools if present
    if (request.tools) {
      transformed.tools = request.tools.map((tool: any) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        },
      }));
    }

    if (request.tool_choice) {
      if (request.tool_choice.type === 'any') {
        transformed.tool_choice = 'required';
      } else if (request.tool_choice.type === 'tool') {
        transformed.tool_choice = {
          type: 'function',
          function: { name: request.tool_choice.name },
        };
      }
    }

    return transformed;
  }

  /**
   * Transform OpenAI response to Anthropic format
 * OpenAIAnthropic
   */
  async transformResponse(response: any, options?: any): Promise<any> {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('Invalid OpenAI response: no choices');
    }

    const choice = response.choices[0];
    const message = choice.message;

    const transformed: any = {
      id: response.id,
      type: 'message',
      role: 'assistant',
      content: [],
      model: response.model,
      stop_reason: this.mapStopReason(choice.finish_reason),
      usage: {
        input_tokens: response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.completion_tokens || 0,
      },
    };

    //// Convert content
    if (message.content) {
      transformed.content.push({
        type: 'text',
        text: message.content,
      });
    }

    //// Convert tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        transformed.content.push({
          type: 'tool_use',
          id: toolCall.id,
          name: toolCall.function.name,
          input: JSON.parse(toolCall.function.arguments),
        });
      }
    }

    return transformed;
  }

  /**
   * Convert Anthropic messages to OpenAI format
 * AnthropicOpenAI
   */
  private convertMessagesToOpenAI(messages: any[], system?: string): any[] {
    const result: any[] = [];

    //// Add system message if present
    if (system) {
      result.push({
        role: 'system',
        content: system,
      });
    }

    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        result.push({
          role: msg.role,
          content: msg.content,
        });
      } else if (Array.isArray(msg.content)) {
        //// Handle multi-part content
        const parts: any[] = [];
        let toolCalls: any[] = [];

        for (const block of msg.content) {
          if (block.type === 'text') {
            parts.push({ type: 'text', text: block.text });
          } else if (block.type === 'image') {
            parts.push({
              type: 'image_url',
              image_url: {
                url:
                  block.source.type === 'base64'
                    ? `data:${block.source.media_type};base64,${block.source.data}`
                    : block.source.url,
              },
            });
          } else if (block.type === 'tool_use') {
            toolCalls.push({
              id: block.id,
              type: 'function',
              function: {
                name: block.name,
                arguments: JSON.stringify(block.input),
              },
            });
          } else if (block.type === 'tool_result') {
            // Tool results go as user messages in OpenAI
            //// OpenAI
            result.push({
              role: 'tool',
              tool_call_id: block.tool_use_id,
              content: JSON.stringify(block.content),
            });
          }
        }

        if (parts.length > 0) {
          result.push({
            role: msg.role,
            content: parts.length === 1 && parts[0].type === 'text'
              ? parts[0].text
              : parts,
          });
        }

        if (toolCalls.length > 0) {
          result[result.length - 1].tool_calls = toolCalls;
        }
      }
    }

    return result;
  }

  /**
   * Map OpenAI finish_reason to Anthropic stop_reason
 * OpenAIfinish_reasonAnthropicstop_reason
   */
  private mapStopReason(finishReason: string): string {
    const mapping: Record<string, string> = {
      stop: 'end_turn',
      length: 'max_tokens',
      tool_calls: 'tool_use',
      content_filter: 'stop_sequence',
    };

    return mapping[finishReason] || 'end_turn';
  }
}
