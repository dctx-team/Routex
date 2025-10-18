# Routex 

 Routex Routex 

## 📋 

1. (#)
2. (#)
3. (#)
4. (#)
5. (#)
6. (#)
7. (#)

---

## 

### 

- **Bun** ≥ 1.2.0 ((https://bun.sh))
- ****: Linux, macOS, or Windows (WSL)

### 

```bash
# 1. 
git clone https://github.com/dctx-team/Routex.git
cd Routex

# 2. 
bun install

# 3. 
bun start
```

### 

Routex 

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

---

## 

###  AI 

####  1:  CLI 

```bash
# 
bun run cli

#  Provider 
```

####  2:  API

```bash
curl -X POST http://localhost:3000/api/channels \
  -H Content-Type: application/json \
  -d '{
    name: Claude Main,
    type: anthropic,
    apiKey: sk-ant-xxx,
    models: [claude-opus-4, claude-sonnet-4],
    priority: 1,
    weight: 10
  }'
```

####  3:  Dashboard

 http://localhost:3000/dashboard Channels  Add Channel

### 

```bash
# 
curl -X PUT http://localhost:3000/api/load-balancer/strategy \
  -H Content-Type: application/json \
  -d '{strategy: priority}'

# :
# - priority      # 
# - round_robin   # 
# - weighted      # 
# - least_used    # 
```

---

## 

### 1.  (SmartRouter)

####  1: 

 60K tokens  Gemini

```bash
curl -X POST http://localhost:3000/api/routing/rules \
  -H Content-Type: application/json \
  -d '{
    name: Long Context to Gemini,
    type: longContext,
    condition: {
      tokenThreshold: 60000
    },
    targetChannel: gemini-channel-id,
    targetModel: gemini-2.5-pro,
    priority: 100,
    enabled: true
  }'
```

####  2: 

 Claude Opus

```bash
curl -X POST http://localhost:3000/api/routing/rules \
  -H Content-Type: application/json \
  -d '{
    name: Code Review to Opus,
    type: custom,
    condition: {
      keywords: [code review, review this, analyze code]
    },
    targetChannel: claude-opus-id,
    priority: 90,
    enabled: true
  }'
```

####  3: 

```bash
{
  name: Math Questions,
  type: custom,
  condition: {
    regex: \\b(calculate|compute|solve|equation)\\b
  },
  targetChannel: math-specialist-id,
  priority: 85
}
```

### 2.  (Transformers)

####  OpenRouter 

```bash
curl -X POST http://localhost:3000/api/channels \
  -H Content-Type: application/json \
  -d '{
    name: OpenRouter,
    type: openai,
    baseUrl: https://openrouter.ai/api/v1/chat/completions,
    apiKey: sk-or-xxx,
    models: [anthropic/claude-opus-4],
    transformers: {
      use: [openai]
    }
  }'
```

 Anthropic Routex  OpenAI 

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H Content-Type: application/json \
  -d '{
    model: claude-opus-4,
    messages: [
      {role: user, content: Hello!}
    ],
    max_tokens: 100
  }'
```

####  Transformers

- `anthropic` - Anthropic Messages 
- `openai` - OpenAI Chat Completions 
- `maxtoken` -  max_tokens 
- `sampling`
- `cleancache`
### 3.  (Session Affinity)

 `X-Session-ID` 

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H X-Session-ID: user-123-conversation-abc \
  -H Content-Type: application/json \
  -d '{
    model: claude-sonnet-4,
    messages: [
      {role: user, content: ...}
    ]
  }'
```

****:
- : 5
---

## 

### 1.  (Distributed Tracing)

#### 

Routex 

```bash
curl -I http://localhost:3000/v1/messages \
  -H Content-Type: application/json \
  -d '{model: claude-sonnet-4, messages: [...]}'

# :
# X-Trace-Id: trace-1697123456789-abc123
# X-Span-Id: span-xyz789
# X-Channel-Id: channel-uuid
# X-Latency-Ms: 234
```

#### 

```bash
# 
curl http://localhost:3000/api/tracing/stats

# :
{
  totalSpans: 150,
  completed: 148,
  success: 145,
  error: 3,
  averageDuration: 234
}

#  Trace  Spans
curl http://localhost:3000/api/tracing/traces/trace-1697123456789-abc123

# :
{
  traceId: trace-1697123456789-abc123,
  spans: [
    {
      spanId: span-xyz789,
      name: proxy.handle,
      duration: 1964,
      status: success,
      tags: {
        method: POST,
        latency: 1960
      }
    },
    {
      spanId: span-abc123,
      parentSpanId: span-xyz789,
      name: proxy.forward,
      duration: 1954,
      status: success
    }
  ]
}

#  Span
curl http://localhost:3000/api/tracing/spans/span-xyz789

#  Spans ( 1 )
curl -X POST http://localhost:3000/api/tracing/clear \
  -H Content-Type: application/json \
  -d '{olderThanMs: 3600000}'
```

### 2. Prometheus 

#### 

```bash
# Prometheus 
curl http://localhost:3000/metrics

# JSON 
curl http://localhost:3000/api/metrics

# 
curl http://localhost:3000/api/metrics/all
```

#### 

****:
- `routex_requests_total`
- `routex_requests_success_total`
- `routex_requests_failed_total`
- `routex_request_duration_seconds`
**Token **:
- `routex_tokens_input_total` -  tokens 
- `routex_tokens_output_total` -  tokens 
- `routex_tokens_cached_total` -  tokens 

****:
- `routex_channels_total`
- `routex_channels_enabled`
- `routex_channel_requests_total`
****:
- `routex_circuit_breaker_open_total`
- `routex_circuit_breaker_open`
### 3. Tee Stream (/)

####  Tee 

```bash
# 
curl -X POST http://localhost:3000/api/tee \
  -H Content-Type: application/json \
  -d '{
    name: Request Log,
    type: file,
    enabled: true,
    filePath: ./logs/requests.jsonl,
    filter: {
      successOnly: true,
      sampleRate: 1.0
    },
    retries: 3
  }'

#  Webhook 
curl -X POST http://localhost:3000/api/tee \
  -H Content-Type: application/json \
  -d '{
    name: Analytics Webhook,
    type: webhook,
    enabled: true,
    url: https://analytics.example.com/events,
    method: POST,
    headers: {
      Authorization: Bearer token
    },
    filter: {
      sampleRate: 0.1
    },
    retries: 5,
    timeout: 10000
  }'
```

#### 

```typescript
{
  channels?: string;      // 
  models?: string;        // 
  statusCodes?: number;   // 
  successOnly?: boolean;    // 
  failureOnly?: boolean;    // 
  sampleRate?: number;      //  (0-1)
}
```

### 4.  (i18n)

#### 

```bash
# 
curl -X PUT http://localhost:3000/api/i18n/locale \
  -H Content-Type: application/json \
  -d '{locale: zh-CN}'

# 
curl -X PUT http://localhost:3000/api/i18n/locale \
  -H Content-Type: application/json \
  -d '{locale: en}'

# 
curl http://localhost:3000/api/i18n/locale
```

#### 

```bash
# 
LOCALE=zh-CN bun start

# 
LOCALE=en bun start
```

---

## 

### 

```bash
# 
curl http://localhost:3000/health

# 
curl http://localhost:3000/health/detailed

#  (Kubernetes)
curl http://localhost:3000/health/ready

#  (Kubernetes)
curl http://localhost:3000/health/live
```

### 

```bash
# 
tail -f logs/routex.log

# 
tail -f logs/requests.jsonl

#  pino-pretty 
tail -f logs/routex.log | bunx pino-pretty
```

### 

```bash
# 
curl -X POST http://localhost:3000/api/channels/{channelId}/test

# 
curl -X POST http://localhost:3000/api/channels/test/all

# 
curl -X POST http://localhost:3000/api/channels/test/enabled
```

---

## 

### 1. 

****:
-  1
-  1020 

****:
-  weighted 
-
****:
```json
{
  channels: [
    {
      name: Claude Main,
      priority: 1,
      weight: 100,
      models: [claude-opus-4]
    },
    {
      name: Claude Backup,
      priority: 10,
      weight: 50,
      models: [claude-sonnet-4]
    },
    {
      name: Emergency,
      priority: 100,
      weight: 10,
      models: [claude-haiku-4]
    }
  ]
}
```

### 2. 

****:
-  (100-90): 
-  (80-70): 
-  (50-0): 

****:
-  `longContext`
### 3. 

**Prometheus + Grafana**:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'routex'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

****:
```yaml
groups:
  - name: routex
    rules:
      - alert: HighErrorRate
        expr: |
          rate(routex_requests_failed_total[5m])
          rate(routex_requests_total[5m]) > 0.1
        for: 5m
        annotations:
          summary: High error rate detected

      - alert: CircuitBreakerOpen
        expr: routex_circuit_breaker_open > 0
        for: 1m
        annotations:
          summary: Circuit breaker opened for {{ $labels.channel }}
```

### 4. 

****:
-  LRU 
-  TTL

****:
- Provider 
-
****:
- Tee Stream 
- : 10 /1 

---

## 

### Q1:  API Key

```bash
curl -X PUT http://localhost:3000/api/channels/{channelId} \
  -H Content-Type: application/json \
  -d '{apiKey: new-key-xxx}'
```

### Q2: 

- ****:  5 
- ****: 1 
- ****:  `rate_limited`
- ****: `routex_circuit_breaker_open`

### Q3:
```bash
# 
curl http://localhost:3000/api/channels/export > channels.json

# 
curl -X POST http://localhost:3000/api/channels/import \
  -H Content-Type: application/json \
  -d @channels.json
```

### Q4: 

```bash
curl -X POST http://localhost:3000/api/metrics/reset
```

### Q5: Dashboard 

```bash
#  Dashboard 
cd dashboard
bun install
bun run build

# 
bun start
```

### Q6:  HTTPS

:

```nginx
# Nginx 
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 

- 📖  [API Reference](../API_REFERENCE.md)  API
- 🎯  (../docs/best-practices.md)
- 🚀  (../docs/advanced-features.md)
- 💬 

---

**** 🎉

 [GitHub Issues](https://github.com/dctx-team/Routex/issues)
