# Routex
****: 2025-10-16
****: ccflare, claude-code-router, llmio, cc-switch

---

## 

 4  **15 **

### 
- 🔴  (P0): 5 
- 🟡  (P1): 6 
- 🟢  (P2): 4 

---

## 

### 1. LRU  🔴 P0

****: `claude-code-router` (`src/utils/cache.ts`)

****:
- Routex  LoadBalancer session  Map + setTimeout
-  v1.2  LRU 

****:
```typescript
// src/utils/lru-cache.ts
export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map<K, V>;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    const value = this.cache.get(key) as V;
    // Move to end to mark as recently used
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Delete least recently used (first item)
      const leastRecentlyUsedKey = this.cache.keys.next.value;
      if (leastRecentlyUsedKey !== undefined) {
        this.cache.delete(leastRecentlyUsedKey);
      }
    }
    this.cache.set(key, value);
  }

  values: V {
    return Array.from(this.cache.values);
  }

  size: number {
    return this.cache.size;
  }
}
```

** Routex**:
```typescript
// src/core/loadbalancer.ts
import { LRUCache } from '../utils/lru-cache';

export class LoadBalancer {
  private sessionCache: LRUCache<string, SessionCacheEntry>;

  constructor(private strategy: LoadBalanceStrategy = 'priority') {
    this.sessionCache = new LRUCache(10000);
  }

  private setSessionChannel(sessionId: string, channelId: string) {
    this.sessionCache.put(sessionId, {
      channelId,
      timestamp: Date.now,
    });
  }

  private getSessionChannel(channels: Channel, sessionId: string): Channel | null {
    const entry = this.sessionCache.get(sessionId);
    // ... rest of logic
  }
}
```

****:
- ✅  LRU 
- ✅ O(1) 
- ✅ 
- ✅ 

****: 2-3 hours

---

### 2. Transformer  🔴 P0

****: `claude-code-router` (Transformer architecture)

****: Routex  transformer 

****:

#### 2.1 Transformer 
```typescript
// src/transformers/pipeline.ts
export class TransformerPipeline {
  private transformers: BaseTransformer = ;

  addTransformer(transformer: BaseTransformer): this {
    this.transformers.push(transformer);
    return this;
  }

  async transformRequest(request: any): Promise<any> {
    let result = request;
    for (const transformer of this.transformers) {
      result = await transformer.transformRequest(result);
    }
    return result;
  }

  async transformResponse(response: any): Promise<any> {
    // Reverse order for response
    let result = response;
    for (let i = this.transformers.length - 1; i >= 0; i--) {
      result = await this.transformers[i].transformResponse(result);
    }
    return result;
  }
}
```

#### 2.2  Transformers
```typescript
// src/transformers/maxtoken.ts -  token 
export class MaxTokenTransformer extends BaseTransformer {
  constructor(private maxTokens: number = 30000) {
    super('maxtoken');
  }

  async transformRequest(request: any): Promise<any> {
    return {
      ...request,
      max_tokens: Math.min(request.max_tokens || Infinity, this.maxTokens),
    };
  }
}

// src/transformers/sampling.ts
export class SamplingTransformer extends BaseTransformer {
  async transformRequest(request: any): Promise<any> {
    // Normalize temperature, top_p, etc.
    return {
      ...request,
      temperature: request.temperature ?? 0.7,
      top_p: request.top_p ?? 1.0,
    };
  }
}

// src/transformers/cleancache.ts
export class CleanCacheTransformer extends BaseTransformer {
  async transformRequest(request: any): Promise<any> {
    const cleaned = { ...request };
    delete cleaned.cache_control;
    return cleaned;
  }
}
```

#### 2.3 Transformer 
```typescript
interface TransformerConfig {
  use: Array<string | [string, TransformerOptions]>;
  [modelName: string]: any; // Model-specific transformers
}

interface TransformerOptions {
  max_tokens?: number;
  provider?: {
    only?: string;
    deny?: string;
  };
  [key: string]: any;
}
```

****:
- ✅
- ✅  transformer 
- ✅  transformer 
- ✅  claude-code-router 

****: 8-12 hours

---

### 3.  🔴 P0

****: `claude-code-router` (Custom Router + Subagent Routing)

****:
- Routex  priority/weight/round_robin
****:

