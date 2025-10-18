# Routex API Reference / API

## Table of Contents

- [Routing Rules API](#routing-rules-api)
- [Transformers API](#transformers-api)
- [Channels API](#channels-api)
- [Analytics API](#analytics-api)
- [Load Balancer API](#load-balancer-api)
- [Tracing API](#tracing-api)
- [Health Check](#health-check)
- [Proxy Endpoint](#proxy-endpoint)
- [Error Responses](#error-responses)

---

## Routing Rules API /  API

### List All Routing Rules

```http
GET /api/routing/rules
```

**Response**:
```json
{
  success: true,
  data: [
    {
      id: uuid,
      name: Long Context to Gemini,
      type: longContext,
      condition: {
        tokenThreshold: 60000
      },
      targetChannel: channel-id,
      targetModel: gemini-2.5-pro,
      priority: 100,
      enabled: true,
      createdAt: 1234567890,
      updatedAt: 1234567890
    }
  ]
}
```

### List Enabled Rules

```http
GET /api/routing/rules/enabled
```

### Get Single Rule

```http
GET /api/routing/rules/:id
```

### Create Routing Rule

```http
POST /api/routing/rules
Content-Type: application/json

{
  name: Rule Name,
  type: longContext|background|think|webSearch|image|custom,
  condition: {
    // Condition based on type
  },
  targetChannel: channel-id-or-name,
  targetModel: optional-model-override,
  priority: 50
}
```

**Routing Types and Conditions / **:

1. **Long Context / ** (`type: longContext`):
   ```json
   {
     condition: {
       tokenThreshold: 60000
     }
   }
   ```

2. **Keywords / ** (`type: custom`):
   ```json
   {
     condition: {
       keywords: [code review, analyze, explain]
     }
   }
   ```

3. **User Pattern / ** (`type: custom`):
   ```json
   {
     condition: {
       userPattern: ^(analyze|review)\\s+code
     }
   }
   ```

4. **Model Pattern / ** (`type: custom`):
   ```json
   {
     condition: {
       modelPattern: ^claude-opus
     }
   }
   ```

5. **Has Tools / ** (`type: custom`):
   ```json
   {
     condition: {
       hasTools: true
     }
   }
   ```

6. **Has Images / ** (`type: image`):
   ```json
   {
     condition: {
       hasImages: true
     }
   }
   ```

7. **Custom Function / ** (`type: custom`):
   ```json
   {
     condition: {
       customFunction: my-custom-router
     }
   }
   ```

### Update Routing Rule

```http
PUT /api/routing/rules/:id
Content-Type: application/json

{
  name: Updated Name,
  priority: 80,
  enabled: true
}
```

### Delete Routing Rule

```http
DELETE /api/routing/rules/:id
```

### Enable/Disable Rule
```http
POST /api/routing/rules/:id/enable
POST /api/routing/rules/:id/disable
```

### Test Routing

```http
POST /api/routing/test
Content-Type: application/json

{
  model: claude-opus-4,
  messages: [
    {
      role: user,
      content: Test message
    }
  ]
}
```

---

## Transformers API / Transformers API

### List Available Transformers /  Transformers

```http
GET /api/transformers
```

**Response**:
```json
{
  success: true,
  data: [
    {
      name: anthropic,
      description: Anthropic Messages API format (base format)
    },
    {
      name: openai,
      description: OpenAI Chat Completions API format
    }
  ]
}
```

### Test Transformer /  Transformer

```http
POST /api/transformers/test
Content-Type: application/json

{
  transformer: openai,
  direction: request|response,
  request: {
    model: claude-opus-4,
    messages: [{role: user, content: Hello}],
    max_tokens: 100
  }
}
```

**Response**:
```json
{
  success: true,
  data: {
    input: { /* original request */ },
    output: { /* transformed request */ },
    transformer: openai,
    direction: request
  }
}
```

---

## Channels API /  API

### List Channels

```http
GET /api/channels
```

### Get Channel

```http
GET /api/channels/:id
```

### Create Channel

```http
POST /api/channels
Content-Type: application/json

{
  name: Channel Name,
  type: anthropic|openai|google|custom,
  apiKey: your-api-key,
  baseUrl: https://api.example.com,
  models: [model-1, model-2],
  priority: 50,
  weight: 1,
  transformers: {
    use: [openai]
  }
}
```

**Transformer Configuration / Transformer **:

```json
{
  transformers: {
    use: [
      openai,
      [maxtoken, { max_tokens: 8192 }]
    ]
  }
}
```

### Update Channel

```http
PUT /api/channels/:id
Content-Type: application/json

{
  name: Updated Name,
  priority: 100,
  transformers: {
    use: [anthropic]
  }
}
```

### Delete Channel

```http
DELETE /api/channels/:id
```

### Export Channels

```http
GET /api/channels/export
```

### Import Channels

```http
POST /api/channels/import
Content-Type: application/json

{
  channels: [ /* array of channel configs */ ],
  replaceExisting: false
}
```

---

## Analytics API /  API

### Get Analytics

```http
GET /api/analytics
```

**Response**:
```json
{
  success: true,
  data: {
    totalRequests: 1000,
    successfulRequests: 950,
    failedRequests: 50,
    averageLatency: 1234.5,
    totalInputTokens: 500000,
    totalOutputTokens: 200000,
    totalCachedTokens: 50000,
    estimatedCost: 12.34
  }
}
```

### List Requests

```http
GET /api/requests?limit=100&offset=0
```

### Get Requests by Channel

```http
GET /api/requests/channel/:channelId?limit=100
```

---

## Load Balancer API /  API

### Get Current Strategy

```http
GET /api/load-balancer/strategy
```

**Response**:
```json
{
  success: true,
  data: {
    strategy: priority
  }
}
```

### Update Strategy

```http
PUT /api/load-balancer/strategy
Content-Type: application/json

{
  strategy: priority|round_robin|weighted|least_used
}
```

---

## Tracing API /  API

### Get Tracing Statistics
```http
GET /api/tracing/stats
```

**Response**:
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

### Get Trace Details
Get all spans for a specific trace:
 Spans

```http
GET /api/tracing/traces/:traceId
```

**Response**:
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
          url: http://localhost:3000/v1/messages,
          latency: 1960
        },
        logs: 
      },
      {
        traceId: trace-1697123456789-abc123,
        spanId: span-abc123,
        parentSpanId: span-xyz789,
        name: proxy.forward,
        startTime: 1697123456799,
        endTime: 1697123458753,
        duration: 1954,
        status: success,
        tags: {
          channel: Test Channel,
          model: claude-sonnet-4
        },
        logs: 
      }
    ]
  }
}
```

### Get Span Details /  Span 

Get details of a specific span:
 Span 

```http
GET /api/tracing/spans/:spanId
```

**Response**:
```json
{
  success: true,
  data: {
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
      url: http://localhost:3000/v1/messages
    },
    logs: [
      {
        timestamp: 1697123456790,
        message: Request parsed,
        level: info
      }
    ]
  }
}
```

### Clear Old Spans /  Spans

Clear spans older than specified time (default 1 hour):
 Spans 1 

```http
POST /api/tracing/clear
Content-Type: application/json

{
  olderThanMs: 3600000
}
```

**Response**:
```json
{
  success: true,
  data: {
    removedCount: 42,
    remainingSpans: 108
  }
}
```

**Trace Context Headers / **:

When making requests, you can pass trace context headers:

- `X-Trace-Id`: Custom trace ID (optional) /  ID
- `X-Span-Id`: Custom span ID (optional) /  Span ID
- `X-Parent-Span-Id`: Parent span ID (optional) /  Span ID
- `traceparent`: W3C Trace Context format (optional) / W3C 

**Response Trace Headers / **:

All proxy responses include trace headers:

- `X-Trace-Id`: Trace ID for this request /  ID
- `X-Span-Id`: Root span ID /  Span ID

---

## Health Check

```http
GET /health
```

**Response**:
```json
{
  status: healthy,
  version: 1.1.0-beta,
  uptime: 12345.67,
  timestamp: 2025-10-15T09:00:00.000Z
}
```

---

## Proxy Endpoint

### Forward Request

```http
POST /v1/messages
Content-Type: application/json
x-api-key: dummy
x-session-id: optional-session-id

{
  model: claude-opus-4,
  messages: [
    {
      role: user,
      content: Hello!
    }
  ],
  max_tokens: 1024
}
```

**Response Headers / **:
- `X-Channel-Id`: Selected channel ID /  ID
- `X-Channel-Name`: Selected channel name
- `X-Routing-Rule`: Matched routing rule (if any)
- `X-Latency-Ms`: Request latency in milliseconds

---

## Error Responses

All API errors follow this format:
API

```json
{
  success: false,
  error: {
    code: ERROR_CODE,
    message: Error description
  }
}
```

**Common Error Codes / **:

- `VALIDATION_ERROR` (400): Invalid request parameters
- `NOT_FOUND` (404): Resource not found
- `INTERNAL_ERROR` (500): Internal server error
- `SERVICE_UNAVAILABLE` (503): No available channels

---

## Rate Limits

Routex does not impose rate limits on the API itself. Rate limiting is handled at the channel level and depends on the upstream API provider.

Routex  API  API

---

## Authentication

All API endpoints are currently unauthenticated for local development. In production, use reverse proxy authentication (nginx, Cloudflare Access, etc.).

API nginxCloudflare Access

---

**For more information, see the full documentation at [docs/](./docs/)**

** [docs/](./docs/)**
