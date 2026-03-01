# Changelog

All notable changes to Routex will be documented in this file.
Routex

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - 2026-03-01

### 🐛 Fixed (Comprehensive Code Review)

#### Critical Fixes

- **Streaming response now works correctly** (`src/providers/base.ts`, `src/core/proxy.ts`)
  - `BaseProvider.handleResponse()` now detects `Content-Type: text/event-stream` and returns the `ReadableStream` body directly instead of calling `response.json()` which destroyed SSE streams
  - `ProxyEngine.handle()` now pipes `ReadableStream` directly to the client with the original headers for streaming responses, while non-streaming responses continue through JSON serialization
  - Response transformers are skipped for streaming responses to avoid consuming the stream

- **Circuit breaker sets correct status** (`src/core/proxy.ts` line 653)
  - Fixed: when the circuit breaker threshold is exceeded, the channel status is now correctly set to `'circuit_breaker'` instead of `'rate_limited'`
  - The two failure modes (upstream rate limiting vs internal circuit breaker) are now properly distinguished

- **`flushRequests()` race condition eliminated** (`src/db/database.ts`)
  - Fixed: the request log buffer is now snapshotted and swapped atomically at the start of the flush, so new items pushed during the SQLite transaction are never lost

- **Route ordering: `/export` and `/presets` no longer shadowed** (`src/api/routes.ts`)
  - Fixed: `GET /api/channels/export`, `POST /api/channels/import`, and `GET /api/channels/presets` are now registered **before** `GET /api/channels/:id` to prevent the parameterized route from capturing them

#### Warning Fixes

- **`validateRequired()` now catches `null` as well as `undefined`** (`src/core/errors.ts`)
  - Fixed: changed `data[field] === undefined` to `data[field] == null` to reject both missing and explicitly-null required fields

- **Malformed JSON body returns 400 instead of forwarding null** (`src/core/proxy.ts`)
  - Fixed: when a request has `Content-Type: application/json` but the body is not valid JSON, a `ValidationError` (HTTP 400) is thrown immediately instead of silently forwarding a `null` body to the provider

- **Custom router's returned Channel is no longer dropped** (`src/core/routing/smart-router.ts`)
  - Fixed: `matchesRule()` now returns `boolean | Channel` and passes `availableChannels` to custom router functions
  - `findMatchingChannel()` uses the directly-returned `Channel` when a custom router function returns one, instead of always falling back to `targetChannel` lookup

- **Dead code removed** (`src/core/retry-strategy.ts`)
  - Removed the unreachable `[502, 503, 504]` check block that was already covered by the `status >= 500` branch above it

### ✨ Added (Reference Project Improvements)

#### SmartRouter - Extended Routing Conditions

Inspired by **claude-code-router**, **llmio**, and **cc-switch** reference projects:

- **`hasThinking` Routing Condition** - Detect extended thinking requests and route to thinking-capable models
  - Checks `thinking: {type: 'enabled'}` in request body
  - Example: Route thinking-heavy requests to Claude claude-opus-4 / Gemini 2.5 Pro
- **`modelPrefix` Routing Condition** - Route based on model name prefix
  - Inspired by claude-code-router's background model routing for `claude-3-5-haiku` prefix
  - Example: `modelPrefix: "claude-3-5-haiku"` → route to cheaper background model
- **`hasWebSearch` Routing Condition** - Detect built-in web_search tool usage
  - Checks if `tools` array contains items with `type.startsWith('web_search')`
  - Example: Route web search requests to models with web grounding support
- **`thinking` Parameter in RouterContext** - The request's thinking config is now passed to SmartRouter

#### Proxy Engine - Subagent Model Tag Routing

Inspired by **claude-code-router**'s `<CCR-SUBAGENT-MODEL>` pattern:

- **`<ROUTEX-SUBAGENT-MODEL>` Tag Parsing** - Route sub-agent requests to specific models
  - Embed `<ROUTEX-SUBAGENT-MODEL>claude-3-5-haiku-20241022</ROUTEX-SUBAGENT-MODEL>` in system prompt
  - The tag is automatically stripped from the system prompt before forwarding
  - Allows Claude Code to explicitly route sub-agent requests to cheaper models

#### Configuration - Environment Variable Interpolation

Inspired by **claude-code-router**'s config design:

- **`$VAR_NAME` Syntax** - Reference environment variables in `routex.config.json`
- **`${VAR_NAME}` Syntax** - Alternative curly brace syntax
- Keeps API keys out of config files, safe for version control
- Example: `"apiKey": "$ANTHROPIC_API_KEY"` or `"apiKey": "${ANTHROPIC_API_KEY}"`

#### API - Provider Preset Templates

Inspired by **cc-switch**'s provider preset system (Longcat, kat-coder, iFlow, etc.):

- **`GET /api/channels/presets`** - Returns pre-configured channel templates
  - OpenRouter (300+ models)
  - DeepSeek (deepseek-chat, deepseek-reasoner)
  - SiliconFlow (Qwen3, DeepSeek-V3)
  - Google Gemini (2.5 Pro, 2.5 Flash)
  - Ollama (local models)
  - Anthropic Official
  - iFlow Platform (free GLM, Kimi-K2, Qwen3-Coder)
  - Azure OpenAI

#### API - Full Config Export/Import

Inspired by **cc-switch**'s complete configuration backup with routing rules:

- **`GET /api/config/full-export`** - Export channels + routing rules as `v2.0` format
- **`POST /api/config/full-import`** - Import channels + routing rules from `v2.0` format
  - Skips existing channels/rules by name (non-destructive)
  - Returns detailed import results

---

## [1.1.0-beta] - 2025-10-15

### 🎯 Added

