# 缓存预热机制 (Cache Warmer)

## 概述

Routex 的缓存预热机制是一个智能的缓存管理系统，旨在提高系统启动性能和运行时响应速度。它能够在服务器启动时预加载常用数据，并在后台定期刷新缓存以保持数据的新鲜度。

## 核心特性

### 1. 启动时预热

服务器启动时自动加载以下数据到缓存：
- **Channels (渠道)** - 所有启用的 AI 渠道
- **Models (模型)** - 所有可用的模型列表
- **Routing Rules (路由规则)** - 所有启用的智能路由规则
- **Analytics (分析数据)** - 统计和分析信息

### 2. 后台自动刷新

默认每 **5 分钟**自动刷新缓存，确保数据始终是最新的：
```typescript
backgroundRefresh: {
  enabled: true,
  intervalMs: 300000 // 5 分钟
}
```

### 3. 智能失效策略

当数据发生变化时，自动失效相关缓存：
- 创建/更新/删除渠道 → 失效渠道缓存
- 修改路由规则 → 失效路由缓存
- 自动触发重新预热

### 4. 手动控制

提供完整的 API 接口，支持手动触发预热、失效和配置更新。

## API 参考

### 获取缓存统计

```bash
GET /api/cache/stats
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "totalWarms": 10,
    "lastWarmTime": 1760697683939,
    "lastWarmDuration": 15,
    "itemsCached": {
      "channels": 5,
      "models": 12,
      "routingRules": 3,
      "analytics": 1
    },
    "backgroundRefreshCount": 8,
    "invalidationCount": 2
  }
}
```

**字段说明：**
- `totalWarms` - 总预热次数
- `lastWarmTime` - 最后一次预热时间戳
- `lastWarmDuration` - 最后一次预热耗时（毫秒）
- `itemsCached` - 各类缓存的数量
- `backgroundRefreshCount` - 后台刷新次数
- `invalidationCount` - 缓存失效次数

### 获取缓存配置

```bash
GET /api/cache/config
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "warmOnStartup": true,
    "warmItems": {
      "channels": true,
      "models": true,
      "routingRules": true,
      "analytics": true
    },
    "backgroundRefresh": {
      "enabled": true,
      "intervalMs": 300000
    },
    "smartInvalidation": {
      "enabled": true,
      "autoInvalidateOnUpdate": true
    }
  }
}
```

### 更新缓存配置

```bash
PUT /api/cache/config
Content-Type: application/json

{
  "enabled": true,
  "backgroundRefresh": {
    "enabled": true,
    "intervalMs": 180000  // 修改为 3 分钟
  }
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    // 更新后的完整配置
  }
}
```

### 手动预热缓存

预热所有缓存：
```bash
POST /api/cache/warm
```

预热特定类型的缓存：
```bash
POST /api/cache/warm
Content-Type: application/json

{
  "items": {
    "channels": true,
    "models": true,
    "routingRules": false,
    "analytics": false
  }
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "totalWarms": 11,
    "lastWarmTime": 1760697800000,
    "lastWarmDuration": 12,
    "itemsCached": {
      "channels": 5,
      "models": 12,
      "routingRules": 0,
      "analytics": 0
    }
  }
}
```

### 失效缓存

失效所有缓存：
```bash
POST /api/cache/invalidate
```

失效特定类型的缓存：
```bash
POST /api/cache/invalidate
Content-Type: application/json

{
  "type": "channels"  // 可选值: "channels", "models", "routingRules", "analytics"
}
```

**响应：**
```json
{
  "success": true,
  "message": "Cache (channels) invalidated"
}
```

### 失效并重新预热

这是一个组合操作，先失效缓存，然后立即重新预热：

```bash
POST /api/cache/invalidate-and-warm
Content-Type: application/json

{
  "type": "channels"  // 可选，不提供则全部失效并预热
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "totalWarms": 12,
    "lastWarmTime": 1760697850000,
    "lastWarmDuration": 10,
    "itemsCached": {
      "channels": 5,
      "models": 12,
      "routingRules": 3,
      "analytics": 1
    }
  }
}
```

### 重置统计

重置所有缓存预热统计（不影响缓存内容）：

```bash
POST /api/cache/reset-stats
```

**响应：**
```json
{
  "success": true,
  "message": "Cache warmer stats reset"
}
```

