/**
 * Enhanced Transformer Pipeline System
 *  Transformer 
 *
 * Provides advanced pipeline composition, conditional transformers, and presets
 */

import type { Transformer, TransformerConfig } from '../types';
import type { TransformerManager } from './base';

// ============================================================================
// Pipeline Types
// ============================================================================

/**
 * Condition function for conditional transformer execution
 * Transformer
 */
export type TransformerCondition = (
  data: any,
  context: PipelineContext
) => boolean | Promise<boolean>;

/**
 * Context passed through the pipeline
 *
 */
export interface PipelineContext {
  channelId?: string;
  channelType?: string;
  model?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * Enhanced transformer spec with conditions
 * Transformer
 */
export interface ConditionalTransformerSpec {
  name: string;
  options?: Record<string, any>;
  condition?: TransformerCondition;
  /** Skip on error instead of throwing */
  skipOnError?: boolean;
}

/**
 * Pipeline preset definition
 *
 */
export interface PipelinePreset {
  name: string;
  description: string;
  transformers: ConditionalTransformerSpec;
}

/**
 * Pipeline execution result
 *
 */
export interface PipelineResult {
  body: any;
  headers?: Record<string, string>;
  metadata?: {
    appliedTransformers: string;
    skippedTransformers: string;
    errors: Array<{ transformer: string; error: string }>;
  };
}

// ============================================================================
// Built-in Presets
// ============================================================================

/**
 * Common transformer presets
 * Transformer
 */
export const BUILTIN_PRESETS: Record<string, PipelinePreset> = {
  // Basic safety preset: limit tokens and clean cache
  // token cache
  safe: {
    name: 'safe',
    description: 'Basic safety: limit tokens and clean cache',
    transformers: [
      { name: 'maxtoken', options: { maxTokens: 4096 } },
      { name: 'cleancache' },
    ],
  },

  // Strict preset: enforce limits and sampling
  //
  strict: {
    name: 'strict',
    description: 'Strict mode: enforce all limits',
    transformers: [
      { name: 'maxtoken', options: { maxTokens: 2048, enforceStrict: true } },
      { name: 'sampling', options: { enforceDefaults: true } },
      { name: 'cleancache' },
    ],
  },

  // Balanced preset: reasonable limits with flexibility
  //
  balanced: {
    name: 'balanced',
    description: 'Balanced: reasonable limits with flexibility',
    transformers: [
      { name: 'maxtoken', options: { maxTokens: 8192 } },
      {
        name: 'sampling',
        options: {
          temperature: { min: 0, max: 2, default: 1 },
          topP: { min: 0, max: 1 },
        },
      },
      { name: 'cleancache' },
    ],
  },

  // High-quality preset: optimized for quality
  //
  quality: {
    name: 'quality',
    description: 'High quality: optimized parameters',
    transformers: [
      { name: 'maxtoken', options: { maxTokens: 16384 } },
      {
        name: 'sampling',
        options: {
          temperature: { min: 0, max: 1.5, default: 0.7 },
          topP: { default: 0.9 },
        },
      },
    ],
  },
};

// ============================================================================
// Enhanced Pipeline Manager
// ============================================================================

/**
 * Enhanced transformer pipeline with advanced features
 * Transformer
 */
export class TransformerPipeline {
  private presets = new Map<string, PipelinePreset>;

  constructor(private transformerManager: TransformerManager) {
    // Register built-in presets
    //
    Object.values(BUILTIN_PRESETS).forEach((preset) => {
      this.registerPreset(preset);
    });
  }

  /**
   * Register a custom preset
   *
   */
  registerPreset(preset: PipelinePreset) {
    this.presets.set(preset.name, preset);
  }

  /**
   * Get a preset by name
   *
   */
  getPreset(name: string): PipelinePreset | undefined {
    return this.presets.get(name);
  }

  /**
   * List all available presets
   *
   */
  listPresets: PipelinePreset {
    return Array.from(this.presets.values);
  }

