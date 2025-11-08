/**
 * Azure OpenAI API Transformer
 * Azure OpenAI API 转换器
 *
 * Converts between Azure OpenAI API and Anthropic Messages API
 * Azure OpenAI API 与 Anthropic Messages API 之间的转换
 *
 * Azure OpenAI uses the same format as OpenAI with some additional features
 * Azure OpenAI 使用与 OpenAI 相同的格式，并增加了一些额外功能
 */

import { OpenAITransformer } from './openai';

export class AzureOpenAITransformer extends OpenAITransformer {
  name = 'azure-openai';

  /**
   * Transform Anthropic format to Azure OpenAI format
   * 将 Anthropic 格式转换为 Azure OpenAI 格式
   */
  async transformRequest(request: any, options?: any): Promise<any> {
    // Use OpenAI transformer as base
    // 使用 OpenAI 转换器作为基础
    const transformed = await super.transformRequest(request, options);

    // Add Azure-specific parameters / 添加 Azure 特定参数
    if (options?.dataSources) {
      transformed.data_sources = options.dataSources;
    }

    if (options?.enhancements) {
      transformed.enhancements = options.enhancements;
    }

    // Azure content filtering / Azure 内容过滤
    if (options?.contentFilter !== undefined) {
      transformed.content_filter = options.contentFilter;
    }

    return transformed;
  }

  /**
   * Transform Azure OpenAI response to Anthropic format
   * 将 Azure OpenAI 响应转换为 Anthropic 格式
   */
  async transformResponse(response: any, options?: any): Promise<any> {
    // Azure OpenAI responses are similar to OpenAI
    // Azure OpenAI 响应与 OpenAI 类似
    const transformed = await super.transformResponse(response, options);

    // Add Azure-specific metadata if present
    // 添加 Azure 特定元数据（如果存在）
    if (response.prompt_filter_results) {
      if (!transformed.metadata) {
        transformed.metadata = {};
      }
      transformed.metadata.contentFilter = response.prompt_filter_results;
    }

    return transformed;
  }
}
