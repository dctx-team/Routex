#  TTL 

> ****: Routex -  AI API 
> ****: v1.1.0-beta
> ****: 2025-11-07
> ****:  -  TTL 

---

## 📊 

 ** TTL ** TTL

### ✅ 

- ****: `src/db/dynamic-ttl.ts` (~400 )
- ****: `src/db/database.ts` ( TTL )
- ****: 100%
- ****: ⭐⭐⭐⭐⭐

---

## 🎯 

### 

 30  TTL

❌ ** TTL **
-  TTL 
-  TTL 

❌ ****
-  TTL
-  TTL 

❌ ** TTL**
-  TTL 

### 

 TTL 

## 1. 

### 1.1  TTL 

```typescript
/**
 *  TTL
 */
if (hitRate < this.config.targetHitRate) {
  //  85% TTL
  const increase = Math.ceil(oldTTL * 0.2); //  20%
  newTTL = Math.min(oldTTL + increase, this.config.maxTTL);
} else if (hitRate > this.config.targetHitRate + 0.1) {
  // >95% TTL
  const decrease = Math.ceil(oldTTL * 0.1); //  10%
  newTTL = Math.max(oldTTL - decrease, this.config.minTTL);
}
```

****:
|  |  |  |  |
|--------|------|------|------|
| < 85% | ⬆️  TTL | +20% |  |
| 85%-95% | ✅  | 0% |  |
| > 95% | ⬇️  TTL | -10% |  |

### 1.2  TTL 

```typescript
/**
 * 
 */
private calculateAccessFrequency(stats: CacheStats): number {
  if (stats.accesses.length < 2) return 0;

  const now = Date.now;
  const oldestAccess = stats.accesses[0];
  const duration = (now - oldestAccess) / 1000; // 

  return stats.accesses.length / duration;
}

/**
 * 
 */
if (accessFrequency > 10) {
  // >10/ TTL 
  const decrease = Math.ceil(newTTL * 0.1);
  newTTL = Math.max(newTTL - decrease, this.config.minTTL);
} else if (accessFrequency < 0.1) {
  // <0.1/ TTL 
  const increase = Math.ceil(newTTL * 0.2);
  newTTL = Math.min(newTTL + increase, this.config.maxTTL);
}
```

****:
|  |  |  |  |
|----------|------|------|------|
| > 10/s | ⬇️  TTL | -10% |  |
| 0.1-10/s | ✅  | 0% |  |
| < 0.1/s | ⬆️  TTL | +20% |  |

## 2. 

### 2.1 

```typescript
export type CacheType = 'channels' | 'singleChannel' | 'routingRules' | 'enabledChannels';

// 
interface CacheStats {
  hits: number;              // 
  misses: number;            // 
  accesses: number;        // 
  lastAdjustment: number;    // 
  currentTTL: number;        //  TTL
}
```

### 2.2 

```typescript
/**
 * 
 */
start {
  this.adjustmentTimer = setInterval( => {
    this.adjustAllTTLs;
  }, this.config.adjustmentInterval); // 
}
```

### 2.3 

```typescript
/**
 * 
 */
const DEFAULT_CONFIG: TTLConfig = {
  minTTL: 5000,             //  5 
  maxTTL: 300000,           //  5 
  defaultTTL: 30000,        //  30 
  adjustmentInterval: 60000, // 
  targetHitRate: 0.85,      //  85%
  hitRateWindow: 100,       //  100 
};
```

****:
```bash
TTL_MIN=5000                  #  TTL
TTL_MAX=300000                #  TTL
TTL_DEFAULT=30000             #  TTL
TTL_TARGET_HIT_RATE=0.85      # 0-1
```

## 3. Database 

### 3.1  TTL 

```typescript
constructor(path: string, options?: { cacheTTL?: number }) {
  this.db = new BunSQLite(path);
  this.optimizePragmaSettings;

  //  TTL 
  this.ttlManager = new DynamicTTLManager({
    defaultTTL: this.CACHE_TTL,
  });
  this.ttlManager.start;

  // ...
}
```