#### 3.1 
```typescript
// src/core/routing/custom-router.ts
export interface CustomRouterContext {
  request: ParsedRequest;
  channels: Channel;
  config: Config;
}

export type CustomRouterFunction = (
  context: CustomRouterContext
) => Promise<{ channel: Channel; model?: string } | null>;

export class CustomRouter {
  constructor(private routerFunction: CustomRouterFunction) {}

  async route(context: CustomRouterContext): Promise<{ channel: Channel; model?: string } | null> {
    return await this.routerFunction(context);
  }
}
```

#### 3.2 
```typescript
// src/core/routing/content-based-router.ts
export class ContentBasedRouter {
  async route(request: ParsedRequest, channels: Channel): Promise<Channel | null> {
    const messages = (request.body as any)?.messages || ;
    const userMessage = messages.find((m: any) => m.role === 'user')?.content;

    if (!userMessage) return null;

    //  → Code-specialized model
    if (this.isCodeRelated(userMessage)) {
      return channels.find(ch => ch.name.includes('code')) || null;
    }

    //  → Long context model
    if (this.isLongContext(messages)) {
      return channels.find(ch => ch.models.includes('gemini')) || null;
    }

    //  → Vision model
    if (this.hasImages(messages)) {
      return channels.find(ch => this.supportsVision(ch)) || null;
    }

    return null;
  }

  private isCodeRelated(content: string): boolean {
    const codeKeywords = ['code', 'function', 'debug', 'optimize', 'refactor'];
    return codeKeywords.some(kw => content.toLowerCase.includes(kw));
  }

  private isLongContext(messages: any): boolean {
    const totalLength = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
    return totalLength > 60000;
  }

  private hasImages(messages: any): boolean {
    return messages.some((m: any) =>
      Array.isArray(m.content) &&
      m.content.some((c: any) => c.type === 'image')
    );
  }

  private supportsVision(channel: Channel): boolean {
    return channel.models.some(m =>
      m.includes('vision') || m.includes('4v') || m.includes('gemini')
    );
  }
}
```

****:
- ✅ 
- ✅ 
- ✅ 

****: 6-8 hours

---

### 4.  CLI  🟡 P1

****: `claude-code-router` (`src/utils/modelSelector.ts`)

****:
- Routex  channel
****:

```typescript
// src/cli/model-selector.ts
import { select, input, confirm } from '@inquirer/prompts';

export class ModelSelector {
  async run {
    const action = await select({
      message: 'What would you like to do?',
      choices: [
        { name: 'View Current Configuration', value: 'view' },
        { name: 'Switch Model for Route', value: 'switch' },
        { name: 'Add New Channel', value: 'addChannel' },
        { name: 'Add New Model to Channel', value: 'addModel' },
        { name: 'Exit', value: 'exit' }
      ]
    });

    switch (action) {
      case 'view':
        await this.viewConfiguration;
        break;
      case 'switch':
        await this.switchModel;
        break;
      case 'addChannel':
        await this.addChannel;
        break;
      // ... more actions
    }
  }

  async addChannel {
    const name = await input({
      message: 'Channel name:',
      validate: (value) => value.trim !== '' || 'Name cannot be empty'
    });

    const type = await select({
      message: 'Channel type:',
      choices: [
        { name: 'Anthropic', value: 'anthropic' },
        { name: 'OpenAI', value: 'openai' },
        { name: 'Google Gemini', value: 'google' },
        { name: 'Custom', value: 'custom' }
      ]
    });

    const baseUrl = await input({
      message: 'Base URL (optional):',
      default: this.getDefaultBaseUrl(type)
    });

    const apiKey = await input({
      message: 'API Key:',
      validate: (value) => value.trim !== '' || 'API key required'
    });

    const modelsInput = await input({
      message: 'Models (comma-separated):',
      validate: (value) => value.trim !== '' || 'At least one model required'
    });

    const models = modelsInput.split(',').map(m => m.trim);

    const priority = await input({
      message: 'Priority (1-100):',
      default: '50',
      validate: (value) => {
        const num = parseInt(value);
        return (num >= 1 && num <= 100) || 'Priority must be 1-100';
      }
    });

    // Create channel...
    this.db.createChannel({
      name,
      type,
      baseUrl: baseUrl || undefined,
      apiKey,
      models,
      priority: parseInt(priority)
    });

    console.log(`✅ Channel ${name} created successfully`);
  }
}
```