## 使用场景

### 场景 1：添加新渠道后刷新缓存

```bash
# 1. 添加新渠道
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Channel",
    "type": "anthropic",
    "apiKey": "sk-ant-xxx",
    "models": ["claude-opus-4"]
  }'

# 2. 失效并重新预热渠道缓存
curl -X POST http://localhost:8080/api/cache/invalidate-and-warm \
  -H "Content-Type: application/json" \
  -d '{"type": "channels"}'

# 3. 验证缓存已更新
curl http://localhost:8080/api/cache/stats
```

### 场景 2：调整后台刷新频率

生产环境可能需要更频繁的刷新：

```bash
# 修改为每 2 分钟刷新一次
curl -X PUT http://localhost:8080/api/cache/config \
  -H "Content-Type: application/json" \
  -d '{
    "backgroundRefresh": {
      "enabled": true,
      "intervalMs": 120000
    }
  }'
```

### 场景 3：禁用缓存预热

某些调试场景可能需要禁用缓存：

```bash
# 禁用缓存预热
curl -X PUT http://localhost:8080/api/cache/config \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# 重新启用
curl -X PUT http://localhost:8080/api/cache/config \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### 场景 4：监控缓存性能

```bash
# 定期检查缓存统计
watch -n 10 'curl -s http://localhost:8080/api/cache/stats | jq ".data | {warms: .totalWarms, duration: .lastWarmDuration, items: .itemsCached}"'
```

输出示例：
```json
{
  "warms": 15,
  "duration": 12,
  "items": {
    "channels": 5,
    "models": 12,
    "routingRules": 3,
    "analytics": 1
  }
}
```

## 性能优化建议

### 1. 调整预热频率

根据数据变化频率调整后台刷新间隔：

- **频繁变化**（< 1小时）：1-3 分钟
  ```json
  {"intervalMs": 120000}  // 2 分钟
  ```

- **中等变化**（1-6小时）：5-10 分钟（默认）
  ```json
  {"intervalMs": 300000}  // 5 分钟
  ```

- **很少变化**（> 6小时）：15-30 分钟
  ```json
  {"intervalMs": 900000}  // 15 分钟
  ```

### 2. 选择性预热

如果某些数据不常用，可以关闭其预热：

```json
{
  "warmItems": {
    "channels": true,
    "models": true,
    "routingRules": true,
    "analytics": false  // 分析数据不常用，关闭预热
  }
}
```

### 3. 监控预热性能

关注 `lastWarmDuration` 字段：
- **< 50ms** - 优秀
- **50-200ms** - 正常
- **> 200ms** - 需要优化（减少预热项目或增加间隔）

### 4. 智能失效

确保智能失效策略启用：
```json
{
  "smartInvalidation": {
    "enabled": true,
    "autoInvalidateOnUpdate": true
  }
}
```

## 技术实现

### 预热流程

```
服务器启动
    ↓
初始化 CacheWarmer
    ↓
启动时预热 (warmOnStartup)
    ├─ 预热 Channels
    ├─ 预热 Models
    ├─ 预热 Routing Rules
    └─ 预热 Analytics
    ↓
启动后台刷新定时器
    ↓
每 5 分钟 (可配置)
    ├─ 重新预热所有数据
    └─ 更新统计信息
```

### 失效流程

```
数据变更事件
    ↓
智能失效检测
    ↓
清除相关缓存
    ├─ LoadBalancer Session Cache
    ├─ 内部缓存数据
    └─ 记录失效次数
    ↓
