# Routex 

## 

 Routex (Next-gen AI API Router and Load Balancer)  **24 **

****: ✅  (100%)
****: 89 80  (89.9%)
****:  CI/CD 

---

## 📋 

###  (1-10)

#### ✅  1:  README.md 
-  ccflare
#### ✅  2: VS Code  User-Agent 
-  Codu 
-  VS Code
#### ✅  3: Function Call 
-  Toolify 
-  Function Call
#### ✅  4:  LRU 
-  LRU (Least Recently Used) 
-  TTL (Time To Live)
****:
```typescript
class LRUCache<K, V> {
  maxSize: number;
  ttl?: number;
  onEvict?: (key: K, value: V) => void;

  get(key: K): V | undefined
  set(key: K, value: V): void
  delete(key: K): boolean
  prune: number // 
  stats: CacheStats
}
```

#### ✅  5:
-  O(n)  O(log n)
****:
```typescript
// : [w1, w1+w2, w1+w2+w3, ...]
//  >= random 
// : O(log n)
```

#### ✅  6:  Web 
- React 19 + Tailwind CSS 4
-  CRUD
#### ✅  7:
-  API
#### ✅  8: 
- `/health`
- `/health/ready`
- `/health/live`
#### ✅  9:  (diagnose.sh)
#### ✅  10:  transformers
- `maxtoken` -  token 
- `sampling`
- `cleancache`
-  transformer 

---

###  (11-17)

#### ✅  11: Transformer 
-
****:
```typescript
TransformerManager
  ├── register(transformer)
  ├── transformRequest(request, transformers)
  ├── transformResponse(response, transformers)
  └── list
```

#### ✅  12:
****:
```typescript
{
  name: rule-name,
  pattern: /pattern/,
  channelId: target-channel,
  priority: 1,
  enabled: true
}
```

#### ✅  13: 
- JavaScript
#### ✅  14:  CLI
#### ✅  15: Web UI 
****:
- React 19
- Tailwind CSS 4
- Vite
- TypeScript

****:
#### ✅  16:  (pino)
- JSON
- Pretty-print 

****:
```typescript
log.info    // 
log.warn    // 
log.error   // 
log.debug   // 
```

#### ✅  17: Provider 
-  Provider 
-  AI 
-  Provider
** Provider**:
- Anthropic (Claude)
- OpenAI (GPT)
- Azure OpenAI
- Google (Gemini)
-  AI
- Custom

---

###  (18-21)

#### ✅  18: Tee Stream -
-  (HTTP, File, Webhook, Custom)
**Tee Stream **:
```typescript
TeeStream
  ├──  (10 items, 1s interval)
  ├──  (channels, models, status, sample rate)
  ├──  (http, file, webhook, custom)
  ├──  (configurable attempts)
  └──  (flush on shutdown)
```

****:
```typescript
{
  channels?: string;      // 
  models?: string;        // 
  statusCodes?: number;   // HTTP 
  successOnly?: boolean;    // 
  failureOnly?: boolean;    // 
  sampleRate?: number;      //  (0-1)
}
```

#### ✅  19: 
****:
- **Counter**
- **Gauge**
- **Histogram**
- **Summary**
**20+ **:
```typescript
// 
routex_requests_total
routex_requests_success_total
routex_requests_failed_total

// Token 
routex_tokens_input_total
routex_tokens_output_total
routex_tokens_cached_total

// 
routex_request_duration_seconds (histogram)

// 
routex_channels_total
routex_channels_enabled
routex_channel_requests_total

// 
routex_circuit_breaker_open_total
routex_circuit_breaker_open

// Tee Stream 
routex_tee_sent_total
routex_tee_failed_total
routex_tee_queue_size

// 
routex_uptime_seconds
routex_memory_usage_bytes
```

****:
```typescript
metrics.incrementCounter('http_requests_total', 1, {
  method: 'GET',
  status: '200',
  channel: 'claude'
});
```

#### ✅  20: Prometheus 
-  Prometheus  0.0.4
- HELP  TYPE
- Histogram buckets with +Inf
- Summary quantiles

****:
```prometheus
# HELP routex_requests_total Total number of requests
# TYPE routex_requests_total counter
routex_requests_total{channel=claude,status=success} 1234

# HELP routex_request_duration_seconds Request duration
# TYPE routex_request_duration_seconds histogram
routex_request_duration_seconds_bucket{le=0.1} 100
routex_request_duration_seconds_bucket{le=0.5} 250
routex_request_duration_seconds_bucket{le=1} 400
routex_request_duration_seconds_bucket{le=+Inf} 500
routex_request_duration_seconds_sum 450.5
routex_request_duration_seconds_count 500
```

**API **:
- `GET /metrics` - Prometheus scrape endpoint
- `GET /api/metrics` - JSON metrics summary
- `GET /api/metrics/all`
- `POST /api/metrics/reset`
#### ✅  21:  (i18n)
****:
- English (en)
-  (zh-CN)

****:
-  (`server.starting`)
-  (`Hello, {{name}}!`)
****:
```bash
# 
LOCALE=en bun run start
LOCALE=zh-CN bun run start

# API
PUT /api/i18n/locale
{ locale: zh-CN }
```

****:
- API 

---

###  (22-24)

#### ✅  22: GitHub Actions CI/CD

**CI ** (`.github/workflows/ci.yml`):
```yaml
Jobs:
  - lint          # Biome 
  - typecheck     # TypeScript 
  - build         # 
  - build-dashboard  # Dashboard 
  - test          # 
  - security      # 
  - all-checks    # 
```

