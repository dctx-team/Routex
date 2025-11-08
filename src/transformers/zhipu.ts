/**
 * Zhipu GLM API Transformer
 *  GLM API 
 *
 * Converts between Zhipu GLM API and Anthropic Messages API
 *  GLM API  Anthropic Messages API 
 */

import { BaseTransformer } from './base';

export class ZhipuTransformer extends BaseTransformer {
  name = 'zhipu';

  /**
   * Transform Anthropic format to Zhipu GLM format
   *  Anthropic  GLM 
   */
  async transformRequest(request: any, options?: any): Promise<any> {
    const transformed: any = {
      model: request.model,
      messages: this.convertMessagesToGLM(request.messages, request.system),
    };

    // Map parameters
    if (request.max_tokens !== undefined) transformed.max_tokens = request.max_tokens;
    if (request.temperature !== undefined) transformed.temperature = request.temperature;
    if (request.top_p !== undefined) transformed.top_p = request.top_p;
    if (request.stream !== undefined) transformed.stream = request.stream;
    if (request.stop_sequences) transformed.stop = request.stop_sequences;

    // Convert tools if present /  tools
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

    // GLM specific parameters / GLM 
    if (options?.doSample !== undefined) transformed.do_sample = options.doSample;
    if (options?.requestId !== undefined) transformed.request_id = options.requestId;

    return transformed;
  }

  /**
   * Transform Zhipu GLM response to Anthropic format
   *  GLM  Anthropic 
   */
  async transformResponse(response: any, options?: any): Promise<any> {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('Invalid Zhipu GLM response: no choices');
    }

    const choice = response.choices[0];
    const message = choice.message;

    const transformed: any = {
      id: response.id || `msg-${Date.now}`,
      type: 'message',
      role: 'assistant',
      content: ,
      model: response.model,
      stop_reason: this.mapFinishReason(choice.finish_reason),
      usage: {
        input_tokens: response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.completion_tokens || 0,
      },
    };

    // Convert content
    if (message.content) {
      transformed.content.push({
        type: 'text',
        text: message.content,
      });
    }

    // Convert tool calls
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
   * Convert Anthropic messages to Zhipu GLM format
   *  Anthropic  GLM 
   */
  private convertMessagesToGLM(messages: any, system?: string | any): any {
    const result: any = ;

    // Add system message if present
    if (system) {
      const systemContent = Array.isArray(system)
        ? system.map(s => s.text || s).join('\n')
        : system;

      result.push({
        role: 'system',
        content: systemContent,
      });
    }

    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        result.push({
          role: msg.role,
          content: msg.content,
        });
      } else if (Array.isArray(msg.content)) {
        // Handle multi-part content
        const parts: string = ;
        let toolCalls: any = ;

        for (const block of msg.content) {
          if (block.type === 'text') {
            parts.push(block.text);
          } else if (block.type === 'image') {
            // GLM-4V supports images / GLM-4V 
            // For now, convert to base64 URL format
            const imageUrl = block.source.type === 'base64'
              ? `data:${block.source.media_type};base64,${block.source.data}`
              : block.source.url;
            parts.push(`[Image: ${imageUrl}]`);
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
            // Tool results go as assistant messages in GLM
            // GLM 
            result.push({
              role: 'tool',
              content: JSON.stringify(block.content),
              tool_call_id: block.tool_use_id,
            });
          }
        }

        if (parts.length > 0) {
          const msgObj: any = {
            role: msg.role,
            content: parts.join('\n'),
          };

          if (toolCalls.length > 0) {
            msgObj.tool_calls = toolCalls;
          }

          result.push(msgObj);
        }
      }
    }

    return result;
  }

  /**
   * Map GLM finish_reason to Anthropic stop_reason
   *  GLM finish_reason  Anthropic stop_reason
   */
  private mapFinishReason(finishReason: string): string {
    const mapping: Record<string, string> = {
      stop: 'end_turn',
      length: 'max_tokens',
      tool_calls: 'tool_use',
      content_filter: 'stop_sequence',
      sensitive: 'stop_sequence',
    };

    return mapping[finishReason] || 'end_turn';
  }
}
