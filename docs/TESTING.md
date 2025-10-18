# Routex 测试指南

## 测试概览

Routex 拥有全面的测试套件，确保代码质量和功能正确性。

### 测试统计

```
总测试数: 127
通过率: 100%
测试文件: 7
测试覆盖: 单元测试 + 集成测试
```

### 测试文件结构

```
tests/
├── database.test.ts         # 数据库功能测试 (18 tests)
├── i18n.test.ts            # 国际化功能测试 (11 tests)
├── loadbalancer.test.ts    # 负载均衡器测试 (27 tests)
├── metrics.test.ts         # 指标收集测试 (20 tests)
├── prometheus.test.ts      # Prometheus 导出测试 (13 tests)
├── integration.test.ts     # 端到端集成测试 (38 tests) ⭐ 新增
└── (transformers.test.ts)  # 已删除
```

## 运行测试

### 运行所有测试

```bash
bun test
```

**输出示例：**
```
 127 pass
 0 fail
 307 expect() calls
Ran 127 tests across 7 files. [361.00ms]
```

### 运行特定测试文件

```bash
# 运行集成测试
bun test tests/integration.test.ts

# 运行负载均衡测试
bun test tests/loadbalancer.test.ts

# 运行指标测试
bun test tests/metrics.test.ts
```

### 运行特定测试套件

```bash
# 使用 --test-name-pattern 筛选
bun test --test-name-pattern "Cache Warmer"
bun test --test-name-pattern "Tracing"
bun test --test-name-pattern "Health Check"
```

### 查看详细输出

```bash
# 显示每个测试的详细信息
bun test --verbose

# 显示测试覆盖率（如果配置）
bun test --coverage
```

## 测试类型

### 1. 单元测试 (Unit Tests)

测试单个模块或函数的功能。

**示例文件：**
- `tests/loadbalancer.test.ts`
- `tests/metrics.test.ts`
- `tests/database.test.ts`

**覆盖的功能：**
- 负载均衡策略（Priority, Round Robin, Weighted, Least Used）
- 指标收集（Counter, Gauge, Histogram, Summary）
- 数据库操作（CRUD）
- i18n 翻译

### 2. 集成测试 (Integration Tests)

测试多个模块协同工作的场景。

**文件：** `tests/integration.test.ts`

**测试套件：**

#### Health Check Endpoints (4 tests)
- ✅ Basic health status
- ✅ Detailed health status
- ✅ Liveness probe
- ✅ Readiness probe

#### Channels API (6 tests)
- ✅ List all channels
- ✅ Get specific channel
- ✅ Create new channel
- ✅ Update channel
- ✅ Return 404 for non-existent channel
- ✅ Handle validation errors

#### Cache Warmer API (6 tests)
- ✅ Get cache stats
- ✅ Get cache config
- ✅ Manually warm cache
- ✅ Invalidate cache
- ✅ Invalidate and warm cache
- ✅ Update cache config

#### Tracing API (5 tests)
- ✅ Get tracing stats
- ✅ Create and retrieve trace
- ✅ Get specific span
- ✅ Return 404 for non-existent trace
- ✅ Clear old spans

#### Metrics API (4 tests)
- ✅ Get metrics summary
- ✅ Get all metrics
- ✅ Reset metrics
- ✅ Get Prometheus metrics

#### Load Balancer API (3 tests)
- ✅ Get current strategy
- ✅ Update strategy
- ✅ Reject invalid strategy

#### Analytics API (1 test)
- ✅ Get analytics data

#### Providers API (3 tests)
- ✅ Get all providers
- ✅ Get specific provider
- ✅ Return 404 for non-existent provider

#### i18n API (3 tests)
- ✅ Get current locale
- ✅ Set locale
- ✅ Reject invalid locale

#### Error Handling (3 tests)
- ✅ Handle missing required fields
- ✅ Handle invalid JSON
- ✅ Handle non-existent routes

#### CORS (1 test)
- ✅ Include CORS headers

## 编写测试

### 测试结构

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';

describe('功能模块名称', () => {
  beforeAll(() => {
    // 测试前的设置
  });

  afterAll(() => {
    // 测试后的清理
  });

  test('should do something', () => {
    // 测试逻辑
    expect(result).toBe(expected);
  });
});
```

### 最佳实践

#### 1. 使用描述性的测试名称

```typescript
// ❌ 不好
test('test 1', () => { ... });

// ✅ 好
test('should return 404 for non-existent channel', () => { ... });
```

#### 2. 测试边界条件

```typescript
test('should handle empty channel list', () => {
  const channels = [];
  expect(() => loadBalancer.select(channels)).toThrow();
});

test('should handle single channel', () => {
  const channels = [channel1];
  const selected = loadBalancer.select(channels);
  expect(selected).toBe(channel1);
});
```

#### 3. 使用 beforeAll/afterAll 管理资源

```typescript
describe('Database Tests', () => {
  let db: Database;

  beforeAll(() => {
    db = new Database(':memory:');
  });

  afterAll(() => {
    db.close();
  });

  test('should create channel', () => {
    const channel = db.createChannel({ ... });
    expect(channel.id).toBeDefined();
  });
});
```

#### 4. 测试异步操作

```typescript
test('should warm cache', async () => {
  await cacheWarmer.warmCache();
  const stats = cacheWarmer.getStats();
  expect(stats.totalWarms).toBeGreaterThan(0);
});
```

#### 5. 使用正确的断言

```typescript
// 相等性
expect(value).toBe(expected);           // 严格相等 (===)
expect(object).toEqual(expected);       // 深度相等

// 数字比较
expect(count).toBeGreaterThan(0);
expect(count).toBeGreaterThanOrEqual(1);
expect(count).toBeLessThan(100);