#### SmartRouter - Intelligent Routing System

- **SmartRouter Engine** - Content-aware request routing
- SmartRouter
- **7 Routing Condition Types** - Flexible routing rules
- `tokenThreshold` - Route based on token count /  token
- `keywords` - Route based on keywords
- `userPattern` - Route based on regex patterns
- `modelPattern` - Route based on model names
- `hasTools` - Route based on tool usage
- `hasImages` - Route based on image content
- `customFunction` - Route using custom functions
- **Priority-based Matching** - Rules matched by priority with automatic fallback
- **Custom Router Functions** - Register custom routing logic

#### Transformers - Format Conversion System

- **Transformer Framework** - Extensible format conversion
- Transformer
- **AnthropicTransformer** - Anthropic Messages API format (base)
- Anthropic  - Anthropic  API
- **OpenAITransformer** - Bidirectional Anthropic ↔ OpenAI conversion
- OpenAI  - Anthropic ↔ OpenAI
- **Tool Call Conversion** - Automatic tool/function format conversion
- **Image Content Conversion** - Image URL and base64 format handling
-  -  URL  base64
- **Transformer Chains** - Sequential transformer application
- Transformer  -  transformers
- **Per-Channel Configuration** - Configure transformers per channel
-  -  transformers

#### API Endpoints / API

- **Routing Rules API** - `/api/routing/rules`
-  API - `/api/routing/rules`
- `GET /api/routing/rules` - List all rules
- `GET /api/routing/rules/enabled` - List enabled rules
- `GET /api/routing/rules/:id` - Get single rule
- `POST /api/routing/rules` - Create rule
- `PUT /api/routing/rules/:id` - Update rule
- `DELETE /api/routing/rules/:id` - Delete rule
- `POST /api/routing/rules/:id/enable` - Enable rule
- `POST /api/routing/rules/:id/disable` - Disable rule
- `POST /api/routing/test` - Test routing

- **Transformers API** - `/api/transformers`
  - Transformers API - `/api/transformers`
- `GET /api/transformers` - List transformers /  transformers
- `POST /api/transformers/test` - Test transformer /  transformer

#### Database Schema

- **routing_rules Table** - Store routing rules with 3 indexes
- routing_rules  - 3
- **Circuit Breaker Fields** - Added to channels table
- `consecutive_failures` - Track failure count
- `last_failure_time` - Last failure timestamp
- `circuit_breaker_until` - Circuit breaker timeout
- `rate_limited_until` - Rate limit timeout
- `transformers` - Transformer configuration / Transformer

#### Integration

- **ProxyEngine Integration** - SmartRouter and Transformers integrated into proxy flow
- ProxyEngine  - SmartRouter  Transformers
- **Request Transformation** - Apply transformers before sending to upstream
-  -  transformers
- **Response Transformation** - Apply reverse transformers on response
-  -  transformers
- **Graceful Degradation** - Continue with original request/response if transformation fails

#### Response Headers

- `X-Routing-Rule` - Show matched routing rule name
- `X-Channel-Name` - Show selected channel name

### 📝 Changed

- **Startup Logs** - Added routing rules and transformers count
- **ProxyEngine Constructor** - Now accepts optional SmartRouter and TransformerManager
- **Unified Logging** - Replaced scattered console.log/warn/error with structured pino logger across server modules (routing API, transformers, error handler), with contextual fields for transformer pipeline.
- **Tracing Performance** - Optimized Span/Trace ID generation (sequence counters) and reduced logging in test mode; fixed minor stats bug (values) to improve nested span performance.

### 📚 Documentation

- **API_REFERENCE.md** - Complete API documentation
- API_REFERENCE.md -  API
- **IMPLEMENTATION_STATUS_V2.md** - Detailed implementation report
- IMPLEMENTATION_STATUS_V2.md
- **README.md** - Updated with v1.1.0 features
- README.md -  v1.1.0
- **Usage Examples** - Added SmartRouter and Transformers examples
-  -  SmartRouter  Transformers

### 🎉 Statistics

- **~1,696 lines** of new code added /  1,696
- **13 files** created or modified /  13
- **2 transformers** implemented (Anthropic, OpenAI) /  2  transformers
- **7 routing conditions** supported /  7
- **95% completion** for v1.1.0-beta / v1.1.0-beta  95%

---

## [1.0.0] - 2025-10-14

### 🎉 Initial Release

#### Core Features

- **Load Balancing** - 4 strategies (Priority, Round Robin, Weighted, Least Used)
- **Session-Aware Routing** - 5-hour session persistence
- **Circuit Breaker** - Automatic failure detection and recovery
- **SQLite Backend** - Lightweight database with WAL mode
- SQLite  - WAL
- **Analytics** - Token usage tracking and cost estimation
-  - Token

#### API Endpoints / API

- Channel Management API /  API
- Request Logs API /  API
- Analytics API /  API
- Load Balancer API /  API
- Health Check

#### Architecture

- Single repository architecture
- Bun runtime with TypeScript / Bun TypeScript
- Hono web framework / Hono
- 66% less code than monorepo alternatives /  monorepo  66%

---

## Legend

- 🎯 **Added** - New features
- 📝 **Changed** - Changes in existing functionality
- 🐛 **Fixed** - Bug fixes / Bug
- 🗑️ **Removed** - Removed features
- ⚠️ **Deprecated** - Soon-to-be removed features
- 🔒 **Security** - Security improvements
- 📚 **Documentation** - Documentation changes
- 🎉 **Statistics** - Release statistics

---

**For detailed documentation, see [API Reference](./API_REFERENCE.md) and [docs/](./docs/)**

** [API ](./API_REFERENCE.md)  (./docs/)**
