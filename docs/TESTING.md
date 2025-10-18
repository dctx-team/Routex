# Routex 

## 

Routex 

### 

```
: 127
: 100%
: 7
:  + 
```

### 

```
tests/
├── database.test.ts         #  (18 tests)
├── i18n.test.ts            #  (11 tests)
├── loadbalancer.test.ts    #  (27 tests)
├── metrics.test.ts         #  (20 tests)
├── prometheus.test.ts      # Prometheus  (13 tests)
├── integration.test.ts     #  (38 tests) ⭐ 
└── (transformers.test.ts)  # 
```

## 

### 

```bash
bun test
```

****
```
 127 pass
 0 fail
 307 expect calls
Ran 127 tests across 7 files. [361.00ms]
```

### 

```bash
# 
bun test tests/integration.test.ts

# 
bun test tests/loadbalancer.test.ts

# 
bun test tests/metrics.test.ts
```

### 

```bash
#  --test-name-pattern 
bun test --test-name-pattern Cache Warmer
bun test --test-name-pattern Tracing
bun test --test-name-pattern Health Check
```

### 

```bash
# 
bun test --verbose

# 
bun test --coverage
```

## 

### 1.  (Unit Tests)

****
- `tests/loadbalancer.test.ts`
- `tests/metrics.test.ts`
- `tests/database.test.ts`

****
- Priority, Round Robin, Weighted, Least Used
- Counter, Gauge, Histogram, Summary
- CRUD
- i18n 

### 2.  (Integration Tests)

**** `tests/integration.test.ts`

****

#### Health Check Endpoints (4 tests)
- ✅ Basic health status
- ✅ Detailed health status
- ✅ Liveness probe
- ✅ Readiness probe

#### Channels API (6 tests)
- ✅ List all channels
- ✅ Get specific channel
- ✅ Create new channel
- ✅ Update channel
- ✅ Return 404 for non-existent channel
- ✅ Handle validation errors

#### Cache Warmer API (6 tests)
- ✅ Get cache stats
- ✅ Get cache config
- ✅ Manually warm cache
- ✅ Invalidate cache
- ✅ Invalidate and warm cache
- ✅ Update cache config

#### Tracing API (5 tests)
- ✅ Get tracing stats
- ✅ Create and retrieve trace
- ✅ Get specific span
- ✅ Return 404 for non-existent trace
- ✅ Clear old spans

#### Metrics API (4 tests)
- ✅ Get metrics summary
- ✅ Get all metrics
- ✅ Reset metrics
- ✅ Get Prometheus metrics

#### Load Balancer API (3 tests)
- ✅ Get current strategy
- ✅ Update strategy
- ✅ Reject invalid strategy

#### Analytics API (1 test)
- ✅ Get analytics data

#### Providers API (3 tests)
- ✅ Get all providers
- ✅ Get specific provider
- ✅ Return 404 for non-existent provider

#### i18n API (3 tests)
- ✅ Get current locale
- ✅ Set locale
- ✅ Reject invalid locale

#### Error Handling (3 tests)
- ✅ Handle missing required fields
- ✅ Handle invalid JSON
- ✅ Handle non-existent routes

#### CORS (1 test)
- ✅ Include CORS headers

## 

### 

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';

describe('',  => {
  beforeAll( => {
    // 
  });

  afterAll( => {
    // 
  });

  test('should do something',  => {
    // 
    expect(result).toBe(expected);
  });
});
```

### 

#### 1. 

```typescript
// ❌ 
test('test 1',  => { ... });

// ✅ 
test('should return 404 for non-existent channel',  => { ... });
```

#### 2. 

```typescript
test('should handle empty channel list',  => {
  const channels = ;
  expect( => loadBalancer.select(channels)).toThrow;
});

test('should handle single channel',  => {
  const channels = [channel1];
  const selected = loadBalancer.select(channels);
  expect(selected).toBe(channel1);
});
```

#### 3.  beforeAll/afterAll 

```typescript
describe('Database Tests',  => {
  let db: Database;

  beforeAll( => {
    db = new Database(':memory:');
  });

  afterAll( => {
    db.close;
  });

  test('should create channel',  => {
    const channel = db.createChannel({ ... });
    expect(channel.id).toBeDefined;
  });
});
```

#### 4. 

```typescript
test('should warm cache', async  => {
  await cacheWarmer.warmCache;
  const stats = cacheWarmer.getStats;
  expect(stats.totalWarms).toBeGreaterThan(0);
});
```

#### 5. 

```typescript
// 
expect(value).toBe(expected);           //  (===)
expect(object).toEqual(expected);       // 

