/**
 * MaxToken Transformer
 *  token 
 */

import { BaseTransformer, TransformResult } from '../base';

export interface MaxTokenOptions {
  maxTokens?: number; //  tokens 
  defaultMaxTokens?: number; // 
  enforceStrict?: boolean; // 
}

export class MaxTokenTransformer extends BaseTransformer {
  name = 'maxtoken';
  private maxTokens: number;
  private defaultMaxTokens: number;
  private enforceStrict: boolean;

  constructor(options: MaxTokenOptions = {}) {
    super;
    this.maxTokens = options.maxTokens || 4096;
    this.defaultMaxTokens = options.defaultMaxTokens || 1024;
    this.enforceStrict = options.enforceStrict ?? false;
  }

  async transformRequest(request: any, options?: any): Promise<TransformResult> {
    const requestedTokens = request.max_tokens || this.defaultMaxTokens;

    // 
    if (requestedTokens > this.maxTokens) {
      if (this.enforceStrict) {
        throw new Error(
          `Requested max_tokens (${requestedTokens}) exceeds limit (${this.maxTokens})`,
        );
      }

      // 
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

    //  max_tokens
    if (!request.max_tokens) {
      return {
        body: {
          ...request,
          max_tokens: this.defaultMaxTokens,
        },
      };
    }

    // 
    return { body: request };
  }

  async transformResponse(response: any, options?: any): Promise<any> {
    // 
    return response;
  }
}
