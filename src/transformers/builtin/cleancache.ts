/**
 * CleanCache Transformer
 * 清理缓存相关字段，确保请求的一致性
 */

import { BaseTransformer, TransformResult } from '../base';

export interface CleanCacheOptions {
  removeMetadata?: boolean; // 移除元数据字段
  removeCache?: boolean; // 移除缓存控制字段
  removeInternal?: boolean; // 移除内部字段
  customFields?: string[]; // 自定义要移除的字段
}

export class CleanCacheTransformer extends BaseTransformer {
  name = 'cleancache';
  private options: CleanCacheOptions;

  // 常见的缓存和元数据字段
  private readonly metadataFields = [
    'metadata',
    'user_metadata',
    'request_id',
    'client_id',
    'session_id',
  ];

  private readonly cacheFields = ['cache_control', 'cache_ttl', 'cache_key', 'no_cache'];

  private readonly internalFields = [
    '_internal',
    '_debug',
    '_trace',
    'x-internal',
    'x-debug',
    'routex_internal',
  ];

  constructor(options: CleanCacheOptions = {}) {
    super();
    this.options = {
      removeMetadata: options.removeMetadata ?? true,
      removeCache: options.removeCache ?? true,
      removeInternal: options.removeInternal ?? true,
      customFields: options.customFields || [],
    };
  }

  async transformRequest(request: any, options?: any): Promise<TransformResult> {
    const transformed = { ...request };
    const fieldsToRemove: string[] = [];

    // 收集要移除的字段
    if (this.options.removeMetadata) {
      fieldsToRemove.push(...this.metadataFields);
    }

    if (this.options.removeCache) {
      fieldsToRemove.push(...this.cacheFields);
    }

    if (this.options.removeInternal) {
      fieldsToRemove.push(...this.internalFields);
    }

    if (this.options.customFields && this.options.customFields.length > 0) {
      fieldsToRemove.push(...this.options.customFields);
    }

    // 移除字段
    const removedFields: string[] = [];
    for (const field of fieldsToRemove) {
      if (field in transformed) {
        delete transformed[field];
        removedFields.push(field);
      }
    }

    if (removedFields.length > 0) {
      console.log(`🧹 CleanCache: Removed fields: ${removedFields.join(', ')}`);
    }

    return { body: transformed };
  }

  async transformResponse(response: any, options?: any): Promise<any> {
    return response;
  }
}