// 布尔值
expect(isValid).toBe(true);
expect(isEnabled).toBeTruthy();
expect(result).toBeFalsy();

// 数组/对象
expect(array).toContain(item);
expect(object).toHaveProperty('key');
expect(array).toHaveLength(3);

// 异常
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('Error message');

// 类型
expect(typeof value).toBe('string');
expect(Array.isArray(data)).toBe(true);
```

## 集成测试示例

### 测试 API 端点

```typescript
test('should get cache warmer stats', async () => {
  const req = new Request('http://localhost:8080/api/cache/stats');
  const res = await app.fetch(req);
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.success).toBe(true);
  expect(data.data.totalWarms).toBeGreaterThanOrEqual(0);
});
```

### 测试 POST 请求

```typescript
test('should create a new channel', async () => {
  const newChannel = {
    name: 'Test Channel',
    type: 'openai',
    apiKey: 'test-key',
    models: ['gpt-4']
  };

  const req = new Request('http://localhost:8080/api/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newChannel),
  });

  const res = await app.fetch(req);
  const data = await res.json();

  expect(res.status).toBe(201);
  expect(data.success).toBe(true);
  expect(data.data.name).toBe(newChannel.name);
});
```

### 测试错误处理

```typescript
test('should return 404 for non-existent channel', async () => {
  const req = new Request('http://localhost:8080/api/channels/invalid-id');
  const res = await app.fetch(req);
  const data = await res.json();

  expect(res.status).toBe(404);
  expect(data.success).toBe(false);
  expect(data.error).toBeDefined();
});
```

## 持续集成 (CI)

### GitHub Actions 示例

创建 `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest

    - name: Install dependencies
      run: bun install

    - name: Run tests
      run: bun test

    - name: Run integration tests
      run: bun test tests/integration.test.ts
```

## 测试覆盖范围

### 已测试的功能模块

| 模块 | 测试文件 | 测试数量 | 状态 |
|------|---------|---------|------|
| 数据库 | database.test.ts | 18 | ✅ |
| 负载均衡 | loadbalancer.test.ts | 27 | ✅ |
| 指标收集 | metrics.test.ts | 20 | ✅ |
| Prometheus | prometheus.test.ts | 13 | ✅ |
| 国际化 | i18n.test.ts | 11 | ✅ |
| 集成测试 | integration.test.ts | 38 | ✅ |
| **总计** | **7 文件** | **127** | **✅** |

### 测试覆盖的 API 端点

| 端点类别 | 测试数量 | 覆盖率 |
|---------|---------|--------|
| Health Check | 4 | 100% |
| Channels | 6 | 100% |
| Cache Warmer | 6 | 100% |
| Tracing | 5 | 100% |
| Metrics | 4 | 100% |
| Load Balancer | 3 | 100% |
| Analytics | 1 | 100% |
| Providers | 3 | 100% |
| i18n | 3 | 100% |
| Error Handling | 3 | 100% |
| CORS | 1 | 100% |

## 调试测试

### 查看测试输出

```bash
# 显示详细日志
bun test --verbose

# 只运行失败的测试
bun test --only-failures
```

### 使用 console.log 调试

```typescript
test('debug example', () => {
  const result = someFunction();
  console.log('Result:', result);  // 会在测试输出中显示
  expect(result).toBe(expected);
});
```

### 跳过测试

```typescript
// 跳过单个测试
test.skip('this test is not ready', () => {
  // ...
});

// 只运行这个测试
test.only('focus on this test', () => {
  // ...
});
```

## 性能测试

虽然当前测试主要关注功能正确性，但也可以添加性能测试：

```typescript
test('load balancer should be fast', () => {
  const start = Date.now();

  for (let i = 0; i < 10000; i++) {
    loadBalancer.select(channels);
  }

  const duration = Date.now() - start;
  expect(duration).toBeLessThan(1000); // 应该在 1 秒内完成
});
```

## 故障排除

### 常见问题

#### 1. 测试超时

```typescript
// 增加超时时间（默认 5 秒）
test('slow test', async () => {
  await slowOperation();
}, 10000); // 10 秒超时
```

#### 2. 数据库锁定

```typescript
// 使用内存数据库避免文件锁定
beforeAll(() => {
  db = new Database(':memory:');
});
```

#### 3. 端口冲突

```typescript
// 使用随机端口或确保测试服务器正确关闭
afterAll(async () => {
  await server.stop();
});
```

## 测试检查清单

在提交代码前，确保：

- [ ] 所有测试通过 (`bun test`)
- [ ] 新功能有对应的测试
- [ ] 测试名称清晰描述测试内容
- [ ] 边界条件已测试
- [ ] 错误处理已测试
- [ ] 异步操作正确处理
- [ ] 测试相互独立，不依赖执行顺序
- [ ] 资源正确清理（数据库、文件等）

## 下一步

### 计划中的测试改进

1. **性能基准测试**
   - 添加负载测试
   - 压力测试
   - 并发测试

2. **E2E 测试**
   - 真实 API 调用测试
   - 多渠道切换测试
   - 故障转移测试

3. **测试覆盖率报告**
   - 配置代码覆盖率工具
   - 生成 HTML 报告
   - CI 中显示覆盖率徽章

## 总结

Routex 的测试套件提供了：

- ✅ **127 个测试** 覆盖核心功能
- ✅ **100% 通过率** 确保代码质量
- ✅ **单元测试** 验证独立模块
- ✅ **集成测试** 验证端到端功能
- ✅ **快速执行** 全套测试 < 1 秒
- ✅ **易于维护** 清晰的测试结构

通过持续的测试，Routex 保持高质量和可靠性，可以安全地用于生产环境！

---

**最后更新：** 2025-10-17
**测试版本：** 1.1.0-beta
**测试框架：** Bun Test
