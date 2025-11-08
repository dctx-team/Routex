/**
 * Google Gemini API Transformer
 * Google Gemini API 转换器
 *
 * Converts between Google Gemini API and Anthropic Messages API
 * Google Gemini API 与 Anthropic Messages API 之间的转换
 */

import { BaseTransformer } from './base';

export class GeminiTransformer extends BaseTransformer {
  name = 'gemini';

  /**
   * Transform Anthropic format to Google Gemini format
   * 将 Anthropic 格式转换为 Google Gemini 格式
   */
  async transformRequest(request: any, options?: any): Promise<any> {
    const transformed: any = {
      contents: this.convertMessagesToGemini(request.messages),
      generationConfig: {},
    };

    // Add system instruction if present / 添加系统指令
    if (request.system) {
      const systemContent = Array.isArray(request.system)
        ? request.system.map((s: any) => s.text || s).join('\n')
        : request.system;

      transformed.systemInstruction = {
        parts: [{ text: systemContent }],
      };
    }

    // Map generation parameters / 映射生成参数
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

    // Convert tools if present / 转换工具
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
    // Gemini 使用不同的模型名称
    transformed.model = this.mapModelName(request.model);

    return transformed;
  }

  /**
   * Transform Google Gemini response to Anthropic format
   * 将 Google Gemini 响应转换为 Anthropic 格式
   */
  async transformResponse(response: any, options?: any): Promise<any> {
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('Invalid Gemini response: no candidates');
    }

    const candidate = response.candidates[0];
    const content = candidate.content;

    const transformed: any = {
      id: `msg-${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [],
      model: response.modelVersion || 'gemini-pro',
      stop_reason: this.mapFinishReason(candidate.finishReason),
      usage: {
        input_tokens: response.usageMetadata?.promptTokenCount || 0,
        output_tokens: response.usageMetadata?.candidatesTokenCount || 0,
      },
    };

    // Convert content parts / 转换内容部分
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
            id: `tool-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
   * 将 Anthropic 消息转换为 Google Gemini 格式
   */
  private convertMessagesToGemini(messages: any[]): any[] {
    const result: any[] = [];

    for (const msg of messages) {
      const geminiMsg: any = {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [],
      };

      if (typeof msg.content === 'string') {
        geminiMsg.parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text') {
            geminiMsg.parts.push({ text: block.text });
          } else if (block.type === 'image') {
            // Gemini supports inline images
            // Gemini 支持内联图像
            if (block.source.type === 'base64') {
              geminiMsg.parts.push({
                inlineData: {
                  mimeType: block.source.media_type || 'image/jpeg',
                  data: block.source.data,
                },
              });
            } else if (block.source.url) {
              // Convert URL to base64 or use fileData
              // 将 URL 转换为 base64 或使用 fileData
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
            // 工具结果作为函数响应
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
   * 在 Anthropic 和 Gemini 之间映射模型名称
   */
  private mapModelName(model: string): string {
    // If already a Gemini model name, return as is
    // 如果已经是 Gemini 模型名称，直接返回
    if (model.startsWith('gemini-')) {
      return model;
    }

    // Map common patterns
    // 映射常见模式
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
   * 将 Gemini finishReason 映射为 Anthropic stop_reason
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
