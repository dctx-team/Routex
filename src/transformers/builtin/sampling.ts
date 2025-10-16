/**
 * Sampling Transformer
 * 控制采样参数（temperature、top_p、top_k）
 */

import { BaseTransformer, TransformResult } from '../base';

export interface SamplingOptions {
  temperature?: {
    min?: number;
    max?: number;
    default?: number;
  };
  topP?: {
    min?: number;
    max?: number;
    default?: number;
  };
  topK?: {
    min?: number;
    max?: number;
    default?: number;
  };
  enforceDefaults?: boolean; // 强制使用默认值（忽略客户端设置）
}

export class SamplingTransformer extends BaseTransformer {
  name = 'sampling';
  private options: SamplingOptions;

  constructor(options: SamplingOptions = {}) {
    super();
    this.options = {
      temperature: {
        min: 0,
        max: 2,
        default: 1,
        ...options.temperature,
      },
      topP: {
        min: 0,
        max: 1,
        default: undefined,
        ...options.topP,
      },
      topK: {
        min: 0,
        max: 500,
        default: undefined,
        ...options.topK,
      },
      enforceDefaults: options.enforceDefaults ?? false,
    };
  }

  async transformRequest(request: any, options?: any): Promise<TransformResult> {
    const transformed = { ...request };
    let modified = false;

    // 处理 temperature
    if (this.options.temperature) {
      const temp = this.options.temperature;

      if (this.options.enforceDefaults && temp.default !== undefined) {
        // 强制使用默认值
        if (transformed.temperature !== temp.default) {
          console.log(`🌡️  Sampling: Enforcing temperature=${temp.default}`);
          transformed.temperature = temp.default;
          modified = true;
        }
      } else if (transformed.temperature !== undefined) {
        // 限制范围
        if (transformed.temperature < temp.min!) {
          console.log(`🌡️  Sampling: Limiting temperature from ${transformed.temperature} to ${temp.min}`);
          transformed.temperature = temp.min!;
          modified = true;
        } else if (transformed.temperature > temp.max!) {
          console.log(`🌡️  Sampling: Limiting temperature from ${transformed.temperature} to ${temp.max}`);
          transformed.temperature = temp.max!;
          modified = true;
        }
      } else if (temp.default !== undefined) {
        // 设置默认值
        transformed.temperature = temp.default;
        modified = true;
      }
    }

    // 处理 top_p
    if (this.options.topP) {
      const topP = this.options.topP;

      if (this.options.enforceDefaults && topP.default !== undefined) {
        if (transformed.top_p !== topP.default) {
          console.log(`🎯 Sampling: Enforcing top_p=${topP.default}`);
          transformed.top_p = topP.default;
          modified = true;
        }
      } else if (transformed.top_p !== undefined) {
        if (transformed.top_p < topP.min!) {
          console.log(`🎯 Sampling: Limiting top_p from ${transformed.top_p} to ${topP.min}`);
          transformed.top_p = topP.min!;
          modified = true;
        } else if (transformed.top_p > topP.max!) {
          console.log(`🎯 Sampling: Limiting top_p from ${transformed.top_p} to ${topP.max}`);
          transformed.top_p = topP.max!;
          modified = true;
        }
      } else if (topP.default !== undefined) {
        transformed.top_p = topP.default;
        modified = true;
      }
    }

    // 处理 top_k
    if (this.options.topK) {
      const topK = this.options.topK;

      if (this.options.enforceDefaults && topK.default !== undefined) {
        if (transformed.top_k !== topK.default) {
          console.log(`🔝 Sampling: Enforcing top_k=${topK.default}`);
          transformed.top_k = topK.default;
          modified = true;
        }
      } else if (transformed.top_k !== undefined) {
        if (transformed.top_k < topK.min!) {
          console.log(`🔝 Sampling: Limiting top_k from ${transformed.top_k} to ${topK.min}`);
          transformed.top_k = topK.min!;
          modified = true;
        } else if (transformed.top_k > topK.max!) {
          console.log(`🔝 Sampling: Limiting top_k from ${transformed.top_k} to ${topK.max}`);
          transformed.top_k = topK.max!;
          modified = true;
        }
      } else if (topK.default !== undefined) {
        transformed.top_k = topK.default;
        modified = true;
      }
    }

    if (modified) {
      console.log('📝 Sampling: Parameters adjusted');
    }

    return { body: transformed };
  }

  async transformResponse(response: any, options?: any): Promise<any> {
    return response;
  }
}