**CLI **:
```bash
bun run routex model          # 
bun run routex channel add    # 
bun run routex channel list   # 
bun run routex channel edit <id>  # 
```

****:
- ✅ 
- ✅ 
- ✅ 
- ✅  UI

****: 6-8 hours

---

### 5.  🟡 P1

****: `llmio` (`balancer/balancer.go`)

****:
- Routex 

**llmio **:
```go
func WeightedRandom[T comparable](items map[T]int) (*T, error) {
    if len(items) == 0 {
        return nil, fmt.Errorf(no provide items)
    }
    total := 0
    for _, v := range items {
        total += v
    }
    if total <= 0 {
        return nil, fmt.Errorf(total provide weight must be greater than 0)
    }
    r := rand.IntN(total)
    for k, v := range items {
        if r < v {
            return &k, nil
        }
        r -= v
    }
    return nil, fmt.Errorf(unexpected error)
}
```

** Routex **:
```typescript
// src/core/loadbalancer.ts
private selectByWeight(channels: Channel): Channel {
  // Validate weights
  const totalWeight = channels.reduce((sum, ch) => sum + ch.weight, 0);

  if (totalWeight <= 0) {
    throw new Error('Total channel weight must be greater than 0');
  }

  let random = Math.random * totalWeight;

  for (const channel of channels) {
    if (random < channel.weight) {
      return channel;
    }
    random -= channel.weight;
  }

  // Fallback (should never reach here)
  return channels[channels.length - 1];
}
```

****:
- ✅ 
- ✅ 
- ✅ 

****: 1 hour

---

## 

### 6. Web UI Dashboard  🔴 P0

****: `llmio` (React 19 + TypeScript + Tailwind CSS)

****:
- Routex  Web 
-  TUI

****:

#### 6.1 
- **React 19** + TypeScript
- **Vite** 
- **Tailwind CSS** (UI)
- **Recharts** / **Chart.js** 
- **shadcn/ui** 

#### 6.2 

**Dashboard **:
```tsx
// webui/src/pages/Dashboard.tsx
export function Dashboard {
  const { data: metrics } = useQuery('/api/analytics');
  const { data: channels } = useQuery('/api/channels');

  return (
    <div className=p-6 space-y-6>
      {/* Stats Cards */}
      <div className=grid grid-cols-4 gap-4>
        <StatCard
          title=Total Requests
          value={metrics.totalRequests}
          icon={<Activity />}
          trend=+12%
        />
        <StatCard
          title=Success Rate
          value={`${(metrics.successfulRequests / metrics.totalRequests * 100).toFixed(1)}%`}
          icon={<CheckCircle />}
          trend=+5%
        />
        <StatCard
          title=Avg Latency
          value={`${metrics.averageLatency.toFixed(0)}ms`}
          icon={<Clock />}
          trend=-8%
        />
        <StatCard
          title=Active Channels
          value={channels.filter(ch => ch.status === 'enabled').length}
          icon={<Zap />}
        />
      </div>

      {/* Charts */}
      <div className=grid grid-cols-2 gap-4>
        <Card>
          <CardHeader>
            <CardTitle>Request Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestTimelineChart data={metrics.timeline} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ChannelUsagePieChart channels={channels} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestLogsTable limit={10} />
        </CardContent>
      </Card>
    </div>
  );
}
```

**Channel **:
```tsx
// webui/src/pages/Channels.tsx
export function ChannelsPage {
  const { data: channels } = useQuery('/api/channels');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <div className=p-6>
      <div className=flex justify-between items-center mb-6>
        <h1 className=text-3xl font-bold>Channels</h1>
        <Button onClick={ => setIsAddDialogOpen(true)}>
          <Plus className=mr-2 h-4 w-4 /> Add Channel
        </Button>
      </div>

      <ChannelsTable
        channels={channels}
        onEdit={(ch) => handleEdit(ch)}
        onDelete={(ch) => handleDelete(ch)}
        onToggleStatus={(ch) => handleToggle(ch)}
      />

      <AddChannelDialog
        open={isAddDialogOpen}
        onClose={ => setIsAddDialogOpen(false)}
      />
    </div>
  );
}
```

