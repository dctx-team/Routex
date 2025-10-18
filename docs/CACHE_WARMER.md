#  (Cache Warmer)

## 

Routex 

## 

### 1. 

- **Channels ** -  AI 
- **Models **
- **Routing Rules **
- **Analytics **
### 2. 

 **5 **
```typescript
backgroundRefresh: {
  enabled: true,
  intervalMs: 300000 // 5 
}
```

### 3. 

- // → 
-  →
### 4. 

 API 

## API 

### 

```bash
GET /api/cache/stats
```

****
```json
{
  success: true,
  data: {
    totalWarms: 10,
    lastWarmTime: 1760697683939,
    lastWarmDuration: 15,
    itemsCached: {
      channels: 5,
      models: 12,
      routingRules: 3,
      analytics: 1
    },
    backgroundRefreshCount: 8,
    invalidationCount: 2
  }
}
```

****
- `totalWarms`
- `lastWarmTime`
- `lastWarmDuration`
- `itemsCached`
- `backgroundRefreshCount`
- `invalidationCount`
### 

```bash
GET /api/cache/config
```

****
```json
{
  success: true,
  data: {
    enabled: true,
    warmOnStartup: true,
    warmItems: {
      channels: true,
      models: true,
      routingRules: true,
      analytics: true
    },
    backgroundRefresh: {
      enabled: true,
      intervalMs: 300000
    },
    smartInvalidation: {
      enabled: true,
      autoInvalidateOnUpdate: true
    }
  }
}
```

### 

```bash
PUT /api/cache/config
Content-Type: application/json

{
  enabled: true,
  backgroundRefresh: {
    enabled: true,
    intervalMs: 180000  //  3 
  }
}
```

****
```json
{
  success: true,
  data: {
    // 
  }
}
```

### 

```bash
POST /api/cache/warm
```

```bash
POST /api/cache/warm
Content-Type: application/json

{
  items: {
    channels: true,
    models: true,
    routingRules: false,
    analytics: false
  }
}
```

****
```json
{
  success: true,
  data: {
    totalWarms: 11,
    lastWarmTime: 1760697800000,
    lastWarmDuration: 12,
    itemsCached: {
      channels: 5,
      models: 12,
      routingRules: 0,
      analytics: 0
    }
  }
}
```

### 

```bash
POST /api/cache/invalidate
```

```bash
POST /api/cache/invalidate
Content-Type: application/json

{
  type: channels  // : channels, models, routingRules, analytics
}
```

****
```json
{
  success: true,
  message: Cache (channels) invalidated
}
```

### 

```bash
POST /api/cache/invalidate-and-warm
Content-Type: application/json

{
  type: channels  // 
}
```

****
```json
{
  success: true,
  data: {
    totalWarms: 12,
    lastWarmTime: 1760697850000,
    lastWarmDuration: 10,
    itemsCached: {
      channels: 5,
      models: 12,
      routingRules: 3,
      analytics: 1
    }
  }
}
```

### 

```bash
POST /api/cache/reset-stats
```

****
```json
{
  success: true,
  message: Cache warmer stats reset
}
```

## 

###  1

```bash
# 1. 
curl -X POST http://localhost:8080/api/channels \
  -H Content-Type: application/json \
  -d '{
    name: New Channel,
    type: anthropic,
    apiKey: sk-ant-xxx,
    models: [claude-opus-4]
  }'

# 2. 
curl -X POST http://localhost:8080/api/cache/invalidate-and-warm \
  -H Content-Type: application/json \
  -d '{type: channels}'

# 3. 
curl http://localhost:8080/api/cache/stats
```

###  2

```bash
#  2 
curl -X PUT http://localhost:8080/api/cache/config \
  -H Content-Type: application/json \
  -d '{
    backgroundRefresh: {
      enabled: true,
      intervalMs: 120000
    }
  }'
```

###  3

```bash
# 
curl -X PUT http://localhost:8080/api/cache/config \
  -H Content-Type: application/json \
  -d '{enabled: false}'

# 
curl -X PUT http://localhost:8080/api/cache/config \
  -H Content-Type: application/json \
  -d '{enabled: true}'
```

###  4

```bash
# 
watch -n 10 'curl -s http://localhost:8080/api/cache/stats | jq .data | {warms: .totalWarms, duration: .lastWarmDuration, items: .itemsCached}'
```

```json
{
  warms: 15,
  duration: 12,
  items: {
    channels: 5,
    models: 12,
    routingRules: 3,
    analytics: 1
  }
}
```

## 

### 1. 

