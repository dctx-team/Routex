# Routex  🎯

#### 1. **ccflare**
****: Monorepo (22+ packages)
- ✅ OAuthChannelDashboardAgent
- ✅ SQLite + AsyncDbWriter

- ❌ >300MB
- ❌ forksnipeship/ccflare

#### 2. **cc-switch**
****: Tauri 2 + React + Rust
- ✅ MCP

- 🔄 UI

#### 3. **claude-code-router**
****: Node.js + TypeScript
- ✅ default/background/think/longContext
- ✅ Transformer
- ✅ Web UI
- ✅ Provider
- ✅ GitHub Actions

- 🔄 Transformer
- 🔄 Subagent
- 🔄 Status Line

#### 4. **llmio** (Go)
****: Golang + React
- ✅ Go
- ✅ Web UI
- ✅ Docker

- 🔄 Provider

---

## Routex

- ✅ SQLite
- ✅ claw.run

- ❌ Web Dashboard UI
- ❌ OAuth
- ❌ strategy
- ❌ Transformer
- ❌ Analytics
- ❌ UI

---

#### 1.1  (claude-code-router)

```typescript
// src/core/router.ts
interface RoutingRule {
  name: string;
  condition: RoutingCondition;
  target: { provider: string; model: string };
  priority: number;
}

interface RoutingCondition {
  type: 'default' | 'background' | 'think' | 'longContext' | 'webSearch' | 'image' | 'custom';
tokenThreshold?: number;  //
keywords?: string;      //
userPattern?: RegExp;     //
customFunction?: string;  // JS
}

class SmartRouter {
  async selectChannel(request: ProxyRequest): Promise<Channel> {
// 2. token
  }
}
```

- `src/core/router.ts`
- `src/config/routing-rules.ts`
- `src/api/routes-routing.ts` - API

#### 1.2 Transformer

****: Provider/

```typescript
// src/transformers/base.ts
interface Transformer {
  name: string;
  transformRequest(request: any, options?: any): Promise<any>;
  transformResponse(response: any, options?: any): Promise<any>;
}

// Transformers
// src/transformers/anthropic.ts - Anthropic
// src/transformers/openai.ts - OpenAI
// src/transformers/gemini.ts - Gemini
// src/transformers/deepseek.ts - DeepSeek
// src/transformers/maxtoken.ts - Token
// src/transformers/reasoning.ts
```

```json
{
  "channels": [
    {
      "name": "openrouter",
      "type": "openai",
      "transformer": {
        "use": ["openrouter"],
        "options": {
          "provider": { "only": ["anthropic"] }
        }
      }
    }
  ]
}
```

#### 1.3 / (cc-switch)

```typescript
// src/api/routes-config.ts
// GET /api/config/export
// POST /api/config/import
// POST /api/config/backup
// GET /api/config/backups
```

- ✅ JSON

```typescript
// src/core/health-checker.ts
class HealthChecker {
  async testChannel(channelId: string): Promise<HealthCheckResult> {
  }

  async testAllChannels(): Promise<HealthCheckResult[]>

  async startPeriodicCheck(interval: number)
}
```

**API**:
- `POST /api/channels/:id/test`
- `POST /api/channels/test-all`
- `GET /api/channels/:id/health`

---

### : Web Dashboard

#### 2.1 Dashboard

****: React 19 + TypeScript + Vite + Tailwind CSS

```
dashboard/
├── src/
│   ├── components/
│   │   ├── ChannelsPanel.tsx      #
│   │   ├── RoutingRulesPanel.tsx  #
│   │   ├── AnalyticsPanel.tsx     #
│   │   ├── RequestsPanel.tsx      #
│   │   ├── ConfigPanel.tsx        #
│   │   └── HealthMonitor.tsx      #
│   ├── api/
│   │   └── client.ts              # API
│   ├── hooks/
│   │   ├── useChannels.ts
│   │   ├── useRouting.ts
│   │   └── useAnalytics.ts
│   └── App.tsx
├── package.json
└── vite.config.ts
```

#### 2.2 Dashboard

**Analytics**:
- ✅ Token

---

#### 3.1 OAuth

```typescript
// src/auth/oauth.ts
class OAuthManager {
// PKCE
  async initiateOAuth(provider: 'anthropic' | 'openai'): Promise<string>
  async handleCallback(code: string): Promise<TokenSet>
  async refreshToken(refreshToken: string): Promise<TokenSet>
}
```

```typescript
interface SessionConfig {
  enabled: boolean;
duration: number;        //
cleanupInterval: number; //
stickyRouting: boolean;  //
}
```

```typescript
interface Tenant {
  id: string;
  name: string;
apiKey: string;          // API Key
channels: string;      //
quotaLimit?: number;     // Token
rateLimit?: number;      //
}
```

#### 3.4 Agent

ccflareAgentAgent

```typescript
// ~/.routex/agents/my-agent.md
/*
---
name: Code Review Agent
description: Agent
model: claude-opus-4
routing: openrouter,anthropic/claude-opus-4
---

You are a code review expert...
*/
```

---

## claw.run

### claw.yaml

```yaml
resources:
  memory: 512MB
  cpu: 0.5
```

- ❌ Dashboard + DB

### claw.yaml

