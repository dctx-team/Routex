# Routex 🎯

> Route smarter, scale faster

Next-generation AI API router and load balancer with intelligent channel management, session-aware routing, and zero-config deployment.

下一代 AI API 路由器和负载均衡器，具有智能渠道管理、会话感知路由和零配置部署。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-≥1.2.0-orange.svg)](https://bun.sh)

## ✨ Features / 特性

- 🔀 **Intelligent Load Balancing** - 4 strategies: Priority, Round Robin, Weighted, Least Used
  - 智能负载均衡 - 4 种策略：优先级、轮询、加权、最少使用

- 🎯 **Session-Aware Routing** - 5-hour session persistence for context continuity
  - 会话感知路由 - 5 小时会话保持，确保上下文连续性

- 🛡️ **Circuit Breaker** - Automatic failure detection and recovery
  - 熔断器 - 自动故障检测和恢复

- 📊 **Real-time Dashboard** - Modern React UI with live metrics
  - 实时仪表板 - 现代化 React UI，实时指标

- 🔐 **OAuth Support** - PKCE flow with automatic token refresh
  - OAuth 支持 - PKCE 流程，自动 token 刷新

- 🚀 **Zero-Config Deployment** - One-click deploy to free platforms
  - 零配置部署 - 一键部署到免费平台

- 💾 **SQLite Backend** - Lightweight, fast, no external dependencies
  - SQLite 后端 - 轻量、快速、无外部依赖

- 📈 **Analytics** - Token usage tracking and cost estimation
  - 分析 - Token 使用追踪和成本估算

## 🚀 Quick Start / 快速开始

### Installation / 安装

```bash
# Install Bun if not already installed / 如果尚未安装 Bun，请先安装
curl -fsSL https://bun.sh/install | bash

# Clone the repository / 克隆仓库
git clone https://github.com/dctx-team/Routex.git
cd Routex

# Install dependencies / 安装依赖
bun install

# Start the server / 启动服务器
bun start
```

### First Run Setup / 首次运行设置

On first run, Routex will guide you through a 3-step setup wizard:
首次运行时，Routex 将引导您完成 3 步设置向导：

1. Add your first AI channel (Anthropic Claude, OpenAI, etc.)
   添加您的第一个 AI 渠道（Anthropic Claude、OpenAI 等）

2. Configure load balancing strategy
   配置负载均衡策略

3. Set up dashboard access credentials
   设置仪表板访问凭据

## 📖 Documentation / 文档

- [Architecture Overview](./docs/architecture.md) / [架构概览](./docs/architecture.md)
- [Configuration Guide](./docs/configuration.md) / [配置指南](./docs/configuration.md)
- [Deployment Guide](./docs/deployment.md) / [部署指南](./docs/deployment.md)
- [API Reference](./docs/api.md) / [API 参考](./docs/api.md)

## 🎯 Use Cases / 使用场景

- **Cost Optimization** - Route requests to channels with different pricing tiers
  - 成本优化 - 将请求路由到不同定价层的渠道

- **High Availability** - Automatic failover between multiple API providers
  - 高可用性 - 多个 API 提供商之间自动故障转移

- **Rate Limit Management** - Distribute load across accounts to avoid limits
  - 速率限制管理 - 跨账户分配负载以避免限制

- **Multi-Region Routing** - Route to nearest or fastest endpoint
  - 多区域路由 - 路由到最近或最快的端点

## 🏗️ Architecture / 架构

```
Routex/
├── src/
│   ├── server.ts          # Main server entry / 主服务器入口
│   ├── core/              # Core business logic / 核心业务逻辑
│   │   ├── proxy.ts       # Request proxy engine / 请求代理引擎
│   │   ├── loadbalancer.ts # Load balancing / 负载均衡
│   │   └── analytics.ts   # Analytics tracking / 分析追踪
│   ├── db/                # Database layer / 数据库层
│   │   ├── database.ts    # SQLite operations / SQLite 操作
│   │   └── migrations.ts  # Schema migrations / 架构迁移
│   ├── api/               # HTTP API routes / HTTP API 路由
│   │   └── routes.ts      # Route definitions / 路由定义
│   └── config/            # Configuration / 配置
│       ├── config.ts      # Config management / 配置管理
│       └── wizard.ts      # Setup wizard / 设置向导
├── dashboard/             # React dashboard / React 仪表板
│   └── src/
├── public/                # Static assets / 静态资源
├── deploy/                # Deployment configs / 部署配置
│   ├── claw.yaml
│   ├── railway.yaml
│   └── fly.toml
└── docs/                  # Documentation / 文档
```

## 🌟 Why Routex? / 为什么选择 Routex？

Routex is built from the ground up for **simplicity and performance**:
Routex 从头开始构建，注重**简洁性和性能**：

- ⚡ **66% less code** than traditional monorepo architecture
  - 比传统 monorepo 架构少 66% 的代码

- 🚀 **<1s startup time** vs 5-10s for complex systems
  - 启动时间 <1 秒，而复杂系统需要 5-10 秒

- 💾 **<100MB memory** footprint in production
  - 生产环境内存占用 <100MB

- 🎁 **Free tier compatible** - runs on claw.run, Fly.io, Railway
  - 兼容免费层 - 可在 claw.run、Fly.io、Railway 上运行

## 🤝 Contributing / 贡献

Contributions are welcome! Please read our [Contributing Guide](./docs/contributing.md) first.
欢迎贡献！请先阅读我们的[贡献指南](./docs/contributing.md)。

## 📄 License / 许可证

MIT License - see [LICENSE](./LICENSE) for details.

Based on [ccflare](https://github.com/snipeship/ccflare) by snipeship.

## 🙏 Acknowledgments / 致谢

- Original ccflare project by [@snipeship](https://github.com/snipeship)
- Inspired by New-API channel management pattern
- Built with [Bun](https://bun.sh) and [Hono](https://hono.dev)

---

**Route smarter, scale faster with Routex** 🎯

**使用 Routex 更智能地路由，更快地扩展** 🎯