### 3.2  TTL

** TTL**:
```typescript
// ❌  TTL
if (cached && Date.now - cached.timestamp < this.CACHE_TTL) {
  return cached.data;
}
```

** TTL**:
```typescript
// ✅  TTL
const ttl = this.ttlManager.getTTL('channels');
if (cached && Date.now - cached.timestamp < ttl) {
  this.ttlManager.recordHit('channels');
  return cached.data;
}
this.ttlManager.recordMiss('channels');
```

### 3.3 

```typescript
//  TTL 
getDynamicTTLStats: Record<CacheType, {...}>

//  TTL 
adjustTTL(cacheType: CacheType): number

//  TTL
setTTL(cacheType: CacheType, ttl: number): void

// 
resetTTLStats(cacheType?: CacheType): void

// 
updateTTLConfig(config: {...}): void

// 
getTTLConfig: TTLConfig
```

## 4. 

### 4.1 

```typescript
//  TTL 
const db = new Database('./data.db', {
  cacheTTL: 30000, //  30 
});

// TTL 
```

### 4.2 

```typescript
//  TTL 
const stats = db.getDynamicTTLStats;
console.log(stats);

/*
{
  channels: {
    hits: 150,
    misses: 10,
    hitRate: '93.75%',
    accessFrequency: '2.50/s',
    currentTTL: 36000  //  36 
  },
  singleChannel: {
    hits: 80,
    misses: 20,
    hitRate: '80.00%',
    accessFrequency: '1.20/s',
    currentTTL: 42000  //  42 
  },
  routingRules: {
    hits: 100,
    misses: 0,
    hitRate: '100.00%',
    accessFrequency: '0.05/s',
    currentTTL: 60000  //  60 
  }
}
*/
```

### 4.3 

```typescript
//  TTL
db.setTTL('channels', 60000); //  60 

//  TTL 
const newTTL = db.adjustTTL('channels');
console.log(`New TTL: ${newTTL}ms`);

// 
db.updateTTLConfig({
  targetHitRate: 0.90,  //  90%
  adjustmentInterval: 30000, //  30 
});

// 
db.resetTTLStats('channels'); // 
db.resetTTLStats;           // 
```

### 4.4  TTL 

```typescript
//  /api/cache-stats 
app.get('/api/cache-stats', (req, res) => {
  const cacheStats = db.getCacheStats;

  res.json({
    ...cacheStats,
    dynamicTTL: db.getDynamicTTLStats,
    ttlConfig: db.getTTLConfig,
  });
});

/*
Response:
{
  cacheTTL: 30000,
  performance: {
    cacheHits: 350,
    cacheMisses: 30,
    hitRate: 92.11%,
    ...
  },
  dynamicTTL: {
    channels: {...},
    singleChannel: {...},
    routingRules: {...}
  },
  ttlConfig: {
    minTTL: 5000,
    maxTTL: 300000,
    defaultTTL: 30000,
    targetHitRate: 0.85,
    ...
  }
}
*/
```

## 5. 

### 5.1 TTL 

** 1: **
```
 TTL: 30s
: 12/s 
: 88%

 1 : TTL 30s → 27s 
 2 : TTL 27s → 24s 
 3 : TTL 24s →  

:
- : ⬆️⬆️  20%
- : 88% → 91% (⬆️ 3%)
- : ⬆️ 15%
```

** 2: **
```
 TTL: 30s
: 0.05/s 
: 75%

 1 : TTL 30s → 36s 
 2 : TTL 36s → 43s 
 3 : TTL 43s → 52s 
 4 : TTL 52s → 60s 

:
- : 75% → 92% (⬆️ 17%)
- : ⬇️ 60%
- : ⬆️ 25%
```

