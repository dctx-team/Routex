/**
 * Base Transformer for Routex
 * Routex Transformer
 *
 * Transformers convert requests and responses between different API formats
 * Transformer API
 */

import type { Transformer } from '../types';

/**
 * Result of request transformation with optional headers
 */
export interface TransformResult {
  body: any;
  headers?: Record<string, string>;
}

/**
 * Abstract base class for all transformers
 * transformer
 */
export abstract class BaseTransformer implements Transformer {
  abstract name: string;

  /**
   * Transform request before sending to provider
 * provider
   * @returns Transformed body or {body, headers} object
   */
  async transformRequest(request: any, options?: any): Promise<any | TransformResult> {
    return request;
  }

  /**
   * Transform response from provider before returning to client
 * provider
   */
  async transformResponse(response: any, options?: any): Promise<any> {
    return response;
  }

  /**
   * Helper: Extract text from content blocks
 *
   */
  protected extractText(content: any): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('');
    }

    return '';
  }

  /**
   * Helper: Check if content contains images
 *
   */
  protected hasImages(content: any): boolean {
    if (Array.isArray(content)) {
      return content.some((block) => block.type === 'image');
    }
    return false;
  }
}

/**
 * Transformer Manager - Manages transformer registry and execution
 * Transformer - transformer
 */
export class TransformerManager {
  private transformers: Map<string, Transformer> = new Map();

  /**
   * Register a transformer
 * transformer
   */
  register(transformer: Transformer) {
    this.transformers.set(transformer.name, transformer);
  }

  /**
   * Get a transformer by name
 * transformer
   */
  get(name: string): Transformer | undefined {
    return this.transformers.get(name);
  }

  /**
   * Apply multiple transformers to a request
 * transformers
   * @returns {body, headers} object with transformed body and merged headers
   */
  async transformRequest(
    request: any,
    transformerSpecs: (string | [string, Record<string, any>])[]
  ): Promise<{ body: any; headers?: Record<string, string> }> {
    let resultBody = request;
    let mergedHeaders: Record<string, string> = {};

    for (const spec of transformerSpecs) {
      const [name, options] = Array.isArray(spec) ? spec : [spec, undefined];
      const transformer = this.get(name);

      if (!transformer) {
        console.warn(`Transformer "${name}" not found, skipping`);
        continue;
      }

      try {
        const result = await transformer.transformRequest(resultBody, options);

        // Handle both simple body return and {body, headers} return
        if (result && typeof result === 'object' && 'body' in result) {
          resultBody = result.body;
          if (result.headers) {
            mergedHeaders = { ...mergedHeaders, ...result.headers };
          }
        } else {
          resultBody = result;
        }
      } catch (error) {
        console.error(`Transformer "${name}" failed on request:`, error);
        throw error;
      }
    }

    return {
      body: resultBody,
      headers: Object.keys(mergedHeaders).length > 0 ? mergedHeaders : undefined,
    };
  }

  /**
   * Apply multiple transformers to a response
 * transformers
   */
  async transformResponse(
    response: any,
    transformerSpecs: (string | [string, Record<string, any>])[]
  ): Promise<any> {
    let result = response;

    //// Apply in reverse order for response
    for (let i = transformerSpecs.length - 1; i >= 0; i--) {
      const spec = transformerSpecs[i];
      const [name, options] = Array.isArray(spec) ? spec : [spec, undefined];
      const transformer = this.get(name);

      if (!transformer) {
        console.warn(`Transformer "${name}" not found, skipping`);
        continue;
      }

      try {
        result = await transformer.transformResponse(result, options);
      } catch (error) {
        console.error(`Transformer "${name}" failed on response:`, error);
        throw error;
      }
    }

    return result;
  }

  /**
   * List all registered transformers
 * transformers
   */
  list(): string[] {
    return Array.from(this.transformers.keys());
  }
}