#### 6.3 
```typescript
// webui/src/hooks/useRealtime.ts
export function useRealtimeMetrics {
  const [metrics, setMetrics] = useState<Metrics>;

  useEffect( => {
    const eventSource = new EventSource('/api/analytics/stream');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMetrics(data);
    };

    return  => eventSource.close;
  }, );

  return metrics;
}
```

****:
- ✅ 
- ✅ 
- ✅ 
- ✅ 

****: 20-30 hours

---

### 7.  🟡 P1

****: `ccflare` (`diagnose.sh`)

****:
-
****:

```bash
#!/bin/bash
# diagnose.sh - Routex 

echo 🔍 Routex Diagnostic Script
echo ===========================
echo 

# 1. Check Bun installation
echo 📦 Checking Bun installation...
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    echo ✅ Bun installed: v$BUN_VERSION
else
    echo ❌ Bun not found. Please install: curl -fsSL https://bun.sh/install | bash
fi
echo 

# 2. Check server status
echo 🚀 Checking server status...
if curl -s http://localhost:8080/health > /dev/null; then
    echo ✅ Server is running
else
    echo ❌ Server is not responding
fi
echo 

# 3. Check database
echo 💾 Checking database...
DB_PATH=$HOME/.config/routex/routex.db
if [ -f $DB_PATH ]; then
    DB_SIZE=$(du -h $DB_PATH | cut -f1)
    echo ✅ Database exists: $DB_SIZE
else
    echo ❌ Database not found at $DB_PATH
fi
echo 

# 4. Check configuration
echo ⚙️  Checking configuration...
CONFIG_PATH=$HOME/.config/routex/config.json
if [ -f $CONFIG_PATH ]; then
    echo ✅ Config file exists

    # Validate JSON
    if jq empty $CONFIG_PATH 2>/dev/null; then
        echo ✅ Config is valid JSON
    else
        echo ❌ Config has JSON syntax errors
    fi
else
    echo ❌ Config file not found
fi
echo 

# 5. Check port availability
echo 🔌 Checking port 8080...
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo ✅ Port 8080 is in use
    PROCESS=$(lsof -Pi :8080 -sTCP:LISTEN | tail -n 1)
    echo    Process: $PROCESS
else
    echo ⚠️  Port 8080 is available (server not running?)
fi
echo 

# 6. Check disk space
echo 💿 Checking disk space...
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}')
echo    Disk usage: $DISK_USAGE
echo 

# 7. Check network connectivity
echo 🌐 Checking network connectivity...
if ping -c 1 api.anthropic.com &> /dev/null; then
    echo ✅ Can reach api.anthropic.com
else
    echo ❌ Cannot reach api.anthropic.com
fi
echo 

# 8. Summary
echo 📊 Summary
echo ==========
echo Run 'bun start' to start Routex
echo Access dashboard at http://localhost:8080
echo View logs: tail -f ~/.config/routex/logs/routex.log
```

****:
- ✅ 
- ✅ 
- ✅ 

****: 2-3 hours

---

### 8.  (i18n) 🟢 P2

****: `cc-switch` (`src/i18n/index.ts`)

****:

```typescript
// src/i18n/index.ts
import en from './locales/en.json';
import zh from './locales/zh.json';

type Language = 'en' | 'zh';

class I18n {
  private currentLocale: Language = 'en';
  private messages = { en, zh };

  setLocale(locale: Language) {
    this.currentLocale = locale;
  }

  t(key: string): string {
    const keys = key.split('.');
    let value: any = this.messages[this.currentLocale];

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  }
}

export const i18n = new I18n;
```

```json
// src/i18n/locales/en.json
{
  server: {
    starting: 🎯 Starting Routex...,
    ready: ✅ Routex is running!,
    port: Server: http://{host}:{port}
  },
  channel: {
    added: ✅ Channel \{name}\ added successfully,
    notFound: ❌ Channel not found,
    disabled: ⚠️  Channel \{name}\ is disabled
  }
}
```

****:
- ✅ 
- ✅ 
- ✅ 

****: 4-6 hours

---

## 

### 9. Provider  🟡 P1

****: `llmio` (Provider architecture)

****:
- Channel  Provider 
-  Provider 

****:

