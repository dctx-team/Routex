/**
 * Custom Router Functions for Routex
 * Routex 自定义路由函数库
 *
 * Provides a library of reusable custom routing functions
 * and tools to create, compose, and test them
 */

import type { Channel } from '../../types';
import type { RouterContext, RouterResult } from './smart-router';
import type { ContentAnalysis } from './content-analyzer';

// ============================================================================
// Types
// ============================================================================

/**
 * Custom router function signature
 * 自定义路由函数签名
 *
 * @param context - Request context
 * @param analysis - Content analysis result
 * @param availableChannels - Available channels to choose from
 * @returns Boolean (for condition check) or Channel (for direct routing)
 */
export type CustomRouterFunction = (
  context: RouterContext,
  analysis?: ContentAnalysis,
  availableChannels?: Channel[]
) => boolean | Channel | Promise<boolean | Channel>;

/**
 * Router function metadata
 * 路由函数元数据
 */
export interface RouterFunctionInfo {
  name: string;
  description: string;
  version?: string;
  author?: string;
  examples?: string[];
}

/**
 * Registered custom router
 * 注册的自定义路由器
 */
export interface RegisteredRouter {
  fn: CustomRouterFunction;
  info: RouterFunctionInfo;
}

// ============================================================================
// Custom Router Registry
// ============================================================================

/**
 * Registry for custom routing functions
 * 自定义路由函数注册表
 */
export class CustomRouterRegistry {
  private routers = new Map<string, RegisteredRouter>();

  /**
   * Register a custom router function
   * 注册自定义路由函数
   */
  register(name: string, fn: CustomRouterFunction, info?: Partial<RouterFunctionInfo>) {
    this.routers.set(name, {
      fn,
      info: {
        name,
        description: info?.description || 'Custom router function',
        version: info?.version,
        author: info?.author,
        examples: info?.examples,
      },
    });
  }

  /**
   * Get a registered router function
   * 获取注册的路由函数
   */
  get(name: string): CustomRouterFunction | undefined {
    return this.routers.get(name)?.fn;
  }

  /**
   * Get router info
   * 获取路由器信息
   */
  getInfo(name: string): RouterFunctionInfo | undefined {
    return this.routers.get(name)?.info;
  }

  /**
   * List all registered routers
   * 列出所有注册的路由器
   */
  list(): RouterFunctionInfo[] {
    return Array.from(this.routers.values()).map((r) => r.info);
  }

  /**
   * Check if a router is registered
   * 检查路由器是否已注册
   */
  has(name: string): boolean {
    return this.routers.has(name);
  }

  /**
   * Unregister a router
   * 注销路由器
   */
  unregister(name: string): boolean {
    return this.routers.delete(name);
  }

  /**
   * Clear all routers
   * 清空所有路由器
   */
  clear() {
    this.routers.clear();
  }
}

// ============================================================================
// Built-in Router Functions
// ============================================================================

/**
 * Built-in custom router functions
 * 内置自定义路由函数
 */
