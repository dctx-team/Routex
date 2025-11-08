/**
 * Google Gemini API Transformer
 * Google Gemini API 
 *
 * Converts between Google Gemini API and Anthropic Messages API
 * Google Gemini API  Anthropic Messages API 
 */

import { BaseTransformer } from './base';

export class GeminiTransformer extends BaseTransformer {
  name = 'gemini';

  /**
   * Transform Anthropic format to Google Gemini format
   *  Anthropic  Google Gemini 
   */
  async transformRequest(request: any, options?: any): Promise<any> {
    const transformed: any = {
      contents: this.convertMessagesToGemini(request.messages),
      generationConfig: {},
    };

    // Add system instruction if present
    if (request.system) {
      const systemContent = Array.isArray(request.system)
        ? request.system.map((s: any) => s.text || s).join('\n')
        : request.system;

      transformed.systemInstruction = {
        parts: [{ text: systemContent }],
      };
    }

    // Map generation parameters
    if (request.max_tokens !== undefined) {
      transformed.generationConfig.maxOutputTokens = request.max_tokens;
    }
    if (request.temperature !== undefined) {
      transformed.generationConfig.temperature = request.temperature;
    }
    if (request.top_p !== undefined) {
      transformed.generationConfig.topP = request.top_p;
    }
    if (request.top_k !== undefined) {
      transformed.generationConfig.topK = request.top_k;
    }
    if (request.stop_sequences) {
      transformed.generationConfig.stopSequences = request.stop_sequences;
    }

    // Convert tools if present
    if (request.tools) {
      transformed.tools = [{
        functionDeclarations: request.tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        })),
      }];
    }

    // Gemini uses different model names
    // Gemini 
    transformed.model = this.mapModelName(request.model);

    return transformed;
  }

  /**
   * Transform Google Gemini response to Anthropic format
   *  Google Gemini  Anthropic 
   */
  async transformResponse(response: any, options?: any): Promise<any> {
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('Invalid Gemini response: no candidates');
    }

    const candidate = response.candidates[0];
    const content = candidate.content;

    const transformed: any = {
      id: `msg-${Date.now}`,
      type: 'message',
      role: 'assistant',
      content: ,
      model: response.modelVersion || 'gemini-pro',
      stop_reason: this.mapFinishReason(candidate.finishReason),
      usage: {
        input_tokens: response.usageMetadata?.promptTokenCount || 0,
        output_tokens: response.usageMetadata?.candidatesTokenCount || 0,
      },
    };

    // Convert content parts
    if (content && content.parts) {
      for (const part of content.parts) {
        if (part.text) {
          transformed.content.push({
            type: 'text',
            text: part.text,
          });
        } else if (part.functionCall) {
          transformed.content.push({
            type: 'tool_use',
            id: `tool-${Date.now}-${Math.random.toString(36).substring(2, 9)}`,
            name: part.functionCall.name,
            input: part.functionCall.args,
          });
        }
      }
    }

    return transformed;
  }

  /**
   * Convert Anthropic messages to Google Gemini format
   *  Anthropic  Google Gemini 
   */
  private convertMessagesToGemini(messages: any): any {
    const result: any = ;

    for (const msg of messages) {
      const geminiMsg: any = {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: ,
      };

      if (typeof msg.content === 'string') {
        geminiMsg.parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text') {
            geminiMsg.parts.push({ text: block.text });
          } else if (block.type === 'image') {
            // Gemini supports inline images
            // Gemini 
            if (block.source.type === 'base64') {
              geminiMsg.parts.push({
                inlineData: {
                  mimeType: block.source.media_type || 'image/jpeg',
                  data: block.source.data,
                },
              });
            } else if (block.source.url) {
              // Convert URL to base64 or use fileData
              //  URL  base64  fileData
              geminiMsg.parts.push({
                text: `[Image: ${block.source.url}]`,
              });
            }
          } else if (block.type === 'tool_use') {
            geminiMsg.parts.push({
              functionCall: {
                name: block.name,
                args: block.input,
              },
            });
          } else if (block.type === 'tool_result') {
            // Tool results as function responses
            // 
            geminiMsg.parts.push({
              functionResponse: {
                name: block.tool_use_id,
                response: {
                  content: block.content,
                },
              },
            });
          }
        }
      }

      result.push(geminiMsg);
    }

    return result;
  }

  /**
   * Map model names between Anthropic and Gemini
   *  Anthropic  Gemini 
   */
  private mapModelName(model: string): string {
    // If already a Gemini model name, return as is
    //  Gemini 
    if (model.startsWith('gemini-')) {
      return model;
    }

    // Map common patterns
    // 
    const mappings: Record<string, string> = {
      'claude-3-opus': 'gemini-pro',
      'claude-3-sonnet': 'gemini-pro',
      'claude-3-haiku': 'gemini-pro',
      'gpt-4': 'gemini-pro',
      'gpt-3.5': 'gemini-pro',
    };

    return mappings[model] || 'gemini-pro';
  }

  /**
   * Map Gemini finishReason to Anthropic stop_reason
   *  Gemini finishReason  Anthropic stop_reason
   */
  private mapFinishReason(finishReason: string): string {
    const mapping: Record<string, string> = {
      STOP: 'end_turn',
      MAX_TOKENS: 'max_tokens',
      SAFETY: 'stop_sequence',
      RECITATION: 'stop_sequence',
      OTHER: 'end_turn',
    };

    return mapping[finishReason] || 'end_turn';
  }
}