```typescript
// src/providers/base-provider.ts
export abstract class BaseProvider {
  abstract readonly name: string;
  abstract readonly type: string;

  abstract chat(request: ChatRequest): Promise<ChatResponse>;
  abstract stream(request: ChatRequest): AsyncGenerator<ChatChunk>;

  protected abstract buildHeaders(apiKey: string): Record<string, string>;
  protected abstract buildRequestBody(request: ChatRequest): any;
  protected abstract parseResponse(response: any): ChatResponse;
}

// src/providers/anthropic-provider.ts
export class AnthropicProvider extends BaseProvider {
  readonly name = 'anthropic';
  readonly type = 'anthropic';

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const headers = this.buildHeaders(request.apiKey);
    const body = this.buildRequestBody(request);

    const response = await fetch(request.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    return this.parseResponse(await response.json);
  }

  protected buildHeaders(apiKey: string): Record<string, string> {
    return {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    };
  }

  // ...
}
```

****:
- ✅  Provider 
- ✅  Provider
- ✅ 

****: 8-10 hours

---

### 10. / Tee  🟡 P1

****: `llmio` (`service/tee.go`)

****: 

****:

```typescript
// src/utils/tee-stream.ts
export class TeeStream {
  async *tee<T>(
    source: AsyncGenerator<T>,
    ...destinations: ((chunk: T) => void | Promise<void>)
  ): AsyncGenerator<T> {
    for await (const chunk of source) {
      // Send to all destinations
      await Promise.all(destinations.map(dest => dest(chunk)));

      // Yield to original consumer
      yield chunk;
    }
  }
}

// Usage in proxy.ts
async *handleStream(channel: Channel, request: ParsedRequest) {
  const stream = await this.forwardStream(channel, request);
  const logger = new StreamLogger;
  const metrics = new StreamMetrics;

  const tee = new TeeStream;

  yield* tee.tee(
    stream,
    (chunk) => logger.log(chunk),      // Log each chunk
    (chunk) => metrics.collect(chunk)  // Collect metrics
  );
}
```

****:
- ✅ 
- ✅  consumers
- ✅ 

****: 3-4 hours

---

### 11.  🟡 P1

****: `llmio` (Provider connectivity test)

****:

```typescript
// src/api/routes.ts -  API endpoint
app.post('/api/channels/:id/test', async (c) => {
  const channelId = c.req.param('id');
  const channel = db.getChannel(channelId);

  if (!channel) {
    return c.json({ error: 'Channel not found' }, 404);
  }

  try {
    const result = await testChannel(channel);
    return c.json(result);
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// src/utils/channel-tester.ts
export async function testChannel(channel: Channel): Promise<TestResult> {
  const startTime = Date.now;

  try {
    const response = await fetch(`${channel.baseUrl}/messages`, {
      method: 'POST',
      headers: prepareHeaders(channel),
      body: JSON.stringify({
        model: channel.models[0],
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      })
    });

    const latency = Date.now - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      success: true,
      latency,
      status: response.status,
      message: 'Connection successful'
    };
  } catch (error) {
    return {
      success: false,
      latency: Date.now - startTime,
      error: error.message
    };
  }
}
```

****:
- ✅  channel 
- ✅ 
- ✅  API 

****: 2-3 hours

---

## 

### 12.  🔴 P0

****: `claude-code-router` (pino logger)

****:
- Routex  `console.log`
****:

```typescript
// src/utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase };
    }
  }
});

// Usage
logger.info({ channelId: 'ch-123', latency: 45 }, 'Request completed');
logger.error({ err }, 'Failed to forward request');
logger.debug({ request }, 'Incoming request');
```

****:
```
[2025-10-16 10:30:15.123] INFO (12345): Request completed
    channelId: ch-123
    latency: 45
[2025-10-16 10:30:16.456] ERROR (12345): Failed to forward request
    err: {
      type: ChannelError,
      message: Connection refused,
      stack: ...
    }
```

****:
- ✅ 
- ✅ 
- ✅ 
- ✅  ELK/Loki 

****: 2-3 hours

---

### 13.  (Metrics) 🟡 P1

****: `llmio` (Metrics API)

****:

