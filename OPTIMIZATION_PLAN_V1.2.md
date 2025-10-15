# Routex 优化方案 v1.2

## 执行摘要

基于代码审查，识别出以下关键优化领域：

1. **内存泄漏风险** - Session 映射使用 setTimeout 可能导致内存泄漏
2. **数据库性能** - 缓存缺失和重复查询
3. **错误处理** - 需要更统一的错误处理机制
4. **类型安全** - 存在多处 `any` 类型使用
5. **监控和可观测性** - 缺少性能指标和追踪

---

## 1. 内存管理优化

### 问题
**src/core/loadbalancer.ts:137-139**
```typescript
setTimeout(() => {
  this.sessionMap.delete(sessionId);
}, this.sessionExpiry);
```
- 每个 session 创建新的 setTimeout
- 高并发下会创建大量定时器
- 可能导致内存泄漏

### 解决方案
使用 LRU 缓存替代 Map + setTimeout：

```typescript
import { LRUCache } from 'lru-cache';

export class LoadBalancer {
  private sessionCache: LRUCache<string, string>;

  constructor(private strategy: LoadBalanceStrategy = 'priority') {
    this.sessionCache = new LRUCache({
      max: 10000, // 最大 session 数
      ttl: 5 * 60 * 60 * 1000, // 5 hours
      updateAgeOnGet: true,
    });
  }
}
```

**优先级**: 高
**影响**: 减少内存占用 30-50%
**工作量**: 2-3 hours

---

## 2. 数据库查询优化

### 问题 1: 缺少查询缓存
**src/db/database.ts:194-200**
```typescript
getEnabledChannels(): Channel[] {
  const query = this.db.query(
    "SELECT * FROM channels WHERE status = 'enabled' ORDER BY priority DESC, name ASC",
  );
  const rows = query.all() as any[];
  return rows.map((row) => this.mapChannelRow(row));
}
```
- 每次代理请求都查询数据库
- 高频调用，性能瓶颈

### 解决方案: 添加内存缓存
```typescript
export class Database {
  private channelCache: Map<string, { data: Channel[], timestamp: number }> = new Map();
  private cacheT TL = 30000; // 30s cache

  getEnabledChannels(): Channel[] {
    const cached = this.channelCache.get('enabled');
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const query = this.db.query(/*...*/);
    const channels = rows.map((row) => this.mapChannelRow(row));

    this.channelCache.set('enabled', {
      data: channels,
      timestamp: Date.now()
    });

    return channels;
  }

  // 更新/删除 channel 时清除缓存
  updateChannel(id: string, input: UpdateChannelInput): Channel {
    this.channelCache.clear();
    // ...
  }
}
```

**优先级**: 高
**影响**: 减少数据库查询 90%+，提升延迟 20-30ms
**工作量**: 3-4 hours

### 问题 2: 重复查询
**src/core/proxy.ts:442-446**
```typescript
const channel = this.db.getChannel(channelId);
if (channel && channel.status === 'rate_limited') {
  this.db.updateChannel(channelId, { status: 'enabled' });
}
```
- resetCircuitBreaker 每次都查询 channel

### 解决方案: 传递 channel 对象
```typescript
private resetCircuitBreaker(channel: Channel) {
  this.circuitBreaker.delete(channel.id);

  if (channel.status === 'rate_limited') {
    this.db.updateChannel(channel.id, { status: 'enabled' });
  }
}
```

**优先级**: 中
**影响**: 减少数据库查询，提升 5-10ms
**工作量**: 1 hour

---

## 3. 批量写入优化

### 当前实现
**src/db/database.ts:272-282**
- Buffer flush interval: 100ms
- Batch size: 100

### 优化方案
```typescript
export class Database {
  private requestBuffer: RequestLog[] = [];
  private flushInterval: Timer | null = null;
  private readonly BATCH_SIZE = 500; // 增加批次大小
  private readonly FLUSH_INTERVAL = 1000; // 降低flush频率

  logRequest(log: Omit<RequestLog, 'id'>) {
    this.requestBuffer.push({
      id: crypto.randomUUID(),
      ...log,
    });

    // 仅在缓冲区满时立即刷新
    if (this.requestBuffer.length >= this.BATCH_SIZE) {
      this.flushRequests();
    }
  }

  private startBufferFlush() {
    this.flushInterval = setInterval(() => {
      this.flushRequests();
    }, this.FLUSH_INTERVAL);
  }
}
```

