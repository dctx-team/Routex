# Distributed Tracing Implementation
# 分布式追踪实现

## Overview / 概述

Routex now includes a full-featured distributed tracing system that allows you to track the complete lifecycle of each request through the proxy. This feature is essential for performance analysis, debugging, and understanding system behavior in production.

Routex 现已包含完整的分布式追踪系统，允许您跟踪通过代理的每个请求的完整生命周期。此功能对于性能分析、调试和理解生产环境中的系统行为至关重要。

## Features / 特性

### 1. Request Lifecycle Tracking / 请求生命周期追踪

Every request through the proxy is automatically traced with multiple spans:
每个通过代理的请求都会自动追踪多个 Spans：

- **proxy.handle** - Root span covering the entire request / 覆盖整个请求的根 Span
- **proxy.parseRequest** - Request parsing phase / 请求解析阶段
- **proxy.routing** - Routing decision phase / 路由决策阶段
- **proxy.forward** - Forwarding to upstream API / 转发到上游 API

### 2. W3C Trace Context Compatible / W3C 追踪上下文兼容

The tracing system supports multiple trace context formats:
追踪系统支持多种追踪上下文格式：

- Custom headers: `X-Trace-Id`, `X-Span-Id`, `X-Parent-Span-Id`
- W3C Trace Context: `traceparent` header
- Automatic trace ID generation if not provided / 如果未提供则自动生成追踪 ID

### 3. Span Hierarchy / Span 层级结构

Spans are organized in a parent-child hierarchy, allowing you to understand the exact sequence and nesting of operations:
Spans 以父子层级结构组织，让您了解操作的确切顺序和嵌套关系：

```
proxy.handle (1964ms)
├── proxy.parseRequest (1ms)
├── proxy.routing (5ms)
│   └── LoadBalancer selected "Test Channel"
└── proxy.forward (1954ms)
    └── API call to upstream provider
```

### 4. Performance Metrics / 性能指标

Each span tracks:
每个 Span 追踪：

- **Start time** / 开始时间
- **End time** / 结束时间
- **Duration** / 持续时间
- **Status** (pending, success, error) / 状态
- **Tags** (custom metadata) / 标签（自定义元数据）
- **Logs** (timestamped log messages) / 日志（带时间戳的日志消息）

### 5. Memory Management / 内存管理

- Automatic cleanup of old spans (default 1 hour) / 自动清理旧 Spans（默认 1 小时）
- Configurable maximum spans in memory (default 10,000) / 可配置内存中的最大 Spans 数量（默认 10,000）
- LRU-style eviction when limit is reached / 达到限制时采用 LRU 样式驱逐

## API Reference / API 参考

### Get Tracing Statistics / 获取追踪统计

```bash
curl http://localhost:8080/api/tracing/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSpans": 150,
    "completed": 148,
    "success": 145,
    "error": 3,
    "averageDuration": 234,
    "maxSpans": 10000
  }
}
```

### Get All Spans for a Trace / 获取追踪的所有 Spans

```bash
curl http://localhost:8080/api/tracing/traces/trace-1697123456789-abc123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "traceId": "trace-1697123456789-abc123",
    "spans": [
      {
        "traceId": "trace-1697123456789-abc123",
        "spanId": "span-xyz789",
        "parentSpanId": null,
        "name": "proxy.handle",
        "startTime": 1697123456789,
        "endTime": 1697123458753,
        "duration": 1964,
        "status": "success",
        "tags": {
          "method": "POST",
          "url": "http://localhost:8080/v1/messages",
          "latency": 1960
        },
        "logs": []
      }
    ]
  }
}
```

### Get Specific Span / 获取特定 Span

```bash
curl http://localhost:8080/api/tracing/spans/span-xyz789
```

### Clear Old Spans / 清理旧 Spans

```bash
curl -X POST http://localhost:8080/api/tracing/clear \
  -H "Content-Type: application/json" \
  -d '{"olderThanMs": 3600000}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "removedCount": 42,
    "remainingSpans": 108
  }
}
```

## Usage Examples / 使用示例

### Example 1: Basic Request Tracing / 基础请求追踪

Make a request and check its trace:
发送请求并查看其追踪：

