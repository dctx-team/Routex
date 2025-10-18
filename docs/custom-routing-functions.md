# 

Routex 

## 📖 

- (#)
- (#)
- (#)
- (#)
- (#)
- (#)
- (#)
- [API ](#api-)

## 

### 

- **** TypeScript 
- ****8 
- **** ANDORNOT 
- ****
- ****
- ****

## 

### 1. 

```typescript
import { SmartRouter, BuiltinRouters } from './core/routing';

const router = new SmartRouter(rules);

// 
router.registerRouter(
  'offPeakRouter',
  BuiltinRouters.timeBasedRouter([9, 10, 11, 14, 15, 16, 17]),
  {
    description: '',
    version: '1.0.0'
  }
);
```

### 2. 

```json
{
  id: rule-time-based,
  name: Time-Based Routing,
  condition: {
    customFunction: offPeakRouter
  },
  targetChannel: cost-effective-channel,
  priority: 75,
  enabled: true
}
```

### 3. 

```typescript
// 
const vipRouter: CustomRouterFunction = (context, analysis, availableChannels) => {
  //  VIP 
  const isVip = context.metadata?.userTier === 'vip';

  if (!isVip) {
    return false; // 
  }

  // VIP 
  if (availableChannels && availableChannels.length > 0) {
    const bestChannel = availableChannels
      .sort((a, b) => b.priority - a.priority)[0];
    return bestChannel;
  }

  return true;
};

// 
router.registerRouter('vipRouter', vipRouter, {
  description: 'VIP ',
});
```

## 

Routex  8 

### 1. timeBasedRouter
****
****

```typescript
// 9-1114-17
const timeRouter = BuiltinRouters.timeBasedRouter([9, 10, 11, 14, 15, 16, 17]);

router.registerRouter('timeRouter', timeRouter);
```

****

```json
{
  condition: {
    customFunction: timeRouter
  },
  targetChannel: premium-channel,
  priority: 85
}
```

### 2. userTierRouter
VIPProFree

****
****

```typescript
//  metadata  userTier 
const tierRouter = BuiltinRouters.userTierRouter('userTier');

router.registerRouter('tierRouter', tierRouter);
```

****

```typescript
{
  metadata: {
    userTier: 'premium' | 'pro' | 'free'
  }
}
```

### 3. costOptimizedRouter
****
****

```typescript
// 
const costRouter = BuiltinRouters.costOptimizedRouter('medium');

router.registerRouter('costRouter', costRouter);
```

****
- `low`: < 100 
- `medium`: 
- `high`: > 1000 

### 4. healthBasedRouter
****
****

```typescript
//  95%
const healthRouter = BuiltinRouters.healthBasedRouter(0.95);

router.registerRouter('healthRouter', healthRouter);
```

### 5. loadBalancedRouter
****
****

```typescript
//  100 
const loadRouter = BuiltinRouters.loadBalancedRouter(100);

router.registerRouter('loadRouter', loadRouter);
```

### 6. capabilityRouter
****
- Function Calling 
-  vision
****

```typescript
// Function Calling 
const fcRouter = BuiltinRouters.capabilityRouter('function_calling');

// Vision 
const visionRouter = BuiltinRouters.capabilityRouter('vision');

// 
const longContextRouter = BuiltinRouters.capabilityRouter('long_context');

// 
const codeRouter = BuiltinRouters.capabilityRouter('code_generation');
```

****
- `function_calling`: Function Calling 
- `vision`: 
- `long_context`: > 50k tokens
- `code_generation`: 

### 7. abTestRouter - A/B 

****
-
****

```typescript
// 10% 
const abRouter = BuiltinRouters.abTestRouter('experimental-channel', 10);

router.registerRouter('abRouter', abRouter);
```

****
-  sessionId 
- 0-100

## 

### 

```typescript
type CustomRouterFunction = (
  context: RouterContext,
  analysis?: ContentAnalysis,
  availableChannels?: Channel
) => boolean | Channel | Promise<boolean | Channel>;
```

### 

- `true`: 
- `false`: 
- `Channel`: 

###  1

```typescript
const workingHoursRouter: CustomRouterFunction =  => {
  const hour = new Date.getHours;
  // 9-18
  return hour >= 9 && hour <= 18;
};
```

###  2

```typescript
const enterpriseRouter: CustomRouterFunction = (context) => {
  const org = context.metadata?.organization;

  // 
  return org?.tier === 'enterprise' && org?.activeSubscription === true;
};
```

###  3

```typescript
const complexTaskRouter: CustomRouterFunction = (context, analysis) => {
  if (!analysis) return false;

  // 
  return (
    analysis.category === 'coding' &&
    analysis.complexity === 'very_complex' &&
    analysis.wordCount > 500
  );
};
```

###  4

```typescript
const smartChannelSelector: CustomRouterFunction = (
  context,
  analysis,
  availableChannels
) => {
  if (!availableChannels || availableChannels.length === 0) {
    return false;
  }

  // 
  const scores = availableChannels.map(channel => {
    let score = 0;

    // 
    const successRate = channel.successCount / (channel.requestCount || 1);
    score += successRate * 40;

    // 
    const loadScore = Math.max(0, 100 - channel.requestCount);
    score += loadScore * 30;

    // 
    score += channel.priority * 0.3;

    return { channel, score };
  });

  // 
  const best = scores.sort((a, b) => b.score - a.score)[0];
  return best.channel;
};
```

###  5

```typescript
const externalApiRouter: CustomRouterFunction = async (context) => {
  //  API 
  try {
    const response = await fetch('https://api.example.com/routing-decision', {
      method: 'POST',
      body: JSON.stringify({
        userId: context.metadata?.userId,
        model: context.model,
      }),
    });

    const decision = await response.json;
    return decision.shouldRoute;
  } catch (error) {
    console.error('External routing API failed:', error);
    return false; // 
  }
};
```

## 

### composeAnd - AND 

 true

```typescript
import { composeAnd, BuiltinRouters } from './core/routing';

//  AND VIP 
const workingHoursVipRouter = composeAnd(
  (context) => {
    const hour = new Date.getHours;
    return hour >= 9 && hour <= 18;
  },
  (context) => context.metadata?.userTier === 'vip'
);

router.registerRouter('workingHoursVipRouter', workingHoursVipRouter);
```

### composeOr - OR 

 true 

```typescript
import { composeOr } from './core/routing';

// VIP  OR 
const premiumRouter = composeOr(
  (context) => context.metadata?.userTier === 'vip',
  (context) => context.metadata?.organization?.tier === 'enterprise'
);
```

### not
```typescript
import { not } from './core/routing';

// 
const offHoursRouter = not((context) => {
  const hour = new Date.getHours;
  return hour >= 9 && hour <= 18;
});
```

### when
```typescript
import { when, BuiltinRouters } from './core/routing';

//  VIP 
const adaptiveRouter = when(
  (context) => context.metadata?.userTier === 'vip',
  BuiltinRouters.healthBasedRouter(0.95),
  BuiltinRouters.costOptimizedRouter('low')
);
```

### fallback
```typescript
import { fallback, BuiltinRouters } from './core/routing';

// 
const robustRouter = fallback(
  BuiltinRouters.capabilityRouter('function_calling'),
  BuiltinRouters.healthBasedRouter(0.95),
  BuiltinRouters.loadBalancedRouter(100),
  //  true
   => true
);
```

### 

```typescript
import { composeAnd, composeOr, when, BuiltinRouters } from './core/routing';

// 
// 1.  AND (VIP )
// 2. 
// 3. 
const advancedRouter = when(
  composeAnd(
    (context) => {
      const hour = new Date.getHours;
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
  description: '',
  version: '1.0.0',
});
```

## 

### 

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
      messages: ,
      metadata: { userTier: 'vip' },
    },
    expectedResult: true,
  },
  {
    name: 'Free user should not match',
    context: {
      model: 'claude-3-opus',
      messages: ,
      metadata: { userTier: 'free' },
    },
    expectedResult: false,
  },
]);

console.log(`Passed: ${testResults.passed}, Failed: ${testResults.failed}`);
console.log(testResults.results);
```

### 

```typescript
const channels: Channel = [
  { id: '1', name: 'Premium', priority: 90, /* ... */ },
  { id: '2', name: 'Standard', priority: 50, /* ... */ },
];

const testResults = await testRouter(myRouter, [
  {
    name: 'Should select premium channel',
    context: {
      model: 'claude-3-opus',
      messages: ,
      metadata: { userTier: 'vip' },
    },
    availableChannels: channels,
    expectedResult: 'Premium', // 
  },
]);
```

### 

```typescript
// 
class RouterTestSuite {
  async runTests {
    const results = ;

    // 
    results.push(await this.testTimeRouter);

    // 
    results.push(await this.testTierRouter);

    // 
    results.push(await this.testComposedRouter);

    return results;
  }

  async testTimeRouter {
    const timeRouter = BuiltinRouters.timeBasedRouter([9, 10, 11]);

    // 
    // 

    return await testRouter(timeRouter, [
      {
        name: 'Peak time',
        context: { model: 'test', messages:  },
        // ... 
      },
    ]);
  }
}
```

## 

### 1. 

```typescript
// 
router.registerRouter('vipUsersPeakHoursRouter', ...);

// 
router.registerRouter('router1', ...);
```

### 2. 

```typescript
router.registerRouter('myRouter', routerFn, {
  description: '',
  version: '1.0.0',
  author: 'Team Name',
});
```

### 3. 

```typescript
const safeRouter: CustomRouterFunction = async (context) => {
  try {
    // 
    const result = await someAsyncOperation;
    return result;
  } catch (error) {
    console.error('Router error:', error);
    return false; //  false
  }
};
```

### 4. 

```typescript
// 
const cache = new Map;

const optimizedRouter: CustomRouterFunction = (context) => {
  const cacheKey = context.sessionId;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const result = expensiveCalculation(context);
  cache.set(cacheKey, result);
  return result;
};

// 
const slowRouter: CustomRouterFunction = (context) => {
  return expensiveCalculation(context); // 
};
```

### 5. 

```typescript
// 
const createTimeRouter = (getCurrentHour:  => number) => {
  return (context: RouterContext) => {
    const hour = getCurrentHour;
    return hour >= 9 && hour <= 18;
  };
};

// 
const testRouter = createTimeRouter( => 10); //  10 

// 
const prodRouter = createTimeRouter( => new Date.getHours);
```

### 6. 

```typescript
/**
 * 
 *
 * 
 *
 *
 *
 *
 * 
 * - maxLoad: 
 * - minHealthRate: 
 *
 * 
 *
 * -  false
 */
const smartLoadBalancer = (
  maxLoad: number,
  minHealthRate: number
): CustomRouterFunction => {
  // ...
};
```

## API 

### CustomRouterFunction

```typescript
type CustomRouterFunction = (
  context: RouterContext,
  analysis?: ContentAnalysis,
  availableChannels?: Channel
) => boolean | Channel | Promise<boolean | Channel>;
```

### CustomRouterRegistry

#### register(name, fn, info?)

```typescript
registry.register('myRouter', routerFn, {
  description: '',
  version: '1.0.0',
  author: '',
});
```

#### get(name)

```typescript
const router = registry.get('myRouter');
```

#### list

```typescript
const allRouters = registry.list;
```

#### has(name)

```typescript
if (registry.has('myRouter')) {
  // ...
}
```

#### unregister(name)

```typescript
registry.unregister('myRouter');
```

### SmartRouter

#### registerRouter(name, fn, info?)

```typescript
router.registerRouter('myRouter', routerFn, {
  description: '',
});
```

#### getRegistry

```typescript
const registry = router.getRegistry;
```

#### listCustomRouters

```typescript
const routers = router.listCustomRouters;
```

### 

#### composeAnd(...routers)

AND 

```typescript
const combined = composeAnd(router1, router2, router3);
```

#### composeOr(...routers)

OR 

```typescript
const combined = composeOr(router1, router2);
```

#### not(router)

```typescript
const negated = not(router);
```

#### when(condition, thenRouter, elseRouter?)

```typescript
const conditional = when(
  (context) => context.metadata?.isVip,
  vipRouter,
  normalRouter
);
```

#### fallback(...routers)

```typescript
const chain = fallback(router1, router2, router3);
```

### testRouter(router, testCases)

```typescript
const results = await testRouter(myRouter, [
  {
    name: ' 1',
    context: { /* ... */ },
    analysis: { /* ... */ },
    availableChannels: [ /* ... */ ],
    expectedResult: true,
  },
]);

console.log(results.passed, results.failed);
console.log(results.results);
```

## 

### 

```typescript
import {
  SmartRouter,
  BuiltinRouters,
  composeAnd,
  composeOr,
  when,
  fallback,
} from './core/routing';

// 
const router = new SmartRouter(rules);

// 1. VIP 
const vipPeakRouter = composeAnd(
  (context) => context.metadata?.userTier === 'vip',
  BuiltinRouters.timeBasedRouter([9, 10, 11, 14, 15, 16, 17])
);

router.registerRouter('vipPeakRouter', vipPeakRouter, {
  description: 'VIP ',
});

// 2. Function Calling
router.registerRouter(
  'functionCallingRouter',
  BuiltinRouters.capabilityRouter('function_calling'),
  {
    description: 'Function Calling ',
  }
);

// 3. 
router.registerRouter(
  'costRouter',
  BuiltinRouters.costOptimizedRouter('medium'),
  {
    description: '',
  }
);

// 4. 
router.registerRouter(
  'healthRouter',
  BuiltinRouters.healthBasedRouter(0.9),
  {
    description: '',
  }
);

// 5. A/B 
router.registerRouter(
  'abTestRouter',
  BuiltinRouters.abTestRouter('experimental-gpt4', 5),
  {
    description: '5% ',
  }
);

// 
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

## 

### 

1. 
2.  `customFunction` 
3. 
4. `enabled: true`

### 

```typescript
const results = await testRouter(myRouter, [/*  */]);
console.log(results.results);
```

### 

1. 
2. 
3. 
4. 

## 

- [Smart Router ](./smart-router.md)
- [Content-Based Routing](./content-based-routing.md)
- (./routing-rules.md)
- [Transformer Pipeline](./transformer-pipeline.md)
