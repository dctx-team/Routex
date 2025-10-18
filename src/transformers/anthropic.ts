/**
 * Anthropic API Transformer
 * Anthropic API
 *
 * Handles Anthropic Claude API format (Messages API)
 * Anthropic Claude APIMessages API
 */

import { BaseTransformer, type TransformResult } from './base';

export class AnthropicTransformer extends BaseTransformer {
  name = 'anthropic';

  /**
   * Transform request to Anthropic format with special adaptations for public welfare sites
   * Anthropic 
   *
   * Supports:
   * - agentrouter.org: Requires user-agent header 'claude-cli/2.0.14 (external, cli)'
   * - anyrouter.top, q.quuvv.cn, etc.: Requires system[0] to contain You are Claude Code
   */
  async transformRequest(request: any, options?: any): Promise<TransformResult> {
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

    // Prepare headers for public welfare sites adaptations
    const headers: Record<string, string> = {};
    const baseUrl = options?.baseUrl || '';

    // agentrouter.org: Set user-agent header
    if (['agentrouter.org'].some((host) => baseUrl.includes(host))) {
      console.log('🔧 Adapting for agentrouter.org: Setting VS Code extension user-agent');
      headers['user-agent'] = 'claude-cli/2.0.14 (external, cli)';
    }

    // anyrouter.top and related sites: Inject required system prompt
    if (['anyrouter.top', 'q.quuvv.cn', 'pmpjfbhq.cn-nb1.rainapp.top'].some((host) => baseUrl.includes(host))) {
      console.log('🔧 Adapting for anyrouter.top: Injecting Claude Code system prompt');

      const requiredPrompt = You are Claude Code, Anthropic's official CLI for Claude.;

      if (transformed.system && Array.isArray(transformed.system) && transformed.system.length > 0) {
        // Check if the first system prompt already contains the required text
        if (transformed.system[0].text !== requiredPrompt) {
          // If it contains Claude Agent SDK, replace it
          if (transformed.system[0].text.includes(Claude Agent SDK)) {
            transformed.system[0].text = requiredPrompt;
          } else {
            // Otherwise, prepend the required prompt
            transformed.system.unshift({
              type: text,
              text: requiredPrompt,
              cache_control: transformed.system[0].cache_control
            });
          }
        }
      } else if (!transformed.system) {
        // If no system prompt exists, create one
        transformed.system = [{
          type: text,
          text: requiredPrompt
        }];
      }
    }

    return {
      body: transformed,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    };
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
