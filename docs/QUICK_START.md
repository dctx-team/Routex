# Routex 快速上手指南

欢迎使用 Routex！本指南将帮助您快速上手并充分利用 Routex 的强大功能。

## 📋 目录

1. [安装与启动](#安装与启动)
2. [基础配置](#基础配置)
3. [核心功能](#核心功能)
4. [高级特性](#高级特性)
5. [监控与调试](#监控与调试)
6. [最佳实践](#最佳实践)
7. [常见问题](#常见问题)

---

## 安装与启动

### 前置要求

- **Bun** ≥ 1.2.0 ([安装指南](https://bun.sh))
- **操作系统**: Linux, macOS, or Windows (WSL)

### 快速安装

```bash
# 1. 克隆仓库
git clone https://github.com/dctx-team/Routex.git
cd Routex

# 2. 安装依赖
bun install

# 3. 启动服务器
bun start
```

### 首次运行

Routex 会自动启动交互式设置向导：

```
🎯 Welcome to Routex Setup Wizard!

Step 1/3: Add Your First Channel
Please select a provider:
1. Anthropic (Claude)
2. OpenAI (GPT)
3. Google (Gemini)
4. Azure OpenAI
5. Zhipu AI
6. Custom Provider

Your choice: _
```

按照提示完成配置即可！

---

## 基础配置

### 添加 AI 渠道

#### 方法 1: 使用 CLI 工具

```bash
# 启动交互式模型选择器
bun run cli

# 按照提示选择 Provider 和模型
```

#### 方法 2: 使用 API

```bash
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Claude Main",
    "type": "anthropic",
    "apiKey": "sk-ant-xxx",
    "models": ["claude-opus-4", "claude-sonnet-4"],
    "priority": 1,
    "weight": 10
  }'
```

#### 方法 3: 使用 Dashboard

访问 http://localhost:8080/dashboard，在 Channels 页面点击 "Add Channel"。

### 配置负载均衡策略

```bash
# 设置为优先级策略（默认）
curl -X PUT http://localhost:8080/api/load-balancer/strategy \
  -H "Content-Type: application/json" \
  -d '{"strategy": "priority"}'

# 可选策略:
# - priority      # 按优先级选择（数值越小优先级越高）
# - round_robin   # 轮询
# - weighted      # 加权随机
# - least_used    # 最少使用
```

---

## 核心功能

### 1. 智能路由 (SmartRouter)

#### 场景 1: 长上下文自动路由

将超过 60K tokens 的请求自动路由到 Gemini：

```bash
curl -X POST http://localhost:8080/api/routing/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Long Context to Gemini",
    "type": "longContext",
    "condition": {
      "tokenThreshold": 60000
    },
    "targetChannel": "gemini-channel-id",
    "targetModel": "gemini-2.5-pro",
    "priority": 100,
    "enabled": true
  }'
```

#### 场景 2: 关键词路由

将代码审查任务路由到 Claude Opus：

```bash
curl -X POST http://localhost:8080/api/routing/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Code Review to Opus",
    "type": "custom",
    "condition": {
      "keywords": ["code review", "review this", "analyze code"]
    },
    "targetChannel": "claude-opus-id",
    "priority": 90,
    "enabled": true
  }'
```

#### 场景 3: 正则表达式路由

```bash
{
  "name": "Math Questions",
  "type": "custom",
  "condition": {
    "regex": "\\b(calculate|compute|solve|equation)\\b"
  },
  "targetChannel": "math-specialist-id",
  "priority": 85
}
```

### 2. 格式转换 (Transformers)

#### 使用 OpenRouter 并自动转换格式

```bash
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenRouter",
    "type": "openai",
    "baseUrl": "https://openrouter.ai/api/v1/chat/completions",
    "apiKey": "sk-or-xxx",
    "models": ["anthropic/claude-opus-4"],
    "transformers": {
      "use": ["openai"]
    }
  }'
```

现在您可以使用 Anthropic 格式的请求，Routex 会自动转换为 OpenAI 格式：

```bash
curl -X POST http://localhost:8080/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-opus-4",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "max_tokens": 100
  }'
```

#### 可用的 Transformers

- `anthropic` - Anthropic Messages 格式（基础格式）
- `openai` - OpenAI Chat Completions 格式
- `maxtoken` - 强制 max_tokens 限制
- `sampling` - 采样参数转换
- `cleancache` - 清理缓存参数

### 3. 会话亲和性 (Session Affinity)

使用 `X-Session-ID` 头确保同一会话的请求路由到同一渠道：

```bash
curl -X POST http://localhost:8080/v1/messages \
  -H "X-Session-ID: user-123-conversation-abc" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4",
    "messages": [
      {"role": "user", "content": "继续我们之前的对话..."}
    ]
  }'
```

**会话特性**:
- 会话有效期: 5 小时
- 自动清理过期会话
- 支持缓存统计查询

---

## 高级特性

### 1. 请求追踪 (Distributed Tracing)

#### 启用追踪

Routex 自动为每个请求创建追踪上下文。您可以在响应头中看到追踪信息：

```bash
curl -I http://localhost:8080/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-sonnet-4", "messages": [...]}'

# 响应头包含:
# X-Trace-Id: trace-1697123456789-abc123
# X-Span-Id: span-xyz789
# X-Channel-Id: channel-uuid
# X-Latency-Ms: 234
```

#### 查询追踪信息

```bash
# 获取追踪统计
curl http://localhost:8080/api/tracing/stats

# 响应:
{
  "totalSpans": 150,
  "completed": 148,
  "success": 145,
  "error": 3,
  "averageDuration": 234
}

# 查询特定 Trace 的所有 Spans
curl http://localhost:8080/api/tracing/traces/trace-1697123456789-abc123

# 响应:
{
  "traceId": "trace-1697123456789-abc123",
  "spans": [
    {
      "spanId": "span-xyz789",
      "name": "proxy.handle",
      "duration": 1964,
      "status": "success",
      "tags": {
        "method": "POST",
        "latency": 1960
      }
    },
    {
      "spanId": "span-abc123",
      "parentSpanId": "span-xyz789",
      "name": "proxy.forward",
      "duration": 1954,
      "status": "success"
    }
  ]
}

# 查询特定 Span
curl http://localhost:8080/api/tracing/spans/span-xyz789

# 清理旧的 Spans (默认 1 小时前)
curl -X POST http://localhost:8080/api/tracing/clear \
  -H "Content-Type: application/json" \
  -d '{"olderThanMs": 3600000}'
```

### 2. Prometheus 监控

#### 访问指标

```bash
# Prometheus 格式
curl http://localhost:8080/metrics

# JSON 格式摘要
curl http://localhost:8080/api/metrics

# 详细指标
curl http://localhost:8080/api/metrics/all
```

#### 重要指标

**请求指标**:
- `routex_requests_total` - 总请求数
- `routex_requests_success_total` - 成功请求数
- `routex_requests_failed_total` - 失败请求数
- `routex_request_duration_seconds` - 请求延迟（直方图）

**Token 指标**:
- `routex_tokens_input_total` - 输入 tokens 总数
- `routex_tokens_output_total` - 输出 tokens 总数
- `routex_tokens_cached_total` - 缓存 tokens 总数

**渠道指标**:
- `routex_channels_total` - 渠道总数
- `routex_channels_enabled` - 启用的渠道数
- `routex_channel_requests_total` - 每个渠道的请求数

**熔断器指标**:
- `routex_circuit_breaker_open_total` - 熔断器打开次数
- `routex_circuit_breaker_open` - 当前熔断器状态

### 3. Tee Stream (请求/响应复制)

#### 配置 Tee 目标

```bash
# 添加文件日志目标
curl -X POST http://localhost:8080/api/tee \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Request Log",
    "type": "file",
    "enabled": true,
    "filePath": "./logs/requests.jsonl",
    "filter": {
      "successOnly": true,
      "sampleRate": 1.0
    },
    "retries": 3
  }'

# 添加 Webhook 目标
curl -X POST http://localhost:8080/api/tee \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Analytics Webhook",
    "type": "webhook",
    "enabled": true,
    "url": "https://analytics.example.com/events",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer token"
    },
    "filter": {
      "sampleRate": 0.1
    },
    "retries": 5,
    "timeout": 10000
  }'
```

#### 过滤选项

```typescript
{
  channels?: string[];      // 仅特定渠道
  models?: string[];        // 仅特定模型
  statusCodes?: number[];   // 特定状态码
  successOnly?: boolean;    // 仅成功请求
  failureOnly?: boolean;    // 仅失败请求
  sampleRate?: number;      // 采样率 (0-1)
}
```

### 4. 多语言支持 (i18n)

#### 切换语言

```bash
# 切换到中文
curl -X PUT http://localhost:8080/api/i18n/locale \
  -H "Content-Type: application/json" \
  -d '{"locale": "zh-CN"}'

# 切换到英文
curl -X PUT http://localhost:8080/api/i18n/locale \
  -H "Content-Type: application/json" \
  -d '{"locale": "en"}'

# 查询当前语言
curl http://localhost:8080/api/i18n/locale
```

#### 环境变量配置

```bash
# 启动时设置语言
LOCALE=zh-CN bun start

# 或
LOCALE=en bun start
```

---

## 监控与调试

### 健康检查

```bash
# 基础健康检查
curl http://localhost:8080/health

# 详细健康检查
curl http://localhost:8080/health/detailed

# 就绪检查 (Kubernetes)
curl http://localhost:8080/health/ready

# 存活检查 (Kubernetes)
curl http://localhost:8080/health/live
```

### 查看日志

```bash
# 实时查看日志
tail -f logs/routex.log

# 查看请求日志
tail -f logs/requests.jsonl

# 使用 pino-pretty 格式化日志
tail -f logs/routex.log | bunx pino-pretty
```

### 测试渠道连接

```bash
# 测试单个渠道
curl -X POST http://localhost:8080/api/channels/{channelId}/test

# 测试所有渠道
curl -X POST http://localhost:8080/api/channels/test/all

# 测试所有启用的渠道
curl -X POST http://localhost:8080/api/channels/test/enabled
```

---

## 最佳实践

### 1. 渠道配置

**优先级设置**:
- 数值越小优先级越高
- 为主渠道设置优先级 1
- 为备份渠道设置优先级 10、20 等

**权重设置**:
- 用于 weighted 策略
- 根据渠道容量/成本设置权重
- 高性能渠道可以设置更高权重

**示例配置**:
```json
{
  "channels": [
    {
      "name": "Claude Main",
      "priority": 1,
      "weight": 100,
      "models": ["claude-opus-4"]
    },
    {
      "name": "Claude Backup",
      "priority": 10,
      "weight": 50,
      "models": ["claude-sonnet-4"]
    },
    {
      "name": "Emergency",
      "priority": 100,
      "weight": 10,
      "models": ["claude-haiku-4"]
    }
  ]
}
```

### 2. 路由规则设计

**优先级策略**:
- 特定规则 (100-90): 长上下文、特殊任务
- 通用规则 (80-70): 关键词、正则
- 默认规则 (50-0): 兜底策略

**性能考虑**:
- 使用 `longContext` 类型而不是自定义函数
- 关键词匹配比正则表达式快
- 避免过于复杂的自定义函数

### 3. 监控配置

**Prometheus + Grafana**:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'routex'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

**告警规则**:
```yaml
groups:
  - name: routex
    rules:
      - alert: HighErrorRate
        expr: |
          rate(routex_requests_failed_total[5m]) /
          rate(routex_requests_total[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: CircuitBreakerOpen
        expr: routex_circuit_breaker_open > 0
        for: 1m
        annotations:
          summary: "Circuit breaker opened for {{ $labels.channel }}"
```

### 4. 性能优化

**缓存策略**:
- 启用会话亲和性减少上下文重建
- 使用 LRU 缓存存储频繁访问的数据
- 设置合理的 TTL

**连接复用**:
- Provider 层自动复用连接
- 避免频繁创建/销毁渠道

**批处理**:
- Tee Stream 使用批处理队列
- 默认: 10 项/1 秒批处理

---

## 常见问题

### Q1: 如何更新 API Key？

```bash
curl -X PUT http://localhost:8080/api/channels/{channelId} \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "new-key-xxx"}'
```

### Q2: 熔断器如何工作？

- **触发条件**: 连续失败 5 次
- **恢复时间**: 1 分钟后自动恢复
- **状态**: 渠道状态变为 `rate_limited`
- **指标**: `routex_circuit_breaker_open`

### Q3: 如何导出/导入渠道配置？

```bash
# 导出
curl http://localhost:8080/api/channels/export > channels.json

# 导入
curl -X POST http://localhost:8080/api/channels/import \
  -H "Content-Type: application/json" \
  -d @channels.json
```

### Q4: 如何重置指标？

```bash
curl -X POST http://localhost:8080/api/metrics/reset
```

### Q5: Dashboard 无法访问？

```bash
# 检查 Dashboard 是否已构建
cd dashboard
bun install
bun run build

# 重启服务器
bun start
```

### Q6: 如何启用 HTTPS？

使用反向代理（推荐）:

```nginx
# Nginx 配置
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 下一步

- 📖 阅读 [API Reference](../API_REFERENCE.md) 了解完整 API
- 🎯 查看 [最佳实践案例](../docs/best-practices.md)
- 🚀 探索 [高级功能](../docs/advanced-features.md)
- 💬 加入社区讨论

---

**祝您使用愉快！** 🎉

如有问题，请访问 [GitHub Issues](https://github.com/dctx-team/Routex/issues)