- ****< 11-3 
  ```json
  {intervalMs: 120000}  // 2 
  ```

- ****1-65-10 
  ```json
  {intervalMs: 300000}  // 5 
  ```

- ****> 615-30 
  ```json
  {intervalMs: 900000}  // 15 
  ```

### 2. 

```json
{
  warmItems: {
    channels: true,
    models: true,
    routingRules: true,
    analytics: false  // 
  }
}
```

### 3. 

 `lastWarmDuration` 
- **< 50ms**
- **50-200ms**
- **> 200ms**
### 4. 

```json
{
  smartInvalidation: {
    enabled: true,
    autoInvalidateOnUpdate: true
  }
}
```

## 

### 

```

    ↓
 CacheWarmer
    ↓
 (warmOnStartup)
    ├─  Channels
    ├─  Models
    ├─  Routing Rules
    └─  Analytics
    ↓

    ↓
 5  
    ├─ 
    └─ 
```

### 

```

    ↓

    ↓

    ├─ LoadBalancer Session Cache
    ├─ 
    └─ 
    ↓

```

### 

|  |  |
|------|-------------|
| Channels (100) | ~50KB |
| Models (500) | ~25KB |
| Routing Rules (50) | ~30KB |
| Analytics (1) | ~5KB |
| **** | **~110KB** |

1000+  1MB

## 

###  Load Balancer 

 LoadBalancer 

```typescript
// CacheWarmer  LoadBalancer 
await this.loadBalancer.select(enabledChannels, {
  model: channel.models[0]
});
```

###  SmartRouter 

 SmartRouter 

```typescript
const rules = this.db.getEnabledRoutingRules;
// Rules are already in memory for SmartRouter
```

###  Metrics 

```typescript
metrics.incrementCounter('routex_cache_warm_total');
metrics.observeHistogram('routex_cache_warm_duration_seconds', duration / 1000);
metrics.incrementCounter('routex_cache_warm_failed_total');  // 
metrics.incrementCounter('routex_cache_invalidation_total', 1, { type });
```

## 

###  1

**** `/api/cache/stats`  `lastWarmDuration: 0` 

****
```bash
# 1. 
tail -f logs/routex.log | grep Cache

# 2. 
curl http://localhost:8080/api/cache/config

# 3. 
curl -X POST http://localhost:8080/api/cache/warm
```

###  2

**** `backgroundRefreshCount`  0

****
```bash
# 
curl http://localhost:8080/api/cache/config | jq '.data.backgroundRefresh'

#  enabled: false
curl -X PUT http://localhost:8080/api/cache/config \
  -H Content-Type: application/json \
  -d '{backgroundRefresh: {enabled: true}}'
```

###  3

**** 

****
```bash
#  1
curl -X POST http://localhost:8080/api/cache/invalidate-and-warm

#  2 5 

#  3
curl -X PUT http://localhost:8080/api/cache/config \
  -H Content-Type: application/json \
  -d '{backgroundRefresh: {intervalMs: 60000}}'  // 1 
```

## 

### 1. 

```json
{
  enabled: true,
  warmOnStartup: true,
  warmItems: {
    channels: true,
    models: true,
    routingRules: true,
    analytics: true
  },
  backgroundRefresh: {
    enabled: true,
    intervalMs: 300000  // 5 
  },
  smartInvalidation: {
    enabled: true,
    autoInvalidateOnUpdate: true
  }
}
```

### 2. 

```json
{
  enabled: true,
  warmOnStartup: true,
  backgroundRefresh: {
    enabled: false  // 
  }
}
```

### 3. 

 Prometheus 

```yaml
groups:
  - name: cache_warmer
    rules:
      - alert: CacheWarmTooSlow
        expr: routex_cache_warm_duration_seconds > 1
        for: 5m
        annotations:
          summary: Cache warming is taking too long

      - alert: CacheWarmFailed
        expr: rate(routex_cache_warm_failed_total[5m]) > 0
        annotations:
          summary: Cache warming is failing
```

### 4. 

```bash
# 
curl -s http://localhost:8080/api/cache/stats | \
  jq '{
    totalWarms: .data.totalWarms,
    avgDuration: .data.lastWarmDuration,
    backgroundRefreshes: .data.backgroundRefreshCount,
    items: .data.itemsCached
  }'
```

## 

 Routex 

- ✅ ****
- ✅ ****
- ✅ ****
- ✅ **** -  API 
- ✅ ****
- ✅ ****
 Routex 

---

**** 2025-10-17
**** 1.1.0-beta
**** ✅ 
