# Distributed Tracing Implementation
# 

## Overview
Routex now includes a full-featured distributed tracing system that allows you to track the complete lifecycle of each request through the proxy. This feature is essential for performance analysis, debugging, and understanding system behavior in production.

Routex 

## Features
### 1. Request Lifecycle Tracking
Every request through the proxy is automatically traced with multiple spans:
 Spans

- **proxy.handle** - Root span covering the entire request /  Span
- **proxy.parseRequest** - Request parsing phase
- **proxy.routing** - Routing decision phase
- **proxy.forward** - Forwarding to upstream API /  API

### 2. W3C Trace Context Compatible / W3C 

The tracing system supports multiple trace context formats:

- Custom headers: `X-Trace-Id`, `X-Span-Id`, `X-Parent-Span-Id`
- W3C Trace Context: `traceparent` header
- Automatic trace ID generation if not provided /  ID

### 3. Span Hierarchy / Span 

Spans are organized in a parent-child hierarchy, allowing you to understand the exact sequence and nesting of operations:
Spans 

```
proxy.handle (1964ms)
├── proxy.parseRequest (1ms)
├── proxy.routing (5ms)
│   └── LoadBalancer selected Test Channel
└── proxy.forward (1954ms)
    └── API call to upstream provider
```

### 4. Performance Metrics
Each span tracks:
 Span 

- **Start time**
- **End time**
- **Duration**
- **Status** (pending, success, error)
- **Tags** (custom metadata)
- **Logs** (timestamped log messages)
### 5. Memory Management
- Automatic cleanup of old spans (default 1 hour) /  Spans 1 
- Configurable maximum spans in memory (default 10,000) /  Spans  10,000
- LRU-style eviction when limit is reached /  LRU 

## API Reference / API 

### Get Tracing Statistics
```bash
curl http://localhost:8080/api/tracing/stats
```

**Response:**
```json
{
  success: true,
  data: {
    totalSpans: 150,
    completed: 148,
    success: 145,
    error: 3,
    averageDuration: 234,
    maxSpans: 10000
  }
}
```

### Get All Spans for a Trace /  Spans

```bash
curl http://localhost:8080/api/tracing/traces/trace-1697123456789-abc123
```

**Response:**
```json
{
  success: true,
  data: {
    traceId: trace-1697123456789-abc123,
    spans: [
      {
        traceId: trace-1697123456789-abc123,
        spanId: span-xyz789,
        parentSpanId: null,
        name: proxy.handle,
        startTime: 1697123456789,
        endTime: 1697123458753,
        duration: 1964,
        status: success,
        tags: {
          method: POST,
          url: http://localhost:8080/v1/messages,
          latency: 1960
        },
        logs: 
      }
    ]
  }
}
```

### Get Specific Span /  Span

```bash
curl http://localhost:8080/api/tracing/spans/span-xyz789
```

### Clear Old Spans /  Spans

```bash
curl -X POST http://localhost:8080/api/tracing/clear \
  -H Content-Type: application/json \
  -d '{olderThanMs: 3600000}'
```

**Response:**
```json
{
  success: true,
  data: {
    removedCount: 42,
    remainingSpans: 108
  }
}
```

## Usage Examples
### Example 1: Basic Request Tracing
Make a request and check its trace:

```bash
# Make a request with a custom trace ID
curl -X POST http://localhost:8080/v1/messages \
  -H Content-Type: application/json \
  -H X-Trace-Id: my-custom-trace-001 \
  -d '{
    model: claude-sonnet-4,
    max_tokens: 100,
    messages: [{role: user, content: Hello!}]
  }'

# Check the trace
curl http://localhost:8080/api/tracing/traces/my-custom-trace-001
```

### Example 2: Distributed Tracing Across Services
If you have multiple services, you can propagate the trace context:

```bash
# Service A generates a trace ID
TRACE_ID=trace-$(date +%s)-$(openssl rand -hex 8)

# Service A calls Routex
curl -X POST http://localhost:8080/v1/messages \
  -H X-Trace-Id: $TRACE_ID \
  -H X-Parent-Span-Id: service-a-span-123 \
  -d '...'

# Later, query the trace to see the complete flow
curl http://localhost:8080/api/tracing/traces/$TRACE_ID
```

### Example 3: Performance Analysis
Analyze request performance by examining span durations:
 Span 

```bash
# Get trace
curl http://localhost:8080/api/tracing/traces/trace-001 | \
  jq '.data.spans | {name: .name, duration: .duration}'
```

**Output:**
```json
{name: proxy.handle, duration: 1964}
{name: proxy.parseRequest, duration: 1}
{name: proxy.routing, duration: 5}
{name: proxy.forward, duration: 1954}
```

