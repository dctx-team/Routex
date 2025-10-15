# Routex Development Roadmap 🗺️

> Last Updated: 2025-10-15

## Vision

Routex aims to be the **most developer-friendly AI API router** with independent copyright, optimized for free-tier deployments (claw.run, Fly.io, Railway) while maintaining enterprise-grade features.

Routex **AI API**claw.runFly.ioRailway

---

## Current Status

### ✅ Completed (v1.0.0)
- [x] Core architecture (66% code reduction vs ccflare)
- [x] 4 load balancing strategies (Priority, Round Robin, Weighted, Least Used)
- [x] Session-aware routing (5-hour persistence)
- [x] Circuit breaker mechanism
- [x] SQLite database with batch writing
- [x] Basic proxy engine with retry logic
- [x] RESTful API endpoints
- [x] Deployment configs (claw.run, Fly.io, Railway)
- [x] Docker support
- [x] Bilingual documentation

### 🚧 In Progress
- [ ] Optimization plan finalization
- [ ] Community feedback collection

---

## Release Timeline

### 📅 v1.1.0 - Smart Routing (: 2)

**Theme: Intelligent Request Routing / : **

#### Core Features
-  **SmartRouter Engine** / ****
  - [ ] Rule-based routing (default, background, think, longContext, webSearch, image)
  - [ ] Custom routing conditions (keywords, token threshold, regex patterns)
  - [ ] Custom JavaScript router functions
  - [ ] Subagent routing support
  - [ ] Request context analysis

-  **Transformer System** / ****
  - [ ] Base transformer interface
  - [ ] Built-in transformers:
    - [ ] `anthropic` - Anthropic API format
    - [ ] `openai` - OpenAI API format
    - [ ] `gemini` - Google Gemini format
    - [ ] `deepseek` - DeepSeek format
    - [ ] `maxtoken` - Token limit enforcement
    - [ ] `reasoning` - Reasoning content handling
  - [ ] Custom transformer support (plugin system)
  - [ ] Transformer chaining

-  **Enhanced API** / **API**
  - [ ] `GET/POST /api/routing/rules` - Routing rule management
  - [ ] `POST /api/routing/test` - Test routing with mock requests
  - [ ] `GET /api/transformers` - List available transformers

**Migration Guide** / ****: Will be provided for v1.0.0 users

---

### 📅 v1.2.0 - Configuration & Health (: 1)

**Theme: Management & Monitoring / : **

#### Core Features
-  **Config Import/Export** / ****
  - [ ] JSON format export (channels, strategies, routing rules)
  - [ ] Import with validation
  - [ ] Automatic backup (keep latest 10)
  - [ ] Partial import support
  - [ ] Migration from ccflare/claude-code-router configs

-  **Health Check System** / ****
  - [ ] Individual channel health testing
  - [ ] Batch health check for all channels
  - [ ] Speed/latency measurement
  - [ ] Periodic background health checks
  - [ ] Auto-disable unhealthy channels (optional)

-  **Enhanced Analytics** / ****
  - [ ] Per-channel request statistics
  - [ ] Token usage tracking
  - [ ] Cost estimation
  - [ ] Error rate monitoring
  - [ ] Request/response logging with filtering

**API Additions** / **API**:
- `POST /api/config/export`
- `POST /api/config/import`
- `GET /api/config/backups`
- `POST /api/channels/:id/test`
- `POST /api/channels/test-all`
- `GET /api/analytics/channels`
- `GET /api/analytics/usage`

---

### 📅 v1.3.0 - Web Dashboard (: 1.5)

**Theme: Visual Management / : **

#### Core Features
-  **Dashboard Framework** / ****
  - [ ] React 19 + TypeScript + Vite
  - [ ] Tailwind CSS styling
  - [ ] Responsive design (mobile-friendly)
  - [ ] Dark mode support
  - [ ] Real-time data updates (WebSocket/SSE)

-  **Dashboard Panels** / ****
-  **Channels Panel** / ****
    - List, add, edit, delete channels
    - Enable/disable channels
    - Health status indicators
    - Speed test button
    - Batch operations

-  **Routing Rules Panel** / ****
    - Visual rule editor
    - Priority drag-and-drop
    - Rule testing simulator
    - Import/export rules

-  **Analytics Panel** / ****
    - Real-time request stats
    - Token usage charts (Nivo charts)
    - Channel distribution pie chart
    - Cost estimation
    - Error rate graphs