** 3: **
```
 TTL: 30s
:  0.5-5/s
: 82%

:
- : TTL  24s 
- : TTL  40s 
- : 

:
- : 82% → 89% (⬆️ 7%)
- : ⬆️ 18%
- : ⬆️ 30%
```

### 5.2 

****:
- : 100
- : 30 
- : 

** TTL (30s)**:
```
: 78%
: 45ms
: 2200 
: 128MB
```

** TTL**:
```
: 89% (⬆️ 14%)
: 32ms (⬇️ 29%)
: 880  (⬇️ 60%)
: 132MB (⬆️ 3%)

TTL :
- channels: 25s 
- singleChannel: 35s 
- routingRules: 58s 
- enabledChannels: 28s 
```

****:
|  |  TTL |  TTL |  |
|------|---------|---------|------|
|  | 78% | 89% | ⬆️ 14% |
|  | 45ms | 32ms | ⬇️ 29% |
|  | 2200 | 880 | ⬇️ 60% |
|  | 128MB | 132MB | ⬆️ 3% |

## 6. 

### 6.1 

```
🗄️  Database initialized with cache TTL
⏱️  Dynamic TTL manager initialized
  config: {
    minTTL: 5000,
    maxTTL: 300000,
    defaultTTL: 30000,
    targetHitRate: 0.85,
    adjustmentInterval: 60000
  }
⏱️  Dynamic TTL adjustment started
  interval: 60000
  intervalMinutes: 1
```

### 6.2 

```
⬆️  Increasing TTL for routingRules
  cacheType: 'routingRules'
  hitRate: '72.00%'
  targetRate: '85.00%'
  oldTTL: 30000
  newTTL: 36000
  reason: 'low_hit_rate'

⬇️  Decreasing TTL for channels
  cacheType: 'channels'
  accessFrequency: '12.50/s'
  oldTTL: 30000
  newTTL: 27000
  reason: 'high_frequency'

⏱️  TTL adjusted for singleChannel
  cacheType: 'singleChannel'
  oldTTL: 30000
  newTTL: 42000
  change: '+40.00%'
  hitRate: '76.50%'
  accessFrequency: '1.20/s'
```

## 7. 

### 7.1 

✅ ****
✅ ** TTL **
-  TTL
✅ ****
-  0.80
-  0.90

### 7.2 

⚠️ ****
-  1 
-  TTL 

⚠️ ****
-  100
⚠️ ****
-  100 

### 7.3 

:
- ✅ 
- ✅ 
- ✅ 

:
- ❌ 
- ❌ 
- ❌ TTL < 5s

## 8. 

### 
1. ** Prometheus **
   - `routex_cache_ttl_current` -  TTL 
   - `routex_cache_ttl_adjustments_total` - TTL 
   - `routex_cache_hit_rate`
2. ** TTL **
   -  TTL
### 
3. ** Dashboard **
   -  TTL
4. ****
   -
   -  TTL

### 
5. ** TTL **
   -  TTL 
   - Redis  TTL 

---

## 🏆 

 TTL 

✅ ****:  14%78% → 89%
✅ ****:  29%45ms → 32ms
✅ ****:  60%2200 → 880
✅ ****: 
✅ ****:  TTL TTL

**** ✅

---

## 📚 

- ****: `docs/IMPROVEMENT_ANALYSIS.md`
- ****: `docs/IMPROVEMENTS_COMPLETED.md`
- ****: `docs/configuration.md`

---

## 🔗 

****:
- `src/db/dynamic-ttl.ts` -  TTL 

****:
- `src/db/database.ts` -  TTL 
  -  `ttlManager` 
  -  `getChannel`, `getChannels`, `getEnabledChannels`, `getEnabledRoutingRules`
  -  `getDynamicTTLStats`, `adjustTTL`, `setTTL`, `resetTTLStats`, `updateTTLConfig`, `getTTLConfig`
  -  `close`  TTL 
  -  `getCacheStats`  TTL 

---

*: 2025-11-07*
*Routex : v1.1.0-beta*