This shows that most time (1954ms) was spent forwarding to the upstream API, not in routing or parsing.
1954ms API

## Implementation Details
### Architecture
The tracing system consists of:

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

### Span Lifecycle / Span 

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

### Memory Management
The tracer implements two memory protection mechanisms:

1. **Maximum Span Limit** (10,000)
   - When exceeded, oldest spans are removed
   -  Spans

2. **Time-based Cleanup**
   - Automatic cleanup of spans older than 1 hour
   - Manual cleanup via API endpoint
   -  1  Spans
   -  API 

## Best Practices
### 1. Use Meaningful Trace IDs /  ID

```bash
# Good: Include service name and timestamp
TRACE_ID=web-frontend-$(date +%s)-$(openssl rand -hex 4)

# Bad: Random only
TRACE_ID=$(openssl rand -hex 8)
```

### 2. Regular Cleanup
Set up a cron job to clean old spans:
 Spans

```bash
# Every hour, clean spans older than 2 hours
0 * * * * curl -X POST http://localhost:8080/api/tracing/clear \
  -H Content-Type: application/json \
  -d '{olderThanMs: 7200000}'
```

### 3. Use Tags for Filtering
Add meaningful tags to spans for easier filtering:
 Spans 

```typescript
tracer.addTags(spanId, {
  userId: 'user-123',
  requestType: 'chat',
  model: 'claude-opus-4'
});
```

### 4. Monitor Tracing Stats
Regularly check tracing statistics:

```bash
curl http://localhost:8080/api/tracing/stats | \
  jq '.data | {spans: .totalSpans, errors: .error, avgDuration: .averageDuration}'
```

## Integration with Monitoring
### Prometheus Metrics / Prometheus 

Tracing data can be used to enhance Prometheus metrics:
 Prometheus 

```bash
# Get average request duration from tracing
curl http://localhost:8080/api/tracing/stats | \
  jq '.data.averageDuration'

# Compare with Prometheus metrics
curl http://localhost:8080/metrics | \
  grep routex_request_duration
```

### Grafana Dashboard / Grafana 

You can build a Grafana dashboard that:
 Grafana 

1. Shows request traces over time
2. Graphs span durations /  Span 
3. Highlights error traces
4. Compares routing decisions
## Troubleshooting
### Issue: Spans not appearing / Spans 

**Solution:** Check if tracing is working:
****

```bash
# Make a test request
curl -X POST http://localhost:8080/v1/messages \
  -H X-Trace-Id: test-trace-001 \
  -H Content-Type: application/json \
  -d '{...}'

# Check stats
curl http://localhost:8080/api/tracing/stats

# If totalSpans is 0, check server logs
```

### Issue: Memory usage growing
**Solution:** Enable automatic cleanup:
****

```bash
# Clean spans older than 30 minutes
curl -X POST http://localhost:8080/api/tracing/clear \
  -d '{olderThanMs: 1800000}'
```

### Issue: Cannot find specific trace
**Solution:** Traces are removed after 1 hour by default. Check timing:
**** 1 

```bash
# Check when the request was made
echo Request time: 2025-01-15 10:00:00
echo Current time: $(date)

# If more than 1 hour, the trace may be cleaned
```

## Performance Impact
The tracing system is designed to have minimal performance impact:

- **CPU overhead:** <1% (span creation and management)
- **Memory overhead:** ~1KB per span × maxSpans (default 10MB)
- **No I/O overhead:** All operations are in-memory
- **No blocking:** Span operations are synchronous but very fast

## Future Enhancements
Planned improvements:

1. **Export to external tracing systems**
   - Jaeger integration / Jaeger 
   - Zipkin integration / Zipkin 
   - OpenTelemetry export / OpenTelemetry 

2. **Enhanced visualization**
   - Built-in trace visualizer
   - Flamegraph generation
3. **Sampling**
   - Configurable trace sampling rate
   - Smart sampling based on latency
4. **Persistence**
   - Optional SQLite storage for traces /  SQLite 
   - Export to files
---

## Summary
Routex's distributed tracing system provides production-ready request tracking with:
Routex 

- ✅ W3C Trace Context compatibility / W3C 
- ✅ Complete request lifecycle tracking
- ✅ Performance analysis tools
- ✅ Memory-efficient design
- ✅ Easy-to-use REST API /  REST API
- ✅ Zero configuration required
For more information, see:

- [API Reference](../API_REFERENCE.md#tracing-api)
- [Quick Start Guide](./QUICK_START.md#-distributed-tracing)
- [Code Review](./CODE_REVIEW.md#)

---

**Implementation Date:** 2025-10-17
**Version:** 1.1.0-beta
**Status:** ✅ Production Ready