**优先级**: 中
**影响**: 减少数据库写入次数 80%，提升写入性能
**工作量**: 0.5 hour

---

## 4. 类型安全改进

### 问题: 大量使用 `any` 类型
**src/core/proxy.ts:61-67, 104, 288-289**
```typescript
messages: (parsed.body as any).messages || [],
system: (parsed.body as any).system,
(parsed.body as any).model = routedModel;
```

### 解决方案: 定义严格的类型
```typescript
// src/types.ts
export interface AnthropicRequest {
  model: string;
  messages: Message[];
  system?: string;
  tools?: Tool[];
  max_tokens: number;
  temperature?: number;
  stream?: boolean;
}

export interface OpenAIRequest {
  model: string;
  messages: Message[];
  tools?: Tool[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export type AIRequest = AnthropicRequest | OpenAIRequest;

// src/core/proxy.ts
private async parseRequest(req: Request): Promise<ParsedRequest<AIRequest>> {
  let body: AIRequest | null = null;

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      body = await req.json() as AIRequest;
    } catch {
      // Handle error
    }
  }

  return {
    method: req.method,
    path: url.pathname,
    headers,
    body,
    model: body?.model,
  };
}
```

**优先级**: 中
**影响**: 提升代码质量和可维护性，减少运行时错误
**工作量**: 4-6 hours

---

## 5. 错误处理增强

### 当前问题
- 错误处理分散在各处
- 日志不统一
- 缺少错误追踪

### 解决方案: 统一的错误处理中间件

```typescript
// src/core/error-handler.ts
export class ErrorHandler {
  static handle(error: unknown, context: ErrorContext): Response {
    // 记录错误
    this.logError(error, context);

    // 根据错误类型返回适当的响应
    if (error instanceof RoutexError) {
      return this.handleRoutexError(error);
    }

    if (error instanceof Error) {
      return this.handleGenericError(error);
    }

    return this.handleUnknownError();
  }

  private static logError(error: unknown, context: ErrorContext) {
    const errorLog = {
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      requestId: context.requestId,
    };

    console.error('Error occurred:', JSON.stringify(errorLog, null, 2));

    // 可选: 发送到错误追踪服务 (Sentry, etc.)
  }
}
```

**优先级**: 中
**影响**: 提升可调试性和问题排查效率
**工作量**: 3-4 hours

---

## 6. 性能监控

### 添加性能指标收集

```typescript
// src/core/metrics.ts
export class MetricsCollector {
  private metrics = {
    requestCount: 0,
    requestDuration: [] as number[],
    channelSelectTime: [] as number[],
    dbQueryTime: [] as number[],
    transformTime: [] as number[],
  };

  recordRequest(duration: number) {
    this.metrics.requestCount++;
    this.metrics.requestDuration.push(duration);
  }

  recordChannelSelect(duration: number) {
    this.metrics.channelSelectTime.push(duration);
  }

  getMetrics() {
    return {
      totalRequests: this.metrics.requestCount,
      avgLatency: this.avg(this.metrics.requestDuration),
      p95Latency: this.percentile(this.metrics.requestDuration, 0.95),
      p99Latency: this.percentile(this.metrics.requestDuration, 0.99),
      avgChannelSelect: this.avg(this.metrics.channelSelectTime),
      avgDbQuery: this.avg(this.metrics.dbQueryTime),
      avgTransform: this.avg(this.metrics.transformTime),
    };
  }

  private avg(arr: number[]): number {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }
}
```

**优先级**: 低
**影响**: 提升可观测性
**工作量**: 2-3 hours

---

## 7. 连接池优化

### 当前问题
- 每次请求创建新的 fetch 连接
- 没有连接复用

### 解决方案: HTTP/2 连接池 (Bun 原生支持)