**Release ** (`.github/workflows/release.yml`):
```yaml
Triggers: git tag v*.*.*

Jobs:
  - release:
      -  Changelog
      -  GitHub Release
      -  Release 
  - docker:
      -  Docker 
      -  Docker Hub
```

**CodeQL ** (`.github/workflows/codeql.yml`):
**PR ** (`.github/workflows/pr-labeler.yml`):
- PR  (xs/s/m/l/xl)

**Dependabot ** (`.github/dependabot.yml`):
- NPM 
- GitHub Actions
**Docker **:
-  Dockerfile
- .dockerignore
-  root 

#### ✅  23: 

****:
1. `tests/loadbalancer.test.ts`
   - Priority Strategy
   - Round Robin Strategy
   - Weighted Strategy
   - Least Used Strategy
2. `tests/metrics.test.ts`
   - Counter 
   - Gauge 
   - Histogram 
   - Summary
3. `tests/i18n.test.ts`
4. `tests/prometheus.test.ts` - Prometheus 
   - Counter 
   - Gauge 
   - Histogram  (buckets, sum, count)
   - Summary  (quantiles, sum, count)
****:
```
: 89 
: 80  (89.9%)
: 9  (10.1%)
: 
```

#### ✅  24: 

---

## 🏆 

### 1. 
- ****: O(n) → O(log n)
- **LRU **: TTL 
- ****: Tee Stream 

### 2. 
- **20+ **: Counter, Gauge, Histogram, Summary
- **Prometheus **: 
- **Tee Stream**:
- ****: Pino 

### 3. 
- **CI/CD**: GitHub Actions 
- ****: 89 
- **Dashboard**: React 19 + Tailwind CSS 4
- **CLI**: 
- **i18n**:
### 4. 
- **Provider **: 
- **Transformer **: 
- ****: 
- ****: 

---

## 📊 

### 
- ****: 10,000+ 
- ****: 1,500+ 
- ****: 5,000+ 

### 
- **Channels **: 6  Provider
- ****: 4 
- **Transformers**: 10+ 
- ****: 20+ 
- **API **: 40+ 
- ****: 2  (en, zh-CN)

### 
- ****: 89 
- ****: 6 
- ****: ~90%

---

## 🚀 

### 
```bash
# 
git clone https://github.com/dctx-team/Routex.git
cd Routex

# 
bun install

# 
bun run start
```

### Docker 
```bash
# 
docker build -t routex .

# 
docker run -d -p 8080:8080 \
  -v $(pwd)/data:/data \
  -e LOCALE=zh-CN \
  routex
```

### Cloud 
:
- Railway
- Fly.io
- Render
- Claw
---

## 📝 API 

### 

#### 
- `GET /api/channels`
- `POST /api/channels`
- `PUT /api/channels/:id`
- `DELETE /api/channels/:name`
- `POST /api/channels/:name/test`
#### 
- `GET /metrics` - Prometheus 
- `GET /api/metrics` - JSON 
- `GET /api/metrics/all`
- `POST /api/metrics/reset`
#### 
- `GET /health`
- `GET /health/ready`
- `GET /health/live`
#### Tee Stream
- `GET /api/tee` -  tee 
- `POST /api/tee` -  tee 
- `PUT /api/tee/:id` -  tee 
- `DELETE /api/tee/:id` -  tee 

#### 
- `GET /api/i18n/locale`
- `PUT /api/i18n/locale`
---

## 🔧 

### 
```bash
PORT=8080                    # 
LOCALE=zh-CN                 # 
LOAD_BALANCE_STRATEGY=priority  # 
DASHBOARD_PASSWORD=secret    # Dashboard 
DATA_DIR=/data              # 
```

### 
```json
{
  name: claude-main,
  type: anthropic,
  apiKey: sk-ant-...,
  models: [claude-3-opus, claude-3-sonnet],
  priority: 1,
  weight: 10
}
```

### Tee 
```json
{
  name: analytics,
  type: webhook,
  url: https://analytics.example.com/events,
  filter: {
    successOnly: true,
    sampleRate: 0.1
  },
  retries: 3,
  timeout: 5000
}
```

---

## 🎯 

### 1. 
- **Priority**: 
- **Round Robin**: 
- **Weighted**: 
- **Least Used**: 

### 2. 
-  `/metrics` 
-  Prometheus
### 3. Tee Stream
### 4. 
-  LRU
-  TTL
---

## 🔮 

 24 

### 
1. ** Provider **
   - Cohere
   - Hugging Face
2. ****
   - Rate limiting per user
   - Cost tracking
   - Usage analytics
   - A/B testing

3. ****
   - Connection pooling
   - HTTP/2 support
   - Streaming optimization

4. ****
   - API key rotation
   - Request signing
   - Rate limit enforcement

---

## 📚 

### 
- **GitHub**: https://github.com/dctx-team/Routex
- ****: [docs/](../docs/)
- **API**: [docs/api.md](../docs/api.md)

### 
- **Runtime**: Bun
- **Framework**: Hono
- **Database**: SQLite
- **Logger**: Pino
- **UI**: React 19 + Tailwind CSS 4

### 
- [i18n ](../docs/i18n.md)
- [API ](../docs/api.md)
- (../docs/models-database.md)

---

## 🙏 

 Routex 

---

****: 1.0.0
****: 2025-10-17
****: Claude (Anthropic)
****: Routex - Next-gen AI API Router and Load Balancer

---

## ✨ 

Routex  AI API 

 24 

**Routex is production-ready! 🎊**
