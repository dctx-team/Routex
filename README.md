# Routex 🎯

> Route smarter, scale faster

Next-generation AI API router and load balancer with intelligent routing, format transformation, session-aware routing, and zero-config deployment.

AI API

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-≥1.2.0-orange.svg)](https://bun.sh)
[![Version](https://img.shields.io/badge/Version-v1.1.0--beta-green.svg)](https://github.com/dctx-team/Routex/releases)

## ✨ Features

### 🎯 v1.1.0 New Features / v1.1.0

- 🧠 **SmartRouter - Intelligent Routing** - Route requests based on content analysis
  - 7 routing condition types: token threshold, keywords, regex, tools, images, custom functions
- 7 token
  - Priority-based rule matching with automatic fallback

- 🔄 **Transformers - Format Conversion** - Seamless API format transformation
-  -  API
  - Bidirectional conversion between Anthropic ↔ OpenAI formats
- Anthropic ↔ OpenAI
  - Tool calls and image content conversion
  - Extensible transformer architecture
-  transformer

### 🔧 Core Features

- 🔀 **Intelligent Load Balancing** - 4 strategies: Priority, Round Robin, Weighted, Least Used

- 🎯 **Session-Aware Routing** - 5-hour session persistence for context continuity

- 🛡️ **Circuit Breaker** - Automatic failure detection and recovery

- 📊 **Real-time Dashboard** - Modern React UI with live metrics
-  -  React UI

- 🔐 **OAuth Support** - PKCE flow with automatic token refresh
- OAuth  - PKCE  token

- 🚀 **Zero-Config Deployment** - One-click deploy to free platforms

- 💾 **SQLite Backend** - Lightweight, fast, no external dependencies
- SQLite

- 📈 **Analytics** - Token usage tracking and cost estimation
-  - Token

## 🚀 Quick Start

### Installation

```bash
# Install Bun if not already installed /  Bun
curl -fsSL https://bun.sh/install | bash

# Clone the repository
git clone https://github.com/dctx-team/Routex.git
cd Routex

# Install dependencies
bun install

# Start the server
bun start
```

### First Run Setup

On first run, Routex will guide you through a 3-step setup wizard:
Routex  3

1. Add your first AI channel (Anthropic Claude, OpenAI, etc.)
AI Anthropic ClaudeOpenAI

2. Configure load balancing strategy

3. Set up dashboard access credentials

## 🎯 SmartRouter Usage / SmartRouter

### Creating Routing Rules

Route long-context requests to Gemini automatically:
Gemini

```bash
curl -X POST http://localhost:8080/api/routing/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Long Context to Gemini",
    "type": "longContext",
    "condition": {
      "tokenThreshold": 60000
    },
    "targetChannel": "gemini-channel",
    "targetModel": "gemini-2.5-pro",
    "priority": 100
  }'
```

Route code review tasks to Claude Opus:
Claude Opus

```bash
curl -X POST http://localhost:8080/api/routing/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Code Review Tasks",
    "type": "custom",
    "condition": {
      "keywords": ["code review", "review this code", "analyze code"]
    },
    "targetChannel": "claude-opus-channel",
    "priority": 90
  }'
```

## 🔄 Transformers Usage / Transformers

### Configuring Channel Transformers /  Transformers

Use OpenRouter with automatic format conversion:
OpenRouter

```bash
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenRouter Channel",
    "type": "openai",
    "baseUrl": "https://openrouter.ai/api/v1/chat/completions",
    "apiKey": "sk-or-xxx",
    "models": ["anthropic/claude-opus-4"],
    "transformers": {
      "use": ["openai"]
    }
  }'
```

### Testing Transformers /  Transformers

```bash
curl -X POST http://localhost:8080/api/transformers/test \
  -H "Content-Type: application/json" \
  -d '{
    "transformer": "openai",
    "direction": "request",
    "request": {
      "model": "claude-opus-4",
      "messages": [{"role": "user", "content": "Hello"}],
      "max_tokens": 100
    }
  }'
```

## 📖 Documentation

- [🎯 API Reference](./API_REFERENCE.md) / [API ](./API_REFERENCE.md) ⭐ NEW
- [🗺️ Development Roadmap](./ROADMAP.md) / (./ROADMAP.md)
- [📋 Optimization Plan](./OPTIMIZATION_PLAN.md) / (./OPTIMIZATION_PLAN.md)
- [📊 Implementation Status](./IMPLEMENTATION_STATUS_V2.md) / (./IMPLEMENTATION_STATUS_V2.md) ⭐ NEW
- [Architecture Overview](./docs/architecture.md) / (./docs/architecture.md)
- [Configuration Guide](./docs/configuration.md) / (./docs/configuration.md)
- [Deployment Guide](./docs/deployment.md) / (./docs/deployment.md)

## 🎯 Use Cases

### SmartRouter Scenarios / SmartRouter

- **Long Context Routing** - Automatically route requests with >60K tokens to Gemini
-  -  >60K token  Gemini

- **Task-Based Routing** - Route code review, analysis, or creative tasks to specific models

- **Image Processing** - Route requests with images to vision-capable models

- **Tool Usage Optimization** - Route tool-calling requests to models with best function-calling support

### General Scenarios

- **Cost Optimization** - Route requests to channels with different pricing tiers

- **High Availability** - Automatic failover between multiple API providers
-  -  API

- **Rate Limit Management** - Distribute load across accounts to avoid limits

- **Multi-Region Routing** - Route to nearest or fastest endpoint

## 🏗️ Architecture

```
Routex/
├── src/
│   ├── server.ts          # Main server entry
│   ├── core/              # Core business logic
│   │   ├── proxy.ts       # Request proxy engine
│   │   ├── loadbalancer.ts # Load balancing
│   │   ├── routing/       # SmartRouter
│   │   │   └── smart-router.ts # Routing engine
│   │   └── analytics.ts   # Analytics tracking
│   ├── transformers/      # Format transformers
│   │   ├── base.ts        # Base transformer
│   │   ├── anthropic.ts   # Anthropic format / Anthropic
│   │   ├── openai.ts      # OpenAI format / OpenAI
│   │   └── index.ts       # Manager
│   ├── db/                # Database layer
│   │   ├── database.ts    # SQLite operations / SQLite
│   │   └── migrations.ts  # Schema migrations
│   ├── api/               # HTTP API routes / HTTP API
│   │   ├── routes.ts      # Route definitions
│   │   ├── routing.ts     # Routing rules API /  API
│   │   └── transformers.ts # Transformers API / Transformers API
│   └── config/            # Configuration
│       ├── config.ts      # Config management
│       └── wizard.ts      # Setup wizard
├── dashboard/             # React dashboard / React
│   └── src/
├── public/                # Static assets
├── deploy/                # Deployment configs
│   ├── claw.yaml
│   ├── railway.yaml
│   └── fly.toml
└── docs/                  # Documentation
```

## 🌟 Why Routex? /  Routex

Routex is built from the ground up for **simplicity and performance**:
Routex ****

- ⚡ **66% less code** than traditional monorepo architecture
-  monorepo  66%

- 🚀 **<1s startup time** vs 5-10s for complex systems

- 💾 **<100MB memory** footprint in production
-  <100MB

- 🎁 **Free tier compatible** - runs on claw.run, Fly.io, Railway
-  -  claw.runFly.ioRailway

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./docs/contributing.md) first.
(./docs/contributing.md)

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

Based on [ccflare](https://github.com/snipeship/ccflare) by snipeship.

## 🙏 Acknowledgments

Routex is inspired by several excellent open-source projects:

- **ccflare** by [@snipeship](https://github.com/snipeship/ccflare) - Channel management concepts
- **claude-code-router** by [@musistudio](https://github.com/musistudio/claude-code-router) - Smart routing patterns
- **llmio** by [@atopos31](https://github.com/atopos31/llmio) - Intelligent load balancing
- **cc-switch** by [@farion1231](https://github.com/farion1231/cc-switch) - Configuration management UI

All implementations are original work by dctx-team with independent copyright.

Built with [Bun](https://bun.sh) and [Hono](https://hono.dev).

---

**Route smarter, scale faster with Routex** 🎯

** Routex ** 🎯
