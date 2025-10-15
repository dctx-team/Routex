# Changelog

All notable changes to Routex will be documented in this file.
Routex

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
-  -  transformers
- **ProxyEngine Constructor** - Now accepts optional SmartRouter and TransformerManager
- ProxyEngine  -  SmartRouter  TransformerManager

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

**For detailed technical changes, see [IMPLEMENTATION_STATUS_V2.md](./IMPLEMENTATION_STATUS_V2.md)**

** [IMPLEMENTATION_STATUS_V2.md](./IMPLEMENTATION_STATUS_V2.md)**