```yaml
# Routex optimized deployment for claw.run
name: routex
runtime: bun

# Build configuration
build:
  command: |
    bun install &&
    cd dashboard && bun install && bun run build && cd .. &&
    bun run build
  output: dist/

# Start command
start:
  command: bun run dist/server.js

# Environment variables
env:
  PORT: 8080
  NODE_ENV: production
  DATABASE_PATH: /data/routex.db
  LOAD_BALANCE_STRATEGY: priority
  SESSION_DURATION: 18000
  LOG_LEVEL: info
  ENABLE_DASHBOARD: true
# : API
  ADMIN_API_KEY: ${ADMIN_API_KEY}

# Resource limits
resources:
memory: 768MB  # 768MBDashboard
cpu: 0.75      # CPU
disk: 2GB      #

# Health check
health_check:
  path: /health
  interval: 30s
  timeout: 5s
  healthy_threshold: 2
  unhealthy_threshold: 3
  initial_delay: 10s

# Persistent storage
volumes:
  - path: /data
    size: 2GB

# Network
network:
  public: true
  port: 8080
  domains:
    - routex.claw.run

# Auto-scaling
scaling:
  min_instances: 1
  max_instances: 2
  cpu_threshold: 80
  memory_threshold: 85

# Logs
logs:
  max_size: 100MB
  rotation: daily
  retention: 7d
```

```typescript
// src/config/config.ts
class ConfigManager {
  detectEnvironment(): 'local' | 'claw' | 'railway' | 'fly' | 'render' {
    if (process.env.CLAW_ENV) return 'claw';
    if (process.env.RAILWAY_ENVIRONMENT) return 'railway';
    if (process.env.FLY_APP_NAME) return 'fly';
    if (process.env.RENDER) return 'render';
    return 'local';
  }

  getDefaultConfig() {
    const env = this.detectEnvironment();

    if (env === 'claw') {
      return {
        database: { path: '/data/routex.db' },
        server: { host: '0.0.0.0', port: 8080 },
        dashboard: { enabled: true, path: '/dashboard' }
      };
    }
  }
}
```

```typescript
// src/api/routes.ts
app.get('/health', (c) => {
  const db = c.get('db');
  const channels = db.getChannels();
  const enabledChannels = channels.filter(ch => ch.status === 'enabled');

  return c.json({
    status: enabledChannels.length > 0 ? 'healthy' : 'degraded',
    version: '1.0.0',
    uptime: process.uptime(),
    channels: {
      total: channels.length,
      enabled: enabledChannels.length
    },
    database: db.isConnected(),
    memory: process.memoryUsage()
  });
});
```

```typescript
// src/server.ts
async function main() {
  const env = ConfigManager.detectEnvironment();
  console.log(`🌍 Environment: ${env}`);

  if (env === 'claw') {
    validateClawEnvironment();
  }

  await ensureDataDirectory();

  await db.migrate();

  const server = serve({ ... });

  console.log('✅ Routex ready on claw.run!');
}
```

```typescript
// claw.run
if (env === 'claw' && channels.length === 0) {
  console.log('📝 Creating example channel configuration...');

// API Keyclaw.run
  const apiKey = process.env.DEFAULT_ANTHROPIC_KEY;

  if (apiKey) {
    db.createChannel({
      name: 'Default Claude',
      type: 'anthropic',
      apiKey: apiKey,
      models: ['claude-sonnet-4-20250514'],
      priority: 100,
      status: 'enabled'
    });
    console.log('✅ Default channel created!');
  }
}
```

---

- ✅ DatabaseBun SQLiteccflareAsyncDbWriter
- ✅ ServerHono vs ccflare
- ✅ APIRESTfulccflare
- ✅ DashboardReact 19ccflaredashboard-web

- ⭐ Transformerclaude-code-router
- ⭐ llmio
- ⭐ cc-switch

### 2. LICENSE

```
MIT License

Copyright (c) 2025 dctx-team

Based on concepts from:
- ccflare by snipeship (MIT License)
- Inspired by claude-code-router routing patterns
- Inspired by llmio intelligent balancing
- Inspired by cc-switch configuration management

Permission is hereby granted, free of charge...
```

### 3. README

```markdown
## Acknowledgments

Routex is inspired by several excellent projects:
- **ccflare** by [@snipeship](https://github.com/snipeship/ccflare) - Channel management concepts
- **claude-code-router** by [@musistudio](https://github.com/musistudio/claude-code-router) - Routing patterns
- **llmio** by [@atopos31](https://github.com/atopos31/llmio) - Intelligent balancing
- **cc-switch** by [@farion1231](https://github.com/farion1231/cc-switch) - Configuration management

All implementations are original work by dctx-team.
```

---

-  Day 1-2: SmartRouter
-  Day 3-4: Transformer
-  Day 5-7: / +

### 2: Dashboard
-  Day 1-3: Dashboard
-  Day 4-5: UI
-  Day 6-7: UI

### 3: Analytics
-  Day 1-2: Analytics
-  Day 3-4: UI
-  Day 5-7: claw.run

-  OAuth
-  Agent

---

-  APIZod
-  TypeScript

-  Bun test
-  API
-  E2EDashboard

-  APIOpenAPI/Swagger
-  Transformer

-  Database
-  Dashboard

---

- ✅  < 150MBDashboard/ < 300MBDashboard
- ✅  < 50ms
- ✅  > 100/s

- ✅ 10+Transformer
- ✅ Dashboard < 200ms

- ✅ claw.run
- ✅ Fly.io
- ✅ Railway $5
- ✅ Docker < 200MB

---

- ⚠️ **Bun**: Bun
- ****: Bun

- ⚠️ **Dashboard**: React
- ****: Tree shaking

- ⚠️ ****: ccflare

- ⚠️ ****: claw.run

---

1. ✅ `OPTIMIZATION_PLAN.md`
2. 🔄 `README.md`
3. 🔄 GitHub Issues
4. 🔄 GitHub Project

1. SmartRouter
2. Transformersanthropic/openai/gemini
3. claw.yaml
4. claw.run

1. Phase 1
2. v1.1.0SmartRouter + Transformers
3. Dashboard
4. CI/CD

---

Routex
2. ****: TransformerDashboard
4. ****: claw.run/Fly.io

**Route smarter, scale faster** 🎯