```bash
# Make a request with a custom trace ID
curl -X POST http://localhost:8080/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-Trace-Id: my-custom-trace-001" \
  -d '{
    "model": "claude-sonnet-4",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Check the trace
curl http://localhost:8080/api/tracing/traces/my-custom-trace-001
```

### Example 2: Distributed Tracing Across Services / 跨服务分布式追踪

If you have multiple services, you can propagate the trace context:
如果您有多个服务，可以传播追踪上下文：

```bash
# Service A generates a trace ID
TRACE_ID="trace-$(date +%s)-$(openssl rand -hex 8)"

# Service A calls Routex
curl -X POST http://localhost:8080/v1/messages \
  -H "X-Trace-Id: $TRACE_ID" \
  -H "X-Parent-Span-Id: service-a-span-123" \
  -d '...'

# Later, query the trace to see the complete flow
curl http://localhost:8080/api/tracing/traces/$TRACE_ID
```

### Example 3: Performance Analysis / 性能分析

Analyze request performance by examining span durations:
通过检查 Span 持续时间分析请求性能：

```bash
# Get trace
curl http://localhost:8080/api/tracing/traces/trace-001 | \
  jq '.data.spans[] | {name: .name, duration: .duration}'
```

**Output:**
```json
{"name": "proxy.handle", "duration": 1964}
{"name": "proxy.parseRequest", "duration": 1}
{"name": "proxy.routing", "duration": 5}
{"name": "proxy.forward", "duration": 1954}
```

This shows that most time (1954ms) was spent forwarding to the upstream API, not in routing or parsing.
这表明大部分时间（1954ms）花在转发到上游 API，而不是路由或解析。

## Implementation Details / 实现细节

### Architecture / 架构

The tracing system consists of:
追踪系统包括：

1. **RequestTracer Class** (`src/core/tracing.ts`)
   - Manages span lifecycle
   - Generates trace/span IDs
   - Stores spans in memory
   - Provides query and cleanup methods

2. **Integration Points** (`src/core/proxy.ts`)
   - Extracts trace context from request headers
   - Creates spans at key operation points
   - Adds trace IDs to response headers
   - Logs errors to spans

3. **API Endpoints** (`src/api/routes.ts`)
   - `/api/tracing/stats` - Statistics
   - `/api/tracing/traces/:traceId` - Trace details
   - `/api/tracing/spans/:spanId` - Span details
   - `/api/tracing/clear` - Cleanup

### Span Lifecycle / Span 生命周期

```typescript
// 1. Start a span
const span = tracer.startSpan('operation.name', traceId, parentSpanId, {
  tag1: 'value1'
});

// 2. Add logs during operation
tracer.addLog(span.spanId, 'Operation started', 'info');

// 3. Add tags
tracer.addTags(span.spanId, { key: 'value' });

// 4. End the span
tracer.endSpan(span.spanId, 'success', { finalTag: 'value' });
```

### Memory Management / 内存管理

The tracer implements two memory protection mechanisms:
追踪器实现两种内存保护机制：

1. **Maximum Span Limit** (10,000)
   - When exceeded, oldest spans are removed
   - 超过限制时，删除最旧的 Spans

2. **Time-based Cleanup**
   - Automatic cleanup of spans older than 1 hour
   - Manual cleanup via API endpoint
   - 自动清理 1 小时前的 Spans
   - 通过 API 端点手动清理

## Best Practices / 最佳实践

### 1. Use Meaningful Trace IDs / 使用有意义的追踪 ID

```bash
# Good: Include service name and timestamp
TRACE_ID="web-frontend-$(date +%s)-$(openssl rand -hex 4)"

# Bad: Random only
TRACE_ID="$(openssl rand -hex 8)"
```

### 2. Regular Cleanup / 定期清理

Set up a cron job to clean old spans:
设置定时任务清理旧 Spans：

```bash
# Every hour, clean spans older than 2 hours
0 * * * * curl -X POST http://localhost:8080/api/tracing/clear \
  -H "Content-Type: application/json" \
  -d '{"olderThanMs": 7200000}'
```

### 3. Use Tags for Filtering / 使用标签进行过滤

Add meaningful tags to spans for easier filtering:
为 Spans 添加有意义的标签以便过滤：

```typescript
tracer.addTags(spanId, {
  userId: 'user-123',
  requestType: 'chat',
  model: 'claude-opus-4'
});
```

### 4. Monitor Tracing Stats / 监控追踪统计

