# Routex API Reference

Complete API reference for Routex.
Routex  API

## Base URL /  URL

```
http://localhost:8080
```

## Authentication

Most API endpoints do not require authentication in the default configuration. For production deployments, consider adding authentication middleware.

API

## Endpoints

### Health Check

Check if the server is running and healthy.

```http
GET /health
```

**Response / :**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 123.45,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Channels API /  API

### List Channels

Get all channels.

```http
GET /api/channels
```

**Response / :**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Primary Claude",
      "type": "anthropic",
      "baseUrl": "https://api.anthropic.com",
      "models": ["claude-opus-4-20250514", "claude-sonnet-4-20250514"],
      "priority": 100,
      "weight": 1,
      "status": "enabled",
      "requestCount": 42,
      "successCount": 40,
      "failureCount": 2,
      "lastUsedAt": 1737800000000,
      "createdAt": 1737700000000,
      "updatedAt": 1737800000000
    }
  ]
}
```

### Get Channel

Get a specific channel by ID.
ID

```http
GET /api/channels/:id
```

**Response / :**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Primary Claude",
    ...
  }
}
```

### Create Channel

Create a new channel.

```http
POST /api/channels
Content-Type: application/json
```

**Request Body / :**

```json
{
  "name": "Primary Claude",
  "type": "anthropic",
  "apiKey": "sk-ant-***",
  "baseUrl": "https://api.anthropic.com",
  "models": ["claude-opus-4-20250514"],
  "priority": 100,
  "weight": 1
}
```

**Fields / :**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Channel name /  |
| type | string | Yes | Channel type: `anthropic`, `openai`, `azure`, `zhipu`, `google`, `custom` |
| apiKey | string | No | API key for authentication /  API  |
| baseUrl | string | No | Custom base URL /  URL |
| models | string | Yes | Supported models /  |
| priority | number | No | Priority (1-100, default: 50) / 1-10050 |
| weight | number | No | Weight for weighted strategy (default: 1) / 1 |

**Response / :**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Primary Claude",
    ...
  }
}
```

### Update Channel

Update an existing channel.

```http
PUT /api/channels/:id
Content-Type: application/json
```

**Request Body / :**

```json
{
  "name": "Updated Name",
  "priority": 90,
  "status": "disabled"
}
```

**Response / :**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    ...
  }
}
```

### Delete Channel

Delete a channel.

```http
DELETE /api/channels/:id
```

**Response / :**

```json
{
  "success": true,
  "message": "Channel deleted"
}
```

### Export Channels

Export all channels as JSON.
JSON

```http
GET /api/channels/export
```

**Response / :**

```json
{
  "version": "1.0",
  "exportedAt": "2025-01-15T10:30:00.000Z",
  "channels": [
    {
      "name": "Primary Claude",
      "type": "anthropic",
      "baseUrl": "https://api.anthropic.com",
      "models": ["claude-opus-4-20250514"],
      "priority": 100,
      "weight": 1
    }
  ]
}
```

### Import Channels

Import channels from JSON.
JSON

```http
POST /api/channels/import
Content-Type: application/json
```

**Request Body / :**

```json
{
  "channels": [
    {
      "name": "Imported Channel",
      "type": "anthropic",
      "models": ["claude-sonnet-4-20250514"],
      "priority": 80
    }
  ],
  "replaceExisting": false
}
```

**Response / :**

```json
{
  "success": true,
  "data": {
    "imported": 1,
    "skipped": 0,
    "errors": []
  }
}
```

---

## Request Logs API /  API

### List Requests

Get request logs.

```http
GET /api/requests?limit=100&offset=0
```

**Query Parameters / :**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 100 | Number of results /  |
| offset | number | 0 | Pagination offset /  |

**Response / :**

```json
{
  "success": true,
  "data": [
    {
      "id": "log-123",
      "channelId": "550e8400-e29b-41d4-a716-446655440000",
      "model": "claude-opus-4-20250514",
      "method": "POST",
      "path": "/v1/messages",
      "statusCode": 200,
      "latency": 1234,
      "inputTokens": 100,
      "outputTokens": 200,
      "cachedTokens": 0,
      "success": true,
      "timestamp": 1737800000000
    }
  ]
}
```

### Get Requests by Channel

Get request logs for a specific channel.

```http
GET /api/requests/channel/:channelId?limit=100
```

---

## Analytics API /  API

### Get Analytics

Get aggregated analytics.

```http
GET /api/analytics
```

**Response / :**

```json
{
  "success": true,
  "data": {
    "totalRequests": 1000,
    "successfulRequests": 950,
    "failedRequests": 50,
    "averageLatency": 1234.5,
    "totalInputTokens": 100000,
    "totalOutputTokens": 200000,
    "totalCachedTokens": 50000,
    "estimatedCost": 12.34
  }
}
```

---

## Load Balancer API /  API

### Get Strategy

Get current load balancing strategy.

```http
GET /api/load-balancer/strategy
```

**Response / :**

```json
{
  "success": true,
  "data": {
    "strategy": "priority"
  }
}
```

### Update Strategy

Change load balancing strategy.

```http
PUT /api/load-balancer/strategy
Content-Type: application/json
```

**Request Body / :**

```json
{
  "strategy": "round_robin"
}
```

**Available Strategies / :**

- `priority`: Highest priority first
- `round_robin`: Rotate through channels
- `weighted`: Weight-based selection
- `least_used`: Least requests first

---

## Proxy API /  API

### Forward Request

Forward requests to AI providers through the proxy.
AI

```http
POST /v1/messages
Content-Type: application/json
X-Session-Id: optional-session-id
```

**Request Body / :**

```json
{
  "model": "claude-opus-4-20250514",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": "Hello!"
    }
  ]
}
```

**Response / :**

```json
{
  "id": "msg_123",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Hello! How can I help you today?"
    }
  ],
  "usage": {
    "input_tokens": 10,
    "output_tokens": 15
  }
}
```

**Response Headers / :**

- `X-Channel-Id`: ID of the channel used /  ID
- `X-Latency-Ms`: Request latency in milliseconds

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

**Common Error Codes / :**

| Code | Status | Description |
|------|--------|-------------|
| VALIDATION_ERROR | 400 | Invalid input /  |
| NOT_FOUND | 404 | Resource not found /  |
| SERVICE_UNAVAILABLE | 503 | No available channels /  |
| INTERNAL_ERROR | 500 | Server error /  |

---

## Rate Limits

There are no built-in rate limits. Configure rate limiting based on your deployment needs.

---

## Examples

### Create and Use a Channel

```bash
# 1. Create channel
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Claude Channel",
    "type": "anthropic",
    "apiKey": "sk-ant-***",
    "models": ["claude-opus-4-20250514"],
    "priority": 100
  }'

# 2. Send request
curl -X POST http://localhost:8080/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-opus-4-20250514",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# 3. Check analytics
curl http://localhost:8080/api/analytics
```

---

For more information, visit the [Routex documentation](https://github.com/dctx-team/Routex).

[Routex ](https://github.com/dctx-team/Routex)
