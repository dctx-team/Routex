/**
 * Anthropic API Transformer
 * Anthropic API
 *
 * Handles Anthropic Claude API format (Messages API)
 * Anthropic Claude APIMessages API
 */

import { BaseTransformer } from './base';

export class AnthropicTransformer extends BaseTransformer {
  name = 'anthropic';

  /**
   * Transform request to Anthropic format
 * Anthropic
   */
  async transformRequest(request: any, options?: any): Promise<any> {
    // Anthropic format is our base format, so minimal transformation needed
    //// Anthropic

    const transformed: any = {
      model: request.model,
      messages: request.messages,
      max_tokens: request.max_tokens || 4096,
    };

    //// Optional parameters
    if (request.system) transformed.system = request.system;
    if (request.temperature !== undefined)
      transformed.temperature = request.temperature;
    if (request.top_p !== undefined) transformed.top_p = request.top_p;
    if (request.top_k !== undefined) transformed.top_k = request.top_k;
    if (request.stop_sequences) transformed.stop_sequences = request.stop_sequences;
    if (request.tools) transformed.tools = request.tools;
    if (request.tool_choice) transformed.tool_choice = request.tool_choice;
    if (request.stream !== undefined) transformed.stream = request.stream;

    return transformed;
  }

  /**
   * Transform response from Anthropic format
 * Anthropic
   */
  async transformResponse(response: any, options?: any): Promise<any> {
    // Response is already in Anthropic format
    //// Anthropic
    return response;
  }
}