-  **Request Logs Panel** / ****
    - Live request stream
    - Filters (channel, status, time range)
    - Request detail viewer
    - Export logs (CSV/JSON)

-  **Config Panel** / ****
    - System settings
    - Import/export configuration
    - Backup management

**Technical Stack** / ****:
- React 19 (with hooks)
- TanStack Query (data fetching)
- Recharts/Nivo (charts)
- shadcn/ui (UI components)
- Zustand (state management)

---

### 📅 v1.4.0 - OAuth & Sessions (: 2)

**Theme: Authentication & Sessions / : **

#### Core Features
-  **OAuth Support** / **OAuth**
  - [ ] PKCE flow implementation
  - [ ] Anthropic OAuth integration
  - [ ] OpenAI OAuth integration
  - [ ] Token refresh mechanism
  - [ ] Secure token storage

-  **Enhanced Session Management** / ****
  - [ ] Configurable session duration
  - [ ] Session cleanup intervals
  - [ ] Sticky routing (same channel per session)
  - [ ] Session analytics
  - [ ] Session UI (view active sessions)

-  **API Key Management** / **API**
  - [ ] Multi-API key support
  - [ ] Key rotation
  - [ ] Key usage tracking
  - [ ] Key expiration

---

### 📅 v1.5.0 - Multi-Tenancy (: 2.5)

**Theme: Enterprise Features / : **

#### Core Features
-  **Multi-Tenant Support** / ****
  - [ ] Tenant management (CRUD)
  - [ ] Tenant-specific API keys
  - [ ] Channel access control per tenant
  - [ ] Quota limits per tenant
  - [ ] Rate limiting per tenant
  - [ ] Tenant-specific routing rules

-  **Advanced Analytics** / ****
  - [ ] Per-tenant analytics
  - [ ] Cost allocation
  - [ ] Usage reports (PDF/Excel export)
  - [ ] Billing integration hooks

-  **Admin Panel** / ****
  - [ ] Tenant management UI
  - [ ] Global analytics dashboard
  - [ ] System health monitoring
  - [ ] Audit logs

---

### 📅 v2.0.0 - Agent System (: 3)

**Theme: Advanced AI Workflows / : AI**

#### Core Features
-  **Agent Framework** / **Agent**
  - [ ] Agent definition (Markdown + frontmatter)
  - [ ] Agent discovery (`~/.routex/agents/`)
  - [ ] Agent routing (model/channel override)
  - [ ] Agent chaining
  - [ ] Agent marketplace (community agents)

-  **Workflow Engine** / ****
  - [ ] Multi-step workflows
  - [ ] Conditional branching
  - [ ] Parallel execution
  - [ ] Workflow templates
  - [ ] Visual workflow editor

-  **Integration Ecosystem** / ****
  - [ ] GitHub Actions integration
  - [ ] Webhook support
  - [ ] MCP (Model Context Protocol) support
  - [ ] Custom plugin system

---

## Feature Comparison

| Feature | v1.0.0 | v1.1.0 | v1.2.0 | v1.3.0 | v1.4.0 | v1.5.0 | v2.0.0 |
|---------|--------|--------|--------|--------|--------|--------|--------|
| Basic Routing | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Load Balancing | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Smart Routing | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Transformers | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Config Import/Export | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Health Checks | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Web Dashboard | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| OAuth | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Multi-Tenancy | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Agent System | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Platform Optimization

### claw.run
- [x] v1.0.0: Basic deployment config
- [ ] v1.1.0: Optimized resource allocation (768MB memory)
- [ ] v1.2.0: Health check integration
- [ ] v1.3.0: Dashboard deployment
- [ ] v1.4.0: Persistent session storage

### Fly.io
- [x] v1.0.0: Basic fly.toml
- [ ] v1.2.0: Multi-region deployment
- [ ] v1.3.0: Auto-scaling configuration
- [ ] v1.5.0: Global edge deployment

### Railway
- [x] v1.0.0: Basic railway.yaml
- [ ] v1.2.0: Database volume optimization
- [ ] v1.3.0: Preview deployments

---

## Technical Debt

### High Priority
- [ ] Add Zod validation for all API endpoints (v1.1.0)
- [ ] Implement comprehensive unit tests (v1.2.0)
- [ ] Add integration tests (v1.2.0)
- [ ] Generate OpenAPI/Swagger documentation (v1.2.0)
- [ ] Optimize database queries with indexes (v1.2.0)