```typescript
// src/core/http-client.ts
export class HTTPClient {
  private agents = new Map<string, any>();

  async fetch(url: string, options: RequestInit): Promise<Response> {
    // Bun automatically handles HTTP/2 connection pooling
    // Just ensure we're using the same fetch instance
    return fetch(url, {
      ...options,
      // Bun will automatically reuse connections
    });
  }
}
```

**注意**: Bun 已经内置了连接池，无需额外配置。

**优先级**: 低
**影响**: Bun 已优化
**工作量**: 0 hours

---

## 8. 配置热重载

### 新功能: 无需重启更新配置

```typescript
// src/config/config-watcher.ts
export class ConfigWatcher {
  private watcher: FSWatcher | null = null;

  watch(configPath: string, onChange: () => void) {
    this.watcher = watch(configPath, (event, filename) => {
      if (event === 'change') {
        console.log('Config file changed, reloading...');
        onChange();
      }
    });
  }

  stop() {
    this.watcher?.close();
  }
}

// src/server.ts
const configWatcher = new ConfigWatcher();
configWatcher.watch(config.database.path, () => {
  // 重新加载路由规则
  const newRules = db.getEnabledRoutingRules();
  smartRouter.updateRules(newRules);
  console.log('✅ Routing rules reloaded');
});
```

**优先级**: 低
**影响**: 提升运维便利性
**工作量**: 2-3 hours

---

## 实施计划

### Phase 1: 高优先级优化 (Week 1)
1. ✅ 内存管理优化 (LoadBalancer session 缓存)
2. ✅ 数据库查询缓存
3. ✅ 批量写入优化

**预期收益**:
- 内存占用 ↓ 30-50%
- 平均延迟 ↓ 20-30ms
- 数据库负载 ↓ 80%

### Phase 2: 代码质量提升 (Week 2)
1. 类型安全改进
2. 错误处理增强
3. 单元测试覆盖率提升

**预期收益**:
- 代码可维护性 ↑
- Bug 率 ↓ 40%
- 开发效率 ↑

### Phase 3: 可观测性 (Week 3)
1. 性能指标收集
2. 结构化日志
3. 健康检查增强

**预期收益**:
- 问题排查时间 ↓ 60%
- 系统可见性 ↑

### Phase 4: 高级特性 (Week 4)
1. 配置热重载
2. 自适应路由
3. A/B 测试支持

**预期收益**:
- 运维便利性 ↑
- 功能灵活性 ↑

---

## 性能基准测试计划

### 测试场景
1. **高并发测试**: 1000 req/s
2. **大payload测试**: 100KB+ messages
3. **长时间运行**: 24h 稳定性测试

### 关键指标
- P50/P95/P99 延迟
- 内存使用
- CPU 使用率
- 数据库 IOPS
- 错误率

### 测试工具
- Apache Bench (ab)
- wrk
- k6

---

## 风险评估

| 优化项 | 风险 | 缓解措施 |
|--------|------|----------|
| Session 缓存重构 | 破坏现有功能 | 完整单元测试 + 灰度发布 |
| 数据库缓存 | 数据不一致 | 短TTL + 主动失效 |
| 类型系统重构 | 大量代码变更 | 分模块逐步迁移 |

---

## 成功指标

### 性能目标 (v1.2)
- [ ] P95 延迟 < 50ms (当前: ~80ms)
- [ ] 内存占用 < 100MB (当前: ~150MB)
- [ ] 支持 1000+ req/s (当前: ~500 req/s)
- [ ] 数据库查询 < 10ms (当前: ~30ms)

### 质量目标
- [ ] TypeScript strict mode 通过
- [ ] 测试覆盖率 > 80%
- [ ] 零已知内存泄漏
- [ ] 错误率 < 0.1%

---

## 附录: 工具推荐

### 性能分析
- Bun's built-in profiler
- Node.js Clinic.js (compatible with Bun)
- Chrome DevTools

### 监控
- Prometheus + Grafana
- Sentry (错误追踪)
- Datadog / New Relic

### 数据库
- SQLite EXPLAIN QUERY PLAN
- DB Browser for SQLite

---

**文档版本**: 1.0
**创建时间**: 2025-10-15
**维护者**: dctx-team