export const BuiltinRouters = {
  /**
   * Route based on time of day
   * 基于时间路由
   *
   * Example: Use cheaper models during off-peak hours
   */
  timeBasedRouter: (peakHours: number[] = [9, 10, 11, 14, 15, 16, 17]): CustomRouterFunction => {
    return (context, analysis, availableChannels) => {
      const hour = new Date().getHours();
      const isPeakTime = peakHours.includes(hour);

      if (!availableChannels || availableChannels.length === 0) {
        return !isPeakTime; // During off-peak, any channel is ok
      }

      // During peak time, prefer high-priority channels
      if (isPeakTime) {
        const highPriorityChannels = availableChannels
          .filter((c) => c.priority >= 80)
          .sort((a, b) => b.priority - a.priority);

        return highPriorityChannels.length > 0 ? highPriorityChannels[0] : true;
      }

      // During off-peak, prefer lower-cost channels
      const normalChannels = availableChannels
        .filter((c) => c.priority < 80)
        .sort((a, b) => a.priority - b.priority);

      return normalChannels.length > 0 ? normalChannels[0] : true;
    };
  },

  /**
   * Route based on user/session metadata
   * 基于用户/会话元数据路由
   *
   * Example: VIP users get priority channels
   */
  userTierRouter: (tierField: string = 'userTier'): CustomRouterFunction => {
    return (context, analysis, availableChannels) => {
      const tier = context.metadata?.[tierField] || 'free';

      if (!availableChannels || availableChannels.length === 0) {
        return true;
      }

      switch (tier) {
        case 'premium':
        case 'vip':
          // Premium users get best channels
          const premiumChannels = availableChannels
            .filter((c) => c.priority >= 90)
            .sort((a, b) => b.priority - a.priority);
          return premiumChannels.length > 0 ? premiumChannels[0] : true;

        case 'pro':
          // Pro users get good channels
          const proChannels = availableChannels
            .filter((c) => c.priority >= 70 && c.priority < 90)
            .sort((a, b) => b.priority - a.priority);
          return proChannels.length > 0 ? proChannels[0] : true;

        default:
          // Free users get standard channels
          const freeChannels = availableChannels
            .filter((c) => c.priority < 70)
            .sort((a, b) => a.priority - b.priority);
          return freeChannels.length > 0 ? freeChannels[0] : true;
      }
    };
  },

  /**
   * Route based on cost optimization
   * 基于成本优化路由
   *
   * Example: Simple requests use cheaper models
   */
  costOptimizedRouter: (
    costThreshold: 'low' | 'medium' | 'high' = 'medium'
  ): CustomRouterFunction => {
    return (context, analysis, availableChannels) => {
      if (!analysis || !availableChannels || availableChannels.length === 0) {
        return true;
      }

      // Define cost levels based on complexity
      let targetCostLevel: 'low' | 'medium' | 'high';

      if (analysis.complexity === 'simple' || analysis.wordCount < 100) {
        targetCostLevel = 'low';
      } else if (analysis.complexity === 'very_complex' || analysis.wordCount > 1000) {
        targetCostLevel = 'high';
      } else {
        targetCostLevel = 'medium';
      }

      // Only route if cost matches threshold
      if (costThreshold !== targetCostLevel) {
        return false;
      }

      // Map cost levels to channel priorities
      const priorityRanges: Record<string, [number, number]> = {
        low: [0, 50],
        medium: [50, 80],
        high: [80, 100],
      };

      const [minPriority, maxPriority] = priorityRanges[targetCostLevel];
      const matchingChannels = availableChannels
        .filter((c) => c.priority >= minPriority && c.priority <= maxPriority)
        .sort((a, b) => a.priority - b.priority);

      return matchingChannels.length > 0 ? matchingChannels[0] : true;
    };
  },

  /**
   * Route based on channel health
   * 基于渠道健康状况路由
   *
   * Example: Prefer channels with high success rates
   */
  healthBasedRouter: (minSuccessRate: number = 0.95): CustomRouterFunction => {
    return (context, analysis, availableChannels) => {
      if (!availableChannels || availableChannels.length === 0) {
        return true;
      }

      // Calculate success rate for each channel
      const healthyChannels = availableChannels.filter((c) => {
        const totalRequests = c.successCount + c.failureCount;
        if (totalRequests === 0) return true; // New channels get a chance

        const successRate = c.successCount / totalRequests;
        return successRate >= minSuccessRate;
      });

      if (healthyChannels.length === 0) {
        // No healthy channels, allow any
        return true;
      }

      // Sort by success rate
      const sorted = healthyChannels.sort((a, b) => {
        const rateA = a.successCount / (a.successCount + a.failureCount || 1);
        const rateB = b.successCount / (b.successCount + b.failureCount || 1);
        return rateB - rateA;
      });

      return sorted[0];
    };
  },

  /**
   * Route based on channel load
   * 基于渠道负载路由
   *
   * Example: Avoid overloaded channels
   */
  loadBalancedRouter: (maxLoad: number = 100): CustomRouterFunction => {
    return (context, analysis, availableChannels) => {
      if (!availableChannels || availableChannels.length === 0) {
        return true;
      }

      // Filter channels under load threshold
      const availableByLoad = availableChannels.filter((c) => c.requestCount < maxLoad);

      if (availableByLoad.length === 0) {
        // All channels are at capacity, use least loaded
        const sorted = [...availableChannels].sort((a, b) => a.requestCount - b.requestCount);
        return sorted[0];
      }

      // Return least loaded channel
      const sorted = availableByLoad.sort((a, b) => a.requestCount - b.requestCount);
      return sorted[0];
    };
  },

  /**
   * Route based on model capabilities
   * 基于模型能力路由
   *
   * Example: Function calling requires specific models
   */
  capabilityRouter: (requiredCapability: string): CustomRouterFunction => {
    return (context, analysis, availableChannels) => {
      // Check if capability is needed
      const needsCapability = (() => {
        switch (requiredCapability) {
          case 'function_calling':
            return context.tools && context.tools.length > 0;
          case 'vision':
            return analysis?.hasImages || false;
          case 'long_context':
            return (analysis?.estimatedTokens || 0) > 50000;
          case 'code_generation':
            return analysis?.hasCode || analysis?.category === 'coding' || false;
          default:
            return false;
        }
      })();

      if (!needsCapability) {
        return false; // This router doesn't apply
      }

      if (!availableChannels || availableChannels.length === 0) {
        return true;
      }

      // Model capability mappings
      const capabilityModels: Record<string, RegExp[]> = {
        function_calling: [/claude-3/, /gpt-4/, /gpt-3.5-turbo/],
        vision: [/claude-3/, /gpt-4.*vision/, /gemini.*pro.*vision/],
        long_context: [/claude-3/, /gpt-4-turbo/, /gemini.*pro/],
        code_generation: [/claude.*opus/, /claude.*sonnet/, /gpt-4/],
      };

      const patterns = capabilityModels[requiredCapability] || [];
      const capableChannels = availableChannels.filter((c) =>
        c.models.some((m) => patterns.some((p) => p.test(m)))
      );

      if (capableChannels.length === 0) {
        return false; // No capable channels
      }

      // Return highest priority capable channel
      const sorted = capableChannels.sort((a, b) => b.priority - a.priority);
      return sorted[0];
    };
  },

  /**
   * A/B testing router
   * A/B 测试路由
   *
   * Example: Route 10% of traffic to experimental channel
   */
  abTestRouter: (
    experimentalChannelName: string,
    trafficPercentage: number = 10
  ): CustomRouterFunction => {
    return (context, analysis, availableChannels) => {
      if (!availableChannels || availableChannels.length === 0) {
        return false;
      }

      // Use session ID for consistent routing
      const seed = context.sessionId || context.model || '';
      const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const percentage = hash % 100;

      // Route to experimental channel based on percentage
      if (percentage < trafficPercentage) {
        const experimentalChannel = availableChannels.find(
          (c) => c.name === experimentalChannelName || c.id === experimentalChannelName
        );

        if (experimentalChannel) {
          return experimentalChannel;
        }
      }

      return false; // Use default routing
    };
  },
};