### Medium Priority
- [ ] Add request caching mechanism (v1.3.0)
- [ ] Implement E2E tests for Dashboard (v1.3.0)
- [ ] Add performance benchmarking (v1.3.0)
- [ ] Code splitting for Dashboard (v1.3.0)

### Low Priority
- [ ] Internationalization (i18n) for Dashboard (v1.4.0)
- [ ] Accessibility (a11y) improvements (v1.4.0)
- [ ] Mobile app (React Native) (v2.1.0+)

---

## Community & Ecosystem

### Documentation
- [ ] **v1.1.0**: Transformer development guide
- [ ] **v1.2.0**: API complete reference (Swagger)
- [ ] **v1.2.0**: Deployment best practices
- [ ] **v1.3.0**: Dashboard user guide
- [ ] **v1.4.0**: OAuth integration guide
- [ ] **v2.0.0**: Agent development guide

### Community
- [ ] **v1.1.0**: Create Discord server
- [ ] **v1.2.0**: Establish contribution guidelines
- [ ] **v1.3.0**: Launch community transformer repository
- [ ] **v2.0.0**: Launch agent marketplace

### Integrations
- [ ] **v1.2.0**: VS Code extension
- [ ] **v1.3.0**: JetBrains plugin
- [ ] **v1.4.0**: Chrome extension (quick config)
- [ ] **v2.0.0**: n8n/Zapier integration

---

## Performance Targets

| Metric | v1.0.0 | v1.3.0 (Dashboard) | v2.0.0 (Full) |
|--------|--------|-------------------|---------------|
| Startup Time | < 1s | < 1.5s | < 2s |
| Memory (No Dashboard) | < 100MB | < 120MB | < 150MB |
| Memory (With Dashboard) | N/A | < 300MB | < 400MB |
| Request Latency | < 50ms | < 50ms | < 50ms |
| Concurrent Requests | 100/s | 200/s | 500/s |
| Database Size (10K req) | < 10MB | < 15MB | < 20MB |
| Docker Image Size | < 200MB | < 250MB | < 300MB |

---

## Breaking Changes Policy

### Semantic Versioning
- **Major (x.0.0)**: Breaking API changes, database schema changes
- **Minor (1.x.0)**: New features, backward-compatible
- **Patch (1.0.x)**: Bug fixes, performance improvements

### Migration Support
- Migration guides for all major versions
- Database migration tools (auto-upgrade)
- Deprecation warnings (1 major version ahead)
- Legacy API support (1 major version)

---

## Success Metrics

### v1.3.0 Goals / v1.3.0
- [ ] 1,000+ GitHub stars
- [ ] 100+ active deployments on claw.run/Fly.io
- [ ] 50+ community contributors
- [ ] 95%+ test coverage
- [ ] < 5 critical bugs per month

### v2.0.0 Goals / v2.0.0
- [ ] 5,000+ GitHub stars
- [ ] 1,000+ active deployments
- [ ] 200+ community transformers
- [ ] 100+ community agents
- [ ] Featured on Hacker News / Product Hunt

---

## Funding & Sponsorship

### Current Status
- Self-funded
- Open to sponsorships

### Sponsorship Tiers
- **Bronze ($10/mo)**: Name in README
- **Silver ($50/mo)**: Logo in README + Discord role
- **Gold ($200/mo)**: Logo on website + Priority support
- **Platinum ($500/mo)**: Custom features + Consulting

### Use of Funds
1. Server costs (claw.run credits, testing infra)
2. Domain & hosting
3. Developer time
4. Community events (hackathons)

---

## Contributing

We welcome contributions! See our [Contributing Guide](docs/contributing.md) for details.

(docs/contributing.md)

### How to Contribute
1. Check the [Issues](https://github.com/dctx-team/Routex/issues) for tasks
2. Comment on an issue to claim it
3. Fork the repo and create a branch
4. Submit a PR with tests and docs
5. Wait for review and merge

### Priority Areas
- **v1.1.0**: SmartRouter implementation
- **v1.2.0**: Transformers (especially non-OpenAI formats)
- **v1.3.0**: Dashboard UI components
- **Documentation**: Always needed!

---

## Questions?

- **GitHub Issues**: https://github.com/dctx-team/Routex/issues
- **Discussions**: https://github.com/dctx-team/Routex/discussions
- **Email**: contact@dctx.team (coming soon)

---

**Route smarter, scale faster** 🎯

*Last updated: 2025-10-15*