（可选）自动重新预热
```

### 内存占用

缓存预热的内存占用极小：

| 项目 | 内存占用估算 |
|------|-------------|
| Channels (100个) | ~50KB |
| Models (500个) | ~25KB |
| Routing Rules (50个) | ~30KB |
| Analytics (1个) | ~5KB |
| **总计** | **~110KB** |

即使在大规模部署中（1000+ 渠道），内存占用也不会超过 1MB。

## 与其他功能集成

### 与 Load Balancer 集成

缓存预热会预加载渠道到 LoadBalancer 的选择缓存中：

```typescript
// CacheWarmer 触发 LoadBalancer 缓存
await this.loadBalancer.select(enabledChannels, {
  model: channel.models[0]
});
```

### 与 SmartRouter 集成

预热路由规则确保 SmartRouter 快速匹配：

```typescript
const rules = this.db.getEnabledRoutingRules();
// Rules are already in memory for SmartRouter
```

### 与 Metrics 集成

记录缓存预热性能指标：

```typescript
metrics.incrementCounter('routex_cache_warm_total');
metrics.observeHistogram('routex_cache_warm_duration_seconds', duration / 1000);
metrics.incrementCounter('routex_cache_warm_failed_total');  // 失败时
metrics.incrementCounter('routex_cache_invalidation_total', 1, { type });
```

## 故障排除

### 问题 1：预热失败

**症状：** `/api/cache/stats` 显示 `lastWarmDuration: 0` 或错误日志

**解决方案：**
```bash
# 1. 查看日志
tail -f logs/routex.log | grep "Cache"

# 2. 检查配置
curl http://localhost:8080/api/cache/config

# 3. 手动触发预热测试
curl -X POST http://localhost:8080/api/cache/warm
```

### 问题 2：后台刷新不工作

**症状：** `backgroundRefreshCount` 一直是 0

**解决方案：**
```bash
# 检查配置是否启用
curl http://localhost:8080/api/cache/config | jq '.data.backgroundRefresh'

# 如果 enabled: false，重新启用
curl -X PUT http://localhost:8080/api/cache/config \
  -H "Content-Type: application/json" \
  -d '{"backgroundRefresh": {"enabled": true}}'
```

### 问题 3：缓存数据不是最新

**症状：** 添加渠道后，缓存统计未更新

**解决方案：**
```bash
# 方法 1：手动失效并预热
curl -X POST http://localhost:8080/api/cache/invalidate-and-warm

# 方法 2：等待后台自动刷新（最多 5 分钟）

# 方法 3：减少刷新间隔
curl -X PUT http://localhost:8080/api/cache/config \
  -H "Content-Type: application/json" \
  -d '{"backgroundRefresh": {"intervalMs": 60000}}'  // 1 分钟
```

## 最佳实践

### 1. 生产环境配置

```json
{
  "enabled": true,
  "warmOnStartup": true,
  "warmItems": {
    "channels": true,
    "models": true,
    "routingRules": true,
    "analytics": true
  },
  "backgroundRefresh": {
    "enabled": true,
    "intervalMs": 300000  // 5 分钟
  },
  "smartInvalidation": {
    "enabled": true,
    "autoInvalidateOnUpdate": true
  }
}
```

### 2. 开发环境配置

开发时可以禁用后台刷新减少日志输出：

```json
{
  "enabled": true,
  "warmOnStartup": true,
  "backgroundRefresh": {
    "enabled": false  // 开发时关闭自动刷新
  }
}
```

### 3. 监控告警

设置 Prometheus 告警规则：

```yaml
groups:
  - name: cache_warmer
    rules:
      - alert: CacheWarmTooSlow
        expr: routex_cache_warm_duration_seconds > 1
        for: 5m
        annotations:
          summary: "Cache warming is taking too long"

      - alert: CacheWarmFailed
        expr: rate(routex_cache_warm_failed_total[5m]) > 0
        annotations:
          summary: "Cache warming is failing"
```

### 4. 定期审计

定期检查缓存统计：

```bash
# 每天执行一次
curl -s http://localhost:8080/api/cache/stats | \
  jq '{
    totalWarms: .data.totalWarms,
    avgDuration: .data.lastWarmDuration,
    backgroundRefreshes: .data.backgroundRefreshCount,
    items: .data.itemsCached
  }'
```

## 总结

缓存预热机制为 Routex 提供了：

- ✅ **快速启动** - 服务器启动时预加载所有必要数据
- ✅ **自动刷新** - 后台定期更新缓存，无需手动干预
- ✅ **智能失效** - 数据变更时自动更新相关缓存
- ✅ **灵活控制** - 完整的 API 支持手动管理
- ✅ **低开销** - 内存占用小，性能影响可忽略
- ✅ **可监控** - 完整的统计和指标支持

通过合理配置和使用缓存预热，可以显著提升 Routex 的性能和响应速度！

---

**实现日期：** 2025-10-17
**版本：** 1.1.0-beta
**状态：** ✅ 生产就绪
