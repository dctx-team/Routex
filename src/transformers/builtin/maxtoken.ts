/**
 * MaxToken Transformer
 * 限制最大 token 数量，防止超额使用
 */

import { BaseTransformer, TransformResult } from '../base';

export interface MaxTokenOptions {
  maxTokens?: number; // 最大 tokens 数量
  defaultMaxTokens?: number; // 默认最大值（当未指定时）
  enforceStrict?: boolean; // 严格模式：超过限制直接拒绝
}

export class MaxTokenTransformer extends BaseTransformer {
  name = 'maxtoken';
  private maxTokens: number;
  private defaultMaxTokens: number;
  private enforceStrict: boolean;

  constructor(options: MaxTokenOptions = {}) {
    super();
    this.maxTokens = options.maxTokens || 4096;
    this.defaultMaxTokens = options.defaultMaxTokens || 1024;
    this.enforceStrict = options.enforceStrict ?? false;
  }

  async transformRequest(request: any, options?: any): Promise<TransformResult> {
    const requestedTokens = request.max_tokens || this.defaultMaxTokens;

    // 检查是否超过限制
    if (requestedTokens > this.maxTokens) {
      if (this.enforceStrict) {
        throw new Error(
          `Requested max_tokens (${requestedTokens}) exceeds limit (${this.maxTokens})`,
        );
      }

      // 非严格模式：限制到最大值
      console.log(
        `⚠️  MaxToken: Limiting max_tokens from ${requestedTokens} to ${this.maxTokens}`,
      );

      return {
        body: {
          ...request,
          max_tokens: this.maxTokens,
        },
      };
    }

    // 如果未指定 max_tokens，使用默认值
    if (!request.max_tokens) {
      return {
        body: {
          ...request,
          max_tokens: this.defaultMaxTokens,
        },
      };
    }

    // 在限制范围内，不做修改
    return { body: request };
  }

  async transformResponse(response: any, options?: any): Promise<any> {
    // 响应不需要转换
    return response;
  }
}