```typescript
// src/core/metrics.ts
export class MetricsCollector {
  private counters = new Map<string, number>;
  private histograms = new Map<string, number>;
  private gauges = new Map<string, number>;

  // Counters
  incrementCounter(name: string, value: number = 1) {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  // Histograms (for latency, etc.)
  recordHistogram(name: string, value: number) {
    const values = this.histograms.get(name) || ;
    values.push(value);
    this.histograms.set(name, values);
  }

  // Gauges (for current values)
  setGauge(name: string, value: number) {
    this.gauges.set(name, value);
  }

  // Export metrics
  export: Metrics {
    const metrics: Metrics = {
      counters: Object.fromEntries(this.counters),
      histograms: {},
      gauges: Object.fromEntries(this.gauges)
    };

    for (const [name, values] of this.histograms) {
      metrics.histograms[name] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p50: this.percentile(values, 0.5),
        p95: this.percentile(values, 0.95),
        p99: this.percentile(values, 0.99)
      };
    }

    return metrics;
  }

  private percentile(values: number, p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index] || 0;
  }
}

// Usage in proxy
const metrics = new MetricsCollector;

metrics.incrementCounter('requests_total');
metrics.incrementCounter('requests_success');
metrics.recordHistogram('request_latency_ms', latency);
metrics.setGauge('active_channels', enabledChannels.length);
```

**API Endpoint**:
```typescript
app.get('/api/metrics', (c) => {
  return c.json(metrics.export);
});

app.get('/api/metrics/prometheus', (c) => {
  // Export in Prometheus format
  const prom = metrics.exportPrometheus;
  return c.text(prom);
});
```

****:
- ✅ 
- ✅  Prometheus 
- ✅ 

****: 4-6 hours

---

### 14.  🟢 P2

****:

```typescript
// src/api/health.ts
app.get('/health', async (c) => {
  const health = {
    status: 'healthy',
    timestamp: Date.now,
    uptime: process.uptime,
    checks: {
      database: await checkDatabase,
      channels: await checkChannels,
      memory: checkMemory,
      disk: await checkDisk
    }
  };

  const allHealthy = Object.values(health.checks).every(c => c.status === 'ok');

  return c.json(health, allHealthy ? 200 : 503);
});

async function checkDatabase: Promise<HealthCheck> {
  try {
    const isConnected = db.isConnected;
    return {
      status: isConnected ? 'ok' : 'error',
      message: isConnected ? 'Database connected' : 'Database not connected'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
}

async function checkChannels: Promise<HealthCheck> {
  const channels = db.getEnabledChannels;
  const hasChannels = channels.length > 0;

  return {
    status: hasChannels ? 'ok' : 'warning',
    message: `${channels.length} enabled channels`,
    details: { count: channels.length }
  };
}

function checkMemory: HealthCheck {
  const usage = process.memoryUsage;
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);

  return {
    status: heapUsedMB < 500 ? 'ok' : 'warning',
    message: `${heapUsedMB}MB heap used`,
    details: usage
  };
}
```

****:
```json
{
  status: healthy,
  timestamp: 1697500000000,
  uptime: 86400,
  checks: {
    database: {
      status: ok,
      message: Database connected
    },
    channels: {
      status: ok,
      message: 5 enabled channels,
      details: { count: 5 }
    },
    memory: {
      status: ok,
      message: 120MB heap used
    }
  }
}
```

****: 2-3 hours

---

##  DevOps

### 15. GitHub Actions  🟢 P2

****: `claude-code-router` (GitHub Actions support)

****:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: 1.2.8

      - name: Install dependencies
        run: bun install

      - name: Type check
        run: bun run typecheck

      - name: Run tests
        run: bun test

      - name: Build
        run: bun run build

  docker:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

****:
- ✅ 
- ✅  Docker 
- ✅
****: 2-3 hours

---

## 

### Phase 1:  (Week 1-2)
- ✅ LRU 
- ✅ 
- ✅ Transformer 
- ✅ 

****: 

### Phase 2:  (Week 3-4)
- ✅ Web UI Dashboard
- ✅  CLI
- ✅ 
- ✅ 

****: 

### Phase 3:  (Week 5-6)
- ✅ 
- ✅ 
- ✅ Tee Stream
- ✅ Provider 

****: 

### Phase 4:  (Week 7-8)
- ✅ 
- ✅ GitHub Actions
- ✅  Provider 
- ✅ 

****: 

---

## 

 4  Routex 

1. ****: Transformer 
2. ****: Web UI CLI
3. ****: 
4. ****: Provider LRU 

Routex  AI API 

---

****: dctx-team
****: v2.0 
****: 2025-10-16