// 
expect(count).toBeGreaterThan(0);
expect(count).toBeGreaterThanOrEqual(1);
expect(count).toBeLessThan(100);

// 
expect(isValid).toBe(true);
expect(isEnabled).toBeTruthy;
expect(result).toBeFalsy;

//
expect(array).toContain(item);
expect(object).toHaveProperty('key');
expect(array).toHaveLength(3);

// 
expect( => fn).toThrow;
expect( => fn).toThrow('Error message');

// 
expect(typeof value).toBe('string');
expect(Array.isArray(data)).toBe(true);
```

## 

###  API 

```typescript
test('should get cache warmer stats', async  => {
  const req = new Request('http://localhost:8080/api/cache/stats');
  const res = await app.fetch(req);
  const data = await res.json;

  expect(res.status).toBe(200);
  expect(data.success).toBe(true);
  expect(data.data.totalWarms).toBeGreaterThanOrEqual(0);
});
```

###  POST 

```typescript
test('should create a new channel', async  => {
  const newChannel = {
    name: 'Test Channel',
    type: 'openai',
    apiKey: 'test-key',
    models: ['gpt-4']
  };

  const req = new Request('http://localhost:8080/api/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newChannel),
  });

  const res = await app.fetch(req);
  const data = await res.json;

  expect(res.status).toBe(201);
  expect(data.success).toBe(true);
  expect(data.data.name).toBe(newChannel.name);
});
```

### 

```typescript
test('should return 404 for non-existent channel', async  => {
  const req = new Request('http://localhost:8080/api/channels/invalid-id');
  const res = await app.fetch(req);
  const data = await res.json;

  expect(res.status).toBe(404);
  expect(data.success).toBe(false);
  expect(data.error).toBeDefined;
});
```

##  (CI)

### GitHub Actions 

 `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest

    - name: Install dependencies
      run: bun install

    - name: Run tests
      run: bun test

    - name: Run integration tests
      run: bun test tests/integration.test.ts
```

## 

### 

|  |  |  |  |
|------|---------|---------|------|
|  | database.test.ts | 18 | ✅ |
|  | loadbalancer.test.ts | 27 | ✅ |
|  | metrics.test.ts | 20 | ✅ |
| Prometheus | prometheus.test.ts | 13 | ✅ |
|  | i18n.test.ts | 11 | ✅ |
|  | integration.test.ts | 38 | ✅ |
| **** | **7 ** | **127** | **✅** |

###  API 

|  |  |  |
|---------|---------|--------|
| Health Check | 4 | 100% |
| Channels | 6 | 100% |
| Cache Warmer | 6 | 100% |
| Tracing | 5 | 100% |
| Metrics | 4 | 100% |
| Load Balancer | 3 | 100% |
| Analytics | 1 | 100% |
| Providers | 3 | 100% |
| i18n | 3 | 100% |
| Error Handling | 3 | 100% |
| CORS | 1 | 100% |

## 

### 

```bash
# 
bun test --verbose

# 
bun test --only-failures
```

###  console.log 

```typescript
test('debug example',  => {
  const result = someFunction;
  console.log('Result:', result);  // 
  expect(result).toBe(expected);
});
```

### 

```typescript
// 
test.skip('this test is not ready',  => {
  // ...
});

// 
test.only('focus on this test',  => {
  // ...
});
```

## 

```typescript
test('load balancer should be fast',  => {
  const start = Date.now;

  for (let i = 0; i < 10000; i++) {
    loadBalancer.select(channels);
  }

  const duration = Date.now - start;
  expect(duration).toBeLessThan(1000); //  1 
});
```

## 

### 

#### 1. 

```typescript
//  5 
test('slow test', async  => {
  await slowOperation;
}, 10000); // 10 
```

#### 2. 

```typescript
// 
beforeAll( => {
  db = new Database(':memory:');
});
```

#### 3. 

```typescript
// 
afterAll(async  => {
  await server.stop;
});
```

## 

-   (`bun test`)
-  
-  
-  
-  
-  
-  
-  

## 

### 

1. ****
2. **E2E **
   -  API
3. ****
   -  HTML 
   - CI 

## 

Routex 

- ✅ **127 ** 
- ✅ **100% ** 
- ✅ **** 
- ✅ **** 
- ✅ ****  < 1 
- ✅ **** 

Routex 

---

**** 2025-10-17
**** 1.1.0-beta
**** Bun Test