Regularly check tracing statistics:
定期检查追踪统计：

```bash
curl http://localhost:8080/api/tracing/stats | \
  jq '.data | {spans: .totalSpans, errors: .error, avgDuration: .averageDuration}'
```

## Integration with Monitoring / 与监控集成

### Prometheus Metrics / Prometheus 指标

Tracing data can be used to enhance Prometheus metrics:
追踪数据可用于增强 Prometheus 指标：

```bash
# Get average request duration from tracing
curl http://localhost:8080/api/tracing/stats | \
  jq '.data.averageDuration'

# Compare with Prometheus metrics
curl http://localhost:8080/metrics | \
  grep routex_request_duration
```

### Grafana Dashboard / Grafana 仪表板

You can build a Grafana dashboard that:
您可以构建 Grafana 仪表板：

1. Shows request traces over time / 显示随时间变化的请求追踪
2. Graphs span durations / 绘制 Span 持续时间图表
3. Highlights error traces / 突出显示错误追踪
4. Compares routing decisions / 比较路由决策

## Troubleshooting / 故障排除

### Issue: Spans not appearing / 问题：Spans 未出现

**Solution:** Check if tracing is working:
**解决方案：**检查追踪是否工作：

```bash
# Make a test request
curl -X POST http://localhost:8080/v1/messages \
  -H "X-Trace-Id: test-trace-001" \
  -H "Content-Type: application/json" \
  -d '{...}'

# Check stats
curl http://localhost:8080/api/tracing/stats

# If totalSpans is 0, check server logs
```

### Issue: Memory usage growing / 问题：内存使用增长

**Solution:** Enable automatic cleanup:
**解决方案：**启用自动清理：

```bash
# Clean spans older than 30 minutes
curl -X POST http://localhost:8080/api/tracing/clear \
  -d '{"olderThanMs": 1800000}'
```

### Issue: Cannot find specific trace / 问题：无法找到特定追踪

**Solution:** Traces are removed after 1 hour by default. Check timing:
**解决方案：**追踪默认在 1 小时后删除。检查时间：

```bash
# Check when the request was made
echo "Request time: 2025-01-15 10:00:00"
echo "Current time: $(date)"

# If more than 1 hour, the trace may be cleaned
```

## Performance Impact / 性能影响

The tracing system is designed to have minimal performance impact:
追踪系统设计为对性能影响最小：

- **CPU overhead:** <1% (span creation and management)
- **Memory overhead:** ~1KB per span × maxSpans (default 10MB)
- **No I/O overhead:** All operations are in-memory
- **No blocking:** Span operations are synchronous but very fast

## Future Enhancements / 未来增强

Planned improvements:
计划的改进：

1. **Export to external tracing systems** / 导出到外部追踪系统
   - Jaeger integration / Jaeger 集成
   - Zipkin integration / Zipkin 集成
   - OpenTelemetry export / OpenTelemetry 导出

2. **Enhanced visualization** / 增强可视化
   - Built-in trace visualizer / 内置追踪可视化器
   - Flamegraph generation / 火焰图生成

3. **Sampling** / 采样
   - Configurable trace sampling rate / 可配置追踪采样率
   - Smart sampling based on latency / 基于延迟的智能采样

4. **Persistence** / 持久化
   - Optional SQLite storage for traces / 可选的 SQLite 追踪存储
   - Export to files / 导出到文件

---

## Summary / 总结

Routex's distributed tracing system provides production-ready request tracking with:
Routex 的分布式追踪系统提供生产就绪的请求追踪：

- ✅ W3C Trace Context compatibility / W3C 追踪上下文兼容
- ✅ Complete request lifecycle tracking / 完整的请求生命周期追踪
- ✅ Performance analysis tools / 性能分析工具
- ✅ Memory-efficient design / 内存高效设计
- ✅ Easy-to-use REST API / 易用的 REST API
- ✅ Zero configuration required / 零配置要求

For more information, see:
更多信息，请参阅：

- [API Reference](../API_REFERENCE.md#tracing-api)
- [Quick Start Guide](./QUICK_START.md#请求追踪-distributed-tracing)
- [Code Review](./CODE_REVIEW.md#请求追踪功能)

---

**Implementation Date:** 2025-10-17
**Version:** 1.1.0-beta
**Status:** ✅ Production Ready