  /**
   * Execute a transformer pipeline with conditions and metadata
   * Transformer
   */
  async executeRequest(
    request: any,
    specs: ConditionalTransformerSpec,
    context: PipelineContext = {}
  ): Promise<PipelineResult> {
    let resultBody = request;
    let mergedHeaders: Record<string, string> = {};
    const appliedTransformers: string = ;
    const skippedTransformers: string = ;
    const errors: Array<{ transformer: string; error: string }> = ;

    for (const spec of specs) {
      // Check condition if present
      //
      if (spec.condition) {
        try {
          const shouldApply = await spec.condition(resultBody, context);
          if (!shouldApply) {
            skippedTransformers.push(spec.name);
            continue;
          }
        } catch (error) {
          console.error(`Condition check failed for transformer ${spec.name}:`, error);
          skippedTransformers.push(spec.name);
          continue;
        }
      }

      // Get transformer
      // Transformer
      const transformer = this.transformerManager.get(spec.name);
      if (!transformer) {
        console.warn(`Transformer ${spec.name} not found, skipping`);
        skippedTransformers.push(spec.name);
        continue;
      }

      // Apply transformer
      // Transformer
      try {
        const result = await transformer.transformRequest(resultBody, spec.options);

        // Handle result
        //
        if (result && typeof result === 'object' && 'body' in result) {
          resultBody = result.body;
          if (result.headers) {
            mergedHeaders = { ...mergedHeaders, ...result.headers };
          }
        } else {
          resultBody = result;
        }

        appliedTransformers.push(spec.name);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Transformer ${spec.name} failed:`, error);
        errors.push({ transformer: spec.name, error: errorMessage });

        if (spec.skipOnError) {
          skippedTransformers.push(spec.name);
        } else {
          throw error;
        }
      }
    }

    return {
      body: resultBody,
      headers: Object.keys(mergedHeaders).length > 0 ? mergedHeaders : undefined,
      metadata: {
        appliedTransformers,
        skippedTransformers,
        errors,
      },
    };
  }

  /**
   * Execute response transformation pipeline
   *
   */
  async executeResponse(
    response: any,
    specs: ConditionalTransformerSpec,
    context: PipelineContext = {}
  ): Promise<PipelineResult> {
    let result = response;
    const appliedTransformers: string = ;
    const skippedTransformers: string = ;
    const errors: Array<{ transformer: string; error: string }> = ;

    // Apply in reverse order for response
    //
    for (let i = specs.length - 1; i >= 0; i--) {
      const spec = specs[i];

      // Check condition if present
      //
      if (spec.condition) {
        try {
          const shouldApply = await spec.condition(result, context);
          if (!shouldApply) {
            skippedTransformers.push(spec.name);
            continue;
          }
        } catch (error) {
          console.error(`Condition check failed for transformer ${spec.name}:`, error);
          skippedTransformers.push(spec.name);
          continue;
        }
      }

      // Get transformer
      // Transformer
      const transformer = this.transformerManager.get(spec.name);
      if (!transformer) {
        console.warn(`Transformer ${spec.name} not found, skipping`);
        skippedTransformers.push(spec.name);
        continue;
      }

      // Apply transformer
      // Transformer
      try {
        result = await transformer.transformResponse(result, spec.options);
        appliedTransformers.push(spec.name);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Transformer ${spec.name} failed:`, error);
        errors.push({ transformer: spec.name, error: errorMessage });

        if (spec.skipOnError) {
          skippedTransformers.push(spec.name);
        } else {
          throw error;
        }
      }
    }

    return {
      body: result,
      metadata: {
        appliedTransformers,
        skippedTransformers,
        errors,
      },
    };
  }

  /**
   * Execute a preset by name
   *
   */
  async executePreset(
    request: any,
    presetName: string,
    context: PipelineContext = {}
  ): Promise<PipelineResult> {
    const preset = this.getPreset(presetName);
    if (!preset) {
      throw new Error(`Preset ${presetName} not found`);
    }

    return this.executeRequest(request, preset.transformers, context);
  }

  /**
   * Compose multiple presets into a single pipeline
   *
   */
  composePresets(...presetNames: string): ConditionalTransformerSpec {
    const transformers: ConditionalTransformerSpec = ;

    for (const name of presetNames) {
      const preset = this.getPreset(name);
      if (preset) {
        transformers.push(...preset.transformers);
      } else {
        console.warn(`Preset ${name} not found, skipping`);
      }
    }

    return transformers;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse transformer config into conditional specs
 * Transformer  Spec
 */
export function parseTransformerConfig(
  config: TransformerConfig | undefined,
  model?: string
): ConditionalTransformerSpec {
  if (!config) {
    return ;
  }

  const specs: ConditionalTransformerSpec = ;

  // Add global transformers
  // Transformer
  if (config.use) {
    for (const spec of config.use) {
      if (typeof spec === 'string') {
        specs.push({ name: spec });
      } else {
        specs.push({ name: spec[0], options: spec[1] });
      }
    }
  }

  // Add model-specific transformers
  // Transformer
  if (model && config[model]) {
    const modelConfig = config[model];
    if (modelConfig && typeof modelConfig === 'object' && 'use' in modelConfig) {
      for (const spec of modelConfig.use || ) {
        if (typeof spec === 'string') {
          specs.push({ name: spec });
        } else {
          specs.push({ name: spec[0], options: spec[1] });
        }
      }
    }
  }

  return specs;
}

/**
 * Common condition helpers
 *
 */
export const Conditions = {
  /**
   * Only apply if model matches pattern
   *
   */
  modelMatches: (pattern: string | RegExp): TransformerCondition => {
    return (_, context) => {
      if (!context.model) return false;
      if (typeof pattern === 'string') {
        return context.model === pattern;
      }
      return pattern.test(context.model);
    };
  },

  /**
   * Only apply if channel type matches
   *
   */
  channelTypeIs: (type: string): TransformerCondition => {
    return (_, context) => context.channelType === type;
  },

  /**
   * Only apply if request has certain field
   *
   */
  hasField: (fieldPath: string): TransformerCondition => {
    return (data) => {
      const parts = fieldPath.split('.');
      let current = data;
      for (const part of parts) {
        if (current == null || typeof current !== 'object') {
          return false;
        }
        current = current[part];
      }
      return current !== undefined;
    };
  },

  /**
   * Combine multiple conditions with AND logic
   *  AND
   */
  and: (...conditions: TransformerCondition): TransformerCondition => {
    return async (data, context) => {
      for (const condition of conditions) {
        const result = await condition(data, context);
        if (!result) return false;
      }
      return true;
    };
  },

  /**
   * Combine multiple conditions with OR logic
   *  OR
   */
  or: (...conditions: TransformerCondition): TransformerCondition => {
    return async (data, context) => {
      for (const condition of conditions) {
        const result = await condition(data, context);
        if (result) return true;
      }
      return false;
    };
  },

  /**
   * Negate a condition
   *
   */
  not: (condition: TransformerCondition): TransformerCondition => {
    return async (data, context) => {
      const result = await condition(data, context);
      return !result;
    };
  },
};
