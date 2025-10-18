/**
 * CleanCache Transformer
 * 
 */

import { BaseTransformer, TransformResult } from '../base';

export interface CleanCacheOptions {
  removeMetadata?: boolean; // 
  removeCache?: boolean; // 
  removeInternal?: boolean; // 
  customFields?: string; // 
}

export class CleanCacheTransformer extends BaseTransformer {
  name = 'cleancache';
  private options: CleanCacheOptions;

  // 
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
    super;
    this.options = {
      removeMetadata: options.removeMetadata ?? true,
      removeCache: options.removeCache ?? true,
      removeInternal: options.removeInternal ?? true,
      customFields: options.customFields || ,
    };
  }

  async transformRequest(request: any, options?: any): Promise<TransformResult> {
    const transformed = { ...request };
    const fieldsToRemove: string = ;

    // 
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

    // 
    const removedFields: string = ;
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
