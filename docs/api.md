# Routex API Reference

Complete API reference for Routex.
Routex 的完整 API 参考。

## Base URL / 基础 URL

```
http://localhost:8080
```

## Authentication / 认证

Most API endpoints do not require authentication in the default configuration. For production deployments, consider adding authentication middleware.

大多数 API 端点在默认配置中不需要认证。对于生产部署，请考虑添加认证中间件。

## Endpoints / 端点

### Health Check / 健康检查

Check if the server is running and healthy.
检查服务器是否正在运行且健康。

```http
GET /health
```

**Response / 响应:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 123.45,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Channels API / 渠道 API

### List Channels / 列出渠道

Get all channels.
获取所有渠道。

```http
GET /api/channels
```

**Response / 响应:**

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

### Get Channel / 获取渠道

Get a specific channel by ID.
通过 ID 获取特定渠道。

```http
GET /api/channels/:id
```

**Response / 响应:**

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

### Create Channel / 创建渠道

Create a new channel.
创建新渠道。

```http
POST /api/channels
Content-Type: application/json
```

**Request Body / 请求体:**

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

**Fields / 字段:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Channel name / 渠道名称 |
| type | string | Yes | Channel type: `anthropic`, `openai`, `azure`, `zhipu`, `google`, `custom` |
| apiKey | string | No | API key for authentication / 用于认证的 API 密钥 |
| baseUrl | string | No | Custom base URL / 自定义基础 URL |
| models | string[] | Yes | Supported models / 支持的模型 |
| priority | number | No | Priority (1-100, default: 50) / 优先级（1-100，默认：50） |
| weight | number | No | Weight for weighted strategy (default: 1) / 加权策略的权重（默认：1） |

**Response / 响应:**

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

### Update Channel / 更新渠道

Update an existing channel.
更新现有渠道。

```http
PUT /api/channels/:id
Content-Type: application/json
```

**Request Body / 请求体:**

```json
{
  "name": "Updated Name",
  "priority": 90,
  "status": "disabled"
}
```

**Response / 响应:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    ...
  }
}
```

### Delete Channel / 删除渠道

Delete a channel.
删除渠道。

```http
DELETE /api/channels/:id
```

**Response / 响应:**

```json
{
  "success": true,
  "message": "Channel deleted"
}
```

### Export Channels / 导出渠道

Export all channels as JSON.
将所有渠道导出为 JSON。

```http
GET /api/channels/export
```

**Response / 响应:**

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

### Import Channels / 导入渠道

Import channels from JSON.
从 JSON 导入渠道。

```http
POST /api/channels/import
Content-Type: application/json
```

**Request Body / 请求体:**

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

**Response / 响应:**

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

## Request Logs API / 请求日志 API

### List Requests / 列出请求

Get request logs.
获取请求日志。

```http
GET /api/requests?limit=100&offset=0
```

**Query Parameters / 查询参数:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 100 | Number of results / 结果数量 |
| offset | number | 0 | Pagination offset / 分页偏移 |

**Response / 响应:**

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

### Get Requests by Channel / 按渠道获取请求

Get request logs for a specific channel.
获取特定渠道的请求日志。

```http
GET /api/requests/channel/:channelId?limit=100
```

---

## Analytics API / 分析 API

### Get Analytics / 获取分析

Get aggregated analytics.
获取聚合分析。

```http
GET /api/analytics
```

**Response / 响应:**

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

## Load Balancer API / 负载均衡器 API

### Get Strategy / 获取策略

Get current load balancing strategy.
获取当前负载均衡策略。

```http
GET /api/load-balancer/strategy
```

**Response / 响应:**

```json
{
  "success": true,
  "data": {
    "strategy": "priority"
  }
}
```

### Update Strategy / 更新策略

Change load balancing strategy.
更改负载均衡策略。

```http
PUT /api/load-balancer/strategy
Content-Type: application/json
```

**Request Body / 请求体:**

```json
{
  "strategy": "round_robin"
}
```

**Available Strategies / 可用策略:**

- `priority`: Highest priority first / 优先级最高者优先
- `round_robin`: Rotate through channels / 轮流使用渠道
- `weighted`: Weight-based selection / 基于权重选择
- `least_used`: Least requests first / 请求最少者优先

---

## Proxy API / 代理 API

### Forward Request / 转发请求

Forward requests to AI providers through the proxy.
通过代理将请求转发到 AI 提供商。

```http
POST /v1/messages
Content-Type: application/json
X-Session-Id: optional-session-id
```

**Request Body / 请求体:**

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

**Response / 响应:**

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

**Response Headers / 响应头:**

- `X-Channel-Id`: ID of the channel used / 使用的渠道 ID
- `X-Latency-Ms`: Request latency in milliseconds / 请求延迟（毫秒）

---

## Error Responses / 错误响应

All errors follow this format:
所有错误都遵循此格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

**Common Error Codes / 常见错误代码:**

| Code | Status | Description |
|------|--------|-------------|
| VALIDATION_ERROR | 400 | Invalid input / 无效输入 |
| NOT_FOUND | 404 | Resource not found / 资源未找到 |
| SERVICE_UNAVAILABLE | 503 | No available channels / 无可用渠道 |
| INTERNAL_ERROR | 500 | Server error / 服务器错误 |

---

## Rate Limits / 速率限制

There are no built-in rate limits. Configure rate limiting based on your deployment needs.

没有内置速率限制。根据您的部署需求配置速率限制。

---

## Examples / 示例

### Create and Use a Channel / 创建并使用渠道

```bash
# 1. Create channel / 创建渠道
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Claude Channel",
    "type": "anthropic",
    "apiKey": "sk-ant-***",
    "models": ["claude-opus-4-20250514"],
    "priority": 100
  }'

# 2. Send request / 发送请求
curl -X POST http://localhost:8080/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-opus-4-20250514",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# 3. Check analytics / 检查分析
curl http://localhost:8080/api/analytics
```

---

For more information, visit the [Routex documentation](https://github.com/dctx-team/Routex).

更多信息，请访问 [Routex 文档](https://github.com/dctx-team/Routex)。
