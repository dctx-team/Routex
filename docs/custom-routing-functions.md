# 自定义路由函数

Routex 的自定义路由函数系统，允许您创建高度灵活的路由逻辑来满足特定需求。

## 📖 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [内置路由函数](#内置路由函数)
- [创建自定义函数](#创建自定义函数)
- [函数组合](#函数组合)
- [测试路由函数](#测试路由函数)
- [最佳实践](#最佳实践)
- [API 参考](#api-参考)

## 概述

自定义路由函数允许您实现任意复杂的路由逻辑，从简单的条件判断到复杂的决策算法。

### 主要特性

- **类型安全**：完整的 TypeScript 类型支持
- **内置函数库**：8 个开箱即用的路由函数
- **函数组合**：使用 AND、OR、NOT 等逻辑组合函数
- **注册表管理**：集中管理和复用路由函数
- **测试工具**：内置测试框架验证路由逻辑
- **元数据支持**：为路由函数添加描述、版本等信息

## 快速开始

### 1. 使用内置路由函数

```typescript
import { SmartRouter, BuiltinRouters } from './core/routing';

const router = new SmartRouter(rules);

// 注册基于时间的路由
router.registerRouter(
  'offPeakRouter',
  BuiltinRouters.timeBasedRouter([9, 10, 11, 14, 15, 16, 17]),
  {
    description: '高峰时段使用高优先级渠道',
    version: '1.0.0'
  }
);
```

### 2. 在路由规则中使用

```json
{
  "id": "rule-time-based",
  "name": "Time-Based Routing",
  "condition": {
    "customFunction": "offPeakRouter"
  },
  "targetChannel": "cost-effective-channel",
  "priority": 75,
  "enabled": true
}
```

### 3. 创建简单的自定义函数

```typescript
// 创建自定义路由函数
const vipRouter: CustomRouterFunction = (context, analysis, availableChannels) => {
  // 检查是否为 VIP 用户
  const isVip = context.metadata?.userTier === 'vip';

  if (!isVip) {
    return false; // 不应用此路由
  }

  // VIP 用户使用最佳渠道
  if (availableChannels && availableChannels.length > 0) {
    const bestChannel = availableChannels
      .sort((a, b) => b.priority - a.priority)[0];
    return bestChannel;
  }

  return true;
};

// 注册
router.registerRouter('vipRouter', vipRouter, {
  description: 'VIP 用户专用路由',
});
```

## 内置路由函数

Routex 提供了 8 个内置路由函数，涵盖常见的路由场景。

### 1. timeBasedRouter - 基于时间路由

根据一天中的时间选择不同的渠道。

**用途**：
- 高峰时段使用高性能渠道
- 低峰时段使用低成本渠道
- 实现成本优化

**示例**：

```typescript
// 定义高峰时段（9-11点，14-17点）
const timeRouter = BuiltinRouters.timeBasedRouter([9, 10, 11, 14, 15, 16, 17]);

router.registerRouter('timeRouter', timeRouter);
```

**配置**：

```json
{
  "condition": {
    "customFunction": "timeRouter"
  },
  "targetChannel": "premium-channel",
  "priority": 85
}
```

### 2. userTierRouter - 用户层级路由

根据用户等级（VIP、Pro、Free）选择渠道。

**用途**：
- 为不同等级用户提供差异化服务
- 实现订阅制模型
- 用户分层管理

**示例**：

```typescript
// 使用 metadata 中的 userTier 字段
const tierRouter = BuiltinRouters.userTierRouter('userTier');

router.registerRouter('tierRouter', tierRouter);
```

**上下文要求**：

```typescript
{
  metadata: {
    userTier: 'premium' | 'pro' | 'free'
  }
}
```

### 3. costOptimizedRouter - 成本优化路由

根据请求复杂度自动选择成本最优的渠道。

**用途**：
- 自动成本优化
- 简单请求使用便宜模型
- 复杂请求使用高性能模型

**示例**：

```typescript
// 中等成本阈值
const costRouter = BuiltinRouters.costOptimizedRouter('medium');

router.registerRouter('costRouter', costRouter);
```

**成本级别**：
- `low`: 简单请求（< 100 词）
- `medium`: 中等请求
- `high`: 复杂请求（> 1000 词或复杂度高）

### 4. healthBasedRouter - 健康状况路由

根据渠道的成功率选择健康的渠道。

**用途**：
- 避免使用不稳定的渠道
- 提高请求成功率
- 自动故障转移

**示例**：

```typescript
// 最低成功率 95%
const healthRouter = BuiltinRouters.healthBasedRouter(0.95);

router.registerRouter('healthRouter', healthRouter);
```

### 5. loadBalancedRouter - 负载均衡路由

根据渠道当前负载选择最空闲的渠道。

**用途**：
- 均衡渠道负载
- 避免单一渠道过载
- 提高整体吞吐量

**示例**：

```typescript
// 最大负载 100 个请求
const loadRouter = BuiltinRouters.loadBalancedRouter(100);

router.registerRouter('loadRouter', loadRouter);
```

### 6. capabilityRouter - 能力匹配路由

根据模型能力要求路由。

**用途**：
- Function Calling 自动路由到支持的模型
- 视觉任务路由到 vision 模型
- 长上下文任务路由到支持的模型

**示例**：

```typescript
// Function Calling 能力
const fcRouter = BuiltinRouters.capabilityRouter('function_calling');

// Vision 能力
const visionRouter = BuiltinRouters.capabilityRouter('vision');

// 长上下文能力
const longContextRouter = BuiltinRouters.capabilityRouter('long_context');

// 代码生成能力
const codeRouter = BuiltinRouters.capabilityRouter('code_generation');
```

**支持的能力**：
- `function_calling`: Function Calling 支持
- `vision`: 图像理解
- `long_context`: 长上下文（> 50k tokens）
- `code_generation`: 代码生成优化

### 7. abTestRouter - A/B 测试路由

将指定比例的流量路由到实验性渠道。

**用途**：
- 新模型/渠道测试
- 逐步推出新功能
- 对比不同渠道效果

**示例**：

```typescript
// 10% 流量到实验渠道
const abRouter = BuiltinRouters.abTestRouter('experimental-channel', 10);

router.registerRouter('abRouter', abRouter);
```

**特性**：
- 使用 sessionId 确保同一用户始终路由到相同渠道
- 可配置流量比例（0-100）

## 创建自定义函数

### 函数签名

```typescript
type CustomRouterFunction = (
  context: RouterContext,
  analysis?: ContentAnalysis,
  availableChannels?: Channel[]
) => boolean | Channel | Promise<boolean | Channel>;
```

### 返回值说明

- `true`: 条件满足，继续使用规则指定的目标渠道
- `false`: 条件不满足，跳过此规则
- `Channel`: 直接返回要使用的渠道（覆盖规则配置）

### 示例 1：简单条件检查

```typescript
const workingHoursRouter: CustomRouterFunction = () => {
  const hour = new Date().getHours();
  // 只在工作时间（9-18点）应用此路由
  return hour >= 9 && hour <= 18;
};
```

### 示例 2：基于上下文的路由

```typescript
const enterpriseRouter: CustomRouterFunction = (context) => {
  const org = context.metadata?.organization;

  // 企业用户使用专用渠道
  return org?.tier === 'enterprise' && org?.activeSubscription === true;
};
```

### 示例 3：基于内容分析的路由

```typescript
const complexTaskRouter: CustomRouterFunction = (context, analysis) => {
  if (!analysis) return false;

  // 复杂编程任务使用最佳模型
  return (
    analysis.category === 'coding' &&
    analysis.complexity === 'very_complex' &&
    analysis.wordCount > 500
  );
};
```

### 示例 4：直接选择渠道

```typescript
const smartChannelSelector: CustomRouterFunction = (
  context,
  analysis,
  availableChannels
) => {
  if (!availableChannels || availableChannels.length === 0) {
    return false;
  }

  // 根据多个因素计算最佳渠道
  const scores = availableChannels.map(channel => {
    let score = 0;

    // 健康度评分
    const successRate = channel.successCount / (channel.requestCount || 1);
    score += successRate * 40;

    // 负载评分
    const loadScore = Math.max(0, 100 - channel.requestCount);
    score += loadScore * 30;

    // 优先级评分
    score += channel.priority * 0.3;

    return { channel, score };
  });

  // 返回得分最高的渠道
  const best = scores.sort((a, b) => b.score - a.score)[0];
  return best.channel;
};
```

### 示例 5：异步路由函数

```typescript
const externalApiRouter: CustomRouterFunction = async (context) => {
  // 调用外部 API 做决策
  try {
    const response = await fetch('https://api.example.com/routing-decision', {
      method: 'POST',
      body: JSON.stringify({
        userId: context.metadata?.userId,
        model: context.model,
      }),
    });

    const decision = await response.json();
    return decision.shouldRoute;
  } catch (error) {
    console.error('External routing API failed:', error);
    return false; // 失败时使用默认路由
  }
};
```

## 函数组合

使用组合器创建复杂的路由逻辑。

### composeAnd - AND 逻辑

所有函数都必须返回 true。

```typescript
import { composeAnd, BuiltinRouters } from './core/routing';

// 工作时间 AND VIP 用户
const workingHoursVipRouter = composeAnd(
  (context) => {
    const hour = new Date().getHours();
    return hour >= 9 && hour <= 18;
  },
  (context) => context.metadata?.userTier === 'vip'
);

router.registerRouter('workingHoursVipRouter', workingHoursVipRouter);
```

### composeOr - OR 逻辑

任一函数返回 true 即可。

```typescript
import { composeOr } from './core/routing';

// VIP 用户 OR 企业用户
const premiumRouter = composeOr(
  (context) => context.metadata?.userTier === 'vip',
  (context) => context.metadata?.organization?.tier === 'enterprise'
);
```

### not - 取反

```typescript
import { not } from './core/routing';

// 非工作时间
const offHoursRouter = not((context) => {
  const hour = new Date().getHours();
  return hour >= 9 && hour <= 18;
});
```

### when - 条件分支

```typescript
import { when, BuiltinRouters } from './core/routing';

// 如果是 VIP 用户，使用健康路由；否则使用成本路由
const adaptiveRouter = when(
  (context) => context.metadata?.userTier === 'vip',
  BuiltinRouters.healthBasedRouter(0.95),
  BuiltinRouters.costOptimizedRouter('low')
);
```

### fallback - 回退链

```typescript
import { fallback, BuiltinRouters } from './core/routing';

// 依次尝试多个路由策略
const robustRouter = fallback(
  BuiltinRouters.capabilityRouter('function_calling'),
  BuiltinRouters.healthBasedRouter(0.95),
  BuiltinRouters.loadBalancedRouter(100),
  // 最后一个总是返回 true，作为兜底
  () => true
);
```

### 复杂组合示例

```typescript
import { composeAnd, composeOr, when, BuiltinRouters } from './core/routing';

// 高级路由策略：
// 1. 工作时间 AND (VIP 或企业用户)
// 2. 如果满足，使用健康路由
// 3. 否则使用成本优化路由
const advancedRouter = when(
  composeAnd(
    (context) => {
      const hour = new Date().getHours();
      return hour >= 9 && hour <= 18;
    },
    composeOr(
      (context) => context.metadata?.userTier === 'vip',
      (context) => context.metadata?.organization?.tier === 'enterprise'
    )
  ),
  BuiltinRouters.healthBasedRouter(0.95),
  BuiltinRouters.costOptimizedRouter('low')
);

router.registerRouter('advancedRouter', advancedRouter, {
  description: '高级自适应路由策略',
  version: '1.0.0',
});
```

## 测试路由函数

使用内置测试工具验证路由逻辑。

### 基本测试

```typescript
import { testRouter } from './core/routing';

const myRouter: CustomRouterFunction = (context) => {
  return context.metadata?.userTier === 'vip';
};

const testResults = await testRouter(myRouter, [
  {
    name: 'VIP user should match',
    context: {
      model: 'claude-3-opus',
      messages: [],
      metadata: { userTier: 'vip' },
    },
    expectedResult: true,
  },
  {
    name: 'Free user should not match',
    context: {
      model: 'claude-3-opus',
      messages: [],
      metadata: { userTier: 'free' },
    },
    expectedResult: false,
  },
]);

console.log(`Passed: ${testResults.passed}, Failed: ${testResults.failed}`);
console.log(testResults.results);
```

### 测试渠道选择

```typescript
const channels: Channel[] = [
  { id: '1', name: 'Premium', priority: 90, /* ... */ },
  { id: '2', name: 'Standard', priority: 50, /* ... */ },
];

const testResults = await testRouter(myRouter, [
  {
    name: 'Should select premium channel',
    context: {
      model: 'claude-3-opus',
      messages: [],
      metadata: { userTier: 'vip' },
    },
    availableChannels: channels,
    expectedResult: 'Premium', // 期望的渠道名称
  },
]);
```

### 集成测试套件

```typescript
// 创建测试套件
class RouterTestSuite {
  async runTests() {
    const results = [];

    // 测试时间路由
    results.push(await this.testTimeRouter());

    // 测试用户层级路由
    results.push(await this.testTierRouter());

    // 测试组合路由
    results.push(await this.testComposedRouter());

    return results;
  }

  async testTimeRouter() {
    const timeRouter = BuiltinRouters.timeBasedRouter([9, 10, 11]);

    // 模拟不同时间
    // 注意：实际测试中需要使用依赖注入或时间模拟库

    return await testRouter(timeRouter, [
      {
        name: 'Peak time',
        context: { model: 'test', messages: [] },
        // ... 测试用例
      },
    ]);
  }
}
```

## 最佳实践

### 1. 命名规范

使用描述性的名称：

```typescript
// 好
router.registerRouter('vipUsersPeakHoursRouter', ...);

// 不好
router.registerRouter('router1', ...);
```

### 2. 添加元数据

为路由函数提供完整的元数据：

```typescript
router.registerRouter('myRouter', routerFn, {
  description: '详细说明路由逻辑和使用场景',
  version: '1.0.0',
  author: 'Team Name',
});
```

### 3. 错误处理

始终处理异常情况：

```typescript
const safeRouter: CustomRouterFunction = async (context) => {
  try {
    // 路由逻辑
    const result = await someAsyncOperation();
    return result;
  } catch (error) {
    console.error('Router error:', error);
    return false; // 失败时返回 false
  }
};
```

### 4. 性能优化

避免在路由函数中执行昂贵的操作：

```typescript
// 好：使用缓存
const cache = new Map();

const optimizedRouter: CustomRouterFunction = (context) => {
  const cacheKey = context.sessionId;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const result = expensiveCalculation(context);
  cache.set(cacheKey, result);
  return result;
};

// 不好：每次都执行昂贵操作
const slowRouter: CustomRouterFunction = (context) => {
  return expensiveCalculation(context); // 太慢了！
};
```

### 5. 可测试性

设计易于测试的路由函数：

```typescript
// 好：依赖注入
const createTimeRouter = (getCurrentHour: () => number) => {
  return (context: RouterContext) => {
    const hour = getCurrentHour();
    return hour >= 9 && hour <= 18;
  };
};

// 测试时可以注入模拟函数
const testRouter = createTimeRouter(() => 10); // 总是返回 10 点

// 生产环境使用真实函数
const prodRouter = createTimeRouter(() => new Date().getHours());
```

### 6. 文档和注释

添加详细的注释：

```typescript
/**
 * 智能负载均衡路由器
 *
 * 功能：
 * - 根据渠道当前负载选择最空闲的渠道
 * - 考虑渠道健康度（成功率）
 * - 优先级作为次要因素
 *
 * 参数：
 * - maxLoad: 最大允许负载
 * - minHealthRate: 最低健康率
 *
 * 返回：
 * - 负载最低且健康的渠道
 * - 如果没有符合条件的渠道，返回 false
 */
const smartLoadBalancer = (
  maxLoad: number,
  minHealthRate: number
): CustomRouterFunction => {
  // 实现...
};
```

## API 参考

### CustomRouterFunction

```typescript
type CustomRouterFunction = (
  context: RouterContext,
  analysis?: ContentAnalysis,
  availableChannels?: Channel[]
) => boolean | Channel | Promise<boolean | Channel>;
```

### CustomRouterRegistry

#### register(name, fn, info?)

注册路由函数。

```typescript
registry.register('myRouter', routerFn, {
  description: '描述',
  version: '1.0.0',
  author: '作者',
});
```

#### get(name)

获取已注册的路由函数。

```typescript
const router = registry.get('myRouter');
```

#### list()

列出所有已注册的路由函数。

```typescript
const allRouters = registry.list();
```

#### has(name)

检查路由函数是否已注册。

```typescript
if (registry.has('myRouter')) {
  // ...
}
```

#### unregister(name)

注销路由函数。

```typescript
registry.unregister('myRouter');
```

### SmartRouter

#### registerRouter(name, fn, info?)

注册自定义路由函数。

```typescript
router.registerRouter('myRouter', routerFn, {
  description: '描述',
});
```

#### getRegistry()

获取路由器注册表。

```typescript
const registry = router.getRegistry();
```

#### listCustomRouters()

列出所有自定义路由器。

```typescript
const routers = router.listCustomRouters();
```

### 组合器

#### composeAnd(...routers)

AND 逻辑组合。

```typescript
const combined = composeAnd(router1, router2, router3);
```

#### composeOr(...routers)

OR 逻辑组合。

```typescript
const combined = composeOr(router1, router2);
```

#### not(router)

取反。

```typescript
const negated = not(router);
```

#### when(condition, thenRouter, elseRouter?)

条件分支。

```typescript
const conditional = when(
  (context) => context.metadata?.isVip,
  vipRouter,
  normalRouter
);
```

#### fallback(...routers)

回退链。

```typescript
const chain = fallback(router1, router2, router3);
```

### testRouter(router, testCases)

测试路由函数。

```typescript
const results = await testRouter(myRouter, [
  {
    name: '测试用例 1',
    context: { /* ... */ },
    analysis: { /* ... */ },
    availableChannels: [ /* ... */ ],
    expectedResult: true,
  },
]);

console.log(results.passed, results.failed);
console.log(results.results);
```

## 完整示例

### 生产环境路由配置

```typescript
import {
  SmartRouter,
  BuiltinRouters,
  composeAnd,
  composeOr,
  when,
  fallback,
} from './core/routing';

// 创建路由器
const router = new SmartRouter(rules);

// 1. VIP 用户高峰时段路由
const vipPeakRouter = composeAnd(
  (context) => context.metadata?.userTier === 'vip',
  BuiltinRouters.timeBasedRouter([9, 10, 11, 14, 15, 16, 17])
);

router.registerRouter('vipPeakRouter', vipPeakRouter, {
  description: 'VIP 用户在高峰时段使用高性能渠道',
});

// 2. 能力匹配路由（Function Calling）
router.registerRouter(
  'functionCallingRouter',
  BuiltinRouters.capabilityRouter('function_calling'),
  {
    description: 'Function Calling 请求自动路由到支持的模型',
  }
);

// 3. 成本优化路由
router.registerRouter(
  'costRouter',
  BuiltinRouters.costOptimizedRouter('medium'),
  {
    description: '根据请求复杂度自动优化成本',
  }
);

// 4. 健康路由（兜底）
router.registerRouter(
  'healthRouter',
  BuiltinRouters.healthBasedRouter(0.9),
  {
    description: '优先使用健康的渠道',
  }
);

// 5. A/B 测试
router.registerRouter(
  'abTestRouter',
  BuiltinRouters.abTestRouter('experimental-gpt4', 5),
  {
    description: '5% 流量测试新模型',
  }
);

// 在路由规则中使用
const routingRules = [
  {
    id: 'rule-vip-peak',
    name: 'VIP Peak Hours',
    condition: {
      customFunction: 'vipPeakRouter',
    },
    targetChannel: 'premium-channel',
    priority: 100,
    enabled: true,
  },
  {
    id: 'rule-function-calling',
    name: 'Function Calling Support',
    condition: {
      customFunction: 'functionCallingRouter',
    },
    priority: 95,
    enabled: true,
  },
  {
    id: 'rule-cost-optimization',
    name: 'Cost Optimization',
    condition: {
      customFunction: 'costRouter',
    },
    priority: 80,
    enabled: true,
  },
  {
    id: 'rule-ab-test',
    name: 'A/B Test',
    condition: {
      customFunction: 'abTestRouter',
    },
    priority: 70,
    enabled: true,
  },
];
```

## 故障排查

### 路由函数未被调用

检查：
1. 路由函数是否已正确注册
2. 路由规则中的 `customFunction` 名称是否匹配
3. 路由规则的优先级是否足够高
4. 路由规则是否已启用（`enabled: true`）

### 路由结果不符合预期

使用测试工具验证：

```typescript
const results = await testRouter(myRouter, [/* 测试用例 */]);
console.log(results.results);
```

### 性能问题

1. 避免在路由函数中执行耗时操作
2. 使用缓存
3. 简化路由逻辑
4. 减少异步操作

## 相关文档

- [Smart Router 基础](./smart-router.md)
- [Content-Based Routing](./content-based-routing.md)
- [路由规则配置](./routing-rules.md)
- [Transformer Pipeline](./transformer-pipeline.md)
