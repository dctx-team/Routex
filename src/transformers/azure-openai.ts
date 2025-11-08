/**
 * Azure OpenAI API Transformer
 * Azure OpenAI API 
 *
 * Converts between Azure OpenAI API and Anthropic Messages API
 * Azure OpenAI API  Anthropic Messages API 
 *
 * Azure OpenAI uses the same format as OpenAI with some additional features
 * Azure OpenAI  OpenAI 
 */

import { OpenAITransformer } from './openai';

export class AzureOpenAITransformer extends OpenAITransformer {
  name = 'azure-openai';

  /**
   * Transform Anthropic format to Azure OpenAI format
   *  Anthropic  Azure OpenAI 
   */
  async transformRequest(request: any, options?: any): Promise<any> {
    // Use OpenAI transformer as base
    //  OpenAI 
    const transformed = await super.transformRequest(request, options);

    // Add Azure-specific parameters /  Azure 
    if (options?.dataSources) {
      transformed.data_sources = options.dataSources;
    }

    if (options?.enhancements) {
      transformed.enhancements = options.enhancements;
    }

    // Azure content filtering / Azure 
    if (options?.contentFilter !== undefined) {
      transformed.content_filter = options.contentFilter;
    }

    return transformed;
  }

  /**
   * Transform Azure OpenAI response to Anthropic format
   *  Azure OpenAI  Anthropic 
   */
  async transformResponse(response: any, options?: any): Promise<any> {
    // Azure OpenAI responses are similar to OpenAI
    // Azure OpenAI  OpenAI 
    const transformed = await super.transformResponse(response, options);

    // Add Azure-specific metadata if present
    //  Azure 
    if (response.prompt_filter_results) {
      if (!transformed.metadata) {
        transformed.metadata = {};
      }
      transformed.metadata.contentFilter = response.prompt_filter_results;
    }

    return transformed;
  }
}