// ============================================================================
// Router Function Composers
// ============================================================================

/**
 * Compose multiple router functions with AND logic
 * 使用 AND 逻辑组合多个路由函数
 */
export function composeAnd(...routers: CustomRouterFunction[]): CustomRouterFunction {
  return async (context, analysis, availableChannels) => {
    for (const router of routers) {
      const result = await router(context, analysis, availableChannels);

      // If any router returns false, the whole composition fails
      if (result === false) {
        return false;
      }

      // If router returns a channel, use it
      if (typeof result === 'object' && result !== null) {
        return result;
      }
    }

    return true;
  };
}

/**
 * Compose multiple router functions with OR logic
 * 使用 OR 逻辑组合多个路由函数
 */
export function composeOr(...routers: CustomRouterFunction[]): CustomRouterFunction {
  return async (context, analysis, availableChannels) => {
    for (const router of routers) {
      const result = await router(context, analysis, availableChannels);

      // If any router succeeds, use it
      if (result !== false) {
        return result;
      }
    }

    return false;
  };
}

/**
 * Create a negated router function
 * 创建取反的路由函数
 */
export function not(router: CustomRouterFunction): CustomRouterFunction {
  return async (context, analysis, availableChannels) => {
    const result = await router(context, analysis, availableChannels);

    // Negate boolean results
    if (typeof result === 'boolean') {
      return !result;
    }

    // Can't negate channel results
    return false;
  };
}

/**
 * Create a conditional router
 * 创建条件路由
 */
export function when(
  condition: (context: RouterContext, analysis?: ContentAnalysis) => boolean | Promise<boolean>,
  thenRouter: CustomRouterFunction,
  elseRouter?: CustomRouterFunction
): CustomRouterFunction {
  return async (context, analysis, availableChannels) => {
    const conditionMet = await condition(context, analysis);

    if (conditionMet) {
      return thenRouter(context, analysis, availableChannels);
    } else if (elseRouter) {
      return elseRouter(context, analysis, availableChannels);
    }

    return false;
  };
}

/**
 * Create a fallback chain of routers
 * 创建回退链路由
 */
export function fallback(...routers: CustomRouterFunction[]): CustomRouterFunction {
  return async (context, analysis, availableChannels) => {
    for (const router of routers) {
      try {
        const result = await router(context, analysis, availableChannels);

        if (result !== false) {
          return result;
        }
      } catch (error) {
        console.error('Router in fallback chain failed:', error);
        // Continue to next router
      }
    }

    return false;
  };
}

// ============================================================================
// Router Testing Utilities
// ============================================================================

/**
 * Test a router function with given inputs
 * 测试路由函数
 */
export async function testRouter(
  router: CustomRouterFunction,
  testCases: Array<{
    name: string;
    context: RouterContext;
    analysis?: ContentAnalysis;
    availableChannels?: Channel[];
    expectedResult?: boolean | string; // channel name or boolean
  }>
): Promise<{ passed: number; failed: number; results: any[] }> {
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      const result = await router(
        testCase.context,
        testCase.analysis,
        testCase.availableChannels
      );

      const success =
        testCase.expectedResult === undefined ||
        (typeof result === 'boolean' && result === testCase.expectedResult) ||
        (typeof result === 'object' &&
          result !== null &&
          'name' in result &&
          result.name === testCase.expectedResult);

      if (success) {
        passed++;
      } else {
        failed++;
      }

      results.push({
        testCase: testCase.name,
        result,
        expected: testCase.expectedResult,
        success,
      });
    } catch (error) {
      failed++;
      results.push({
        testCase: testCase.name,
        error: error instanceof Error ? error.message : String(error),
        success: false,
      });
    }
  }

  return { passed, failed, results };
}

/**
 * Create a global registry instance
 * 创建全局注册表实例
 */
export const globalRouterRegistry = new CustomRouterRegistry();

// Register all built-in routers
// 注册所有内置路由器
Object.entries(BuiltinRouters).forEach(([name, factory]) => {
  globalRouterRegistry.register(
    name,
    factory as any, // Factory function, not the router itself
    {
      description: `Built-in ${name} router`,
      version: '1.0.0',
    }
  );
});
