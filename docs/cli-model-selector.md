# CLI 模型选择器

Routex 的交互式命令行工具，提供友好的界面来管理渠道和选择模型。

## 📖 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [功能介绍](#功能介绍)
- [使用指南](#使用指南)
- [模型数据库](#模型数据库)
- [常见问题](#常见问题)

## 概述

CLI 模型选择器是一个交互式命令行工具，帮助您：

- 📋 查看和管理所有渠道
- ➕ 快速添加新渠道
- 🎯 选择最适合的模型
- 🧪 测试渠道连接
- 📊 查看统计信息

### 主要特性

- **零依赖**：仅使用 Node.js/Bun 内置模块
- **交互式**：友好的菜单和提示
- **彩色输出**：清晰的视觉反馈
- **模型数据库**：内置 Anthropic 和 OpenAI 模型信息
- **统计信息**：实时显示渠道性能数据

## 快速开始

### 方式 1：使用 npm 脚本

```bash
# 启动 CLI
bun run cli

# 或使用完整命令名
bun run select-model
```

### 方式 2：直接执行

```bash
# 使用 Bun
bun src/cli/model-selector.ts

# 使用 shell 脚本
./scripts/model-selector.sh
```

### 方式 3：独立可执行文件

```bash
# 赋予执行权限
chmod +x src/cli/model-selector.ts

# 直接执行
./src/cli/model-selector.ts
```

## 功能介绍

### 主菜单

启动 CLI 后，您将看到主菜单：

```
══════════════════════════════════════════════════════════
  🚀 Routex Model Selector
══════════════════════════════════════════════════════════

请选择操作:
  1. 查看所有渠道
  2. 添加新渠道
  3. 选择模型
  4. 测试渠道连接
  5. 渠道统计信息
  0. 退出

请输入选项 (0-5):
```

### 1. 查看所有渠道

显示所有配置的渠道，包括：

- ✓/✗ 状态指示
- 渠道名称和 ID
- 提供商类型
- 支持的模型列表
- 优先级和权重
- 请求统计（如有）

**示例输出：**

```
═ 所有渠道 ═

✓ Anthropic Main
  ID: ch_abc123
  类型: anthropic
  模型: claude-3-5-sonnet-20241022, claude-3-opus-20240229
  优先级: 90
  权重: 70
  请求数: 150 (成功率: 98.7%)

✓ OpenAI Backup
  ID: ch_def456
  类型: openai
  模型: gpt-4-turbo, gpt-3.5-turbo
  优先级: 70
  权重: 50
  请求数: 45 (成功率: 100.0%)
```

### 2. 添加新渠道

交互式引导创建新渠道：

#### 步骤 1：选择提供商

```
支持的提供商:
  1. Anthropic (Claude)
  2. OpenAI (GPT)
  3. Custom

选择提供商 (1-3):
```

#### 步骤 2：输入基本信息

```
渠道名称: My Claude Channel
API Key: sk-ant-...
```

#### 步骤 3：选择模型

系统会显示该提供商的所有可用模型：

```
可用模型:
  1. claude-3-5-sonnet-20241022
     Claude 3.5 Sonnet - 最新版本，最强性能
     能力: 200K context, Function Calling, Vision, Artifacts

  2. claude-3-opus-20240229
     Claude 3 Opus - 最强能力，适合复杂任务
     能力: 200K context, Function Calling, Vision

  3. claude-3-haiku-20240307
     Claude 3 Haiku - 快速响应，低成本
     能力: 200K context, Function Calling, Vision

选择模型 (输入序号，多个用逗号分隔，或 all):
```

可以：
- 输入单个序号：`1`
- 输入多个序号：`1,2,3`
- 输入 `all` 选择所有模型

#### 步骤 4：配置优先级和权重

```
优先级 (0-100, 默认 50): 80
权重 (0-100, 默认 50): 60
```

#### 步骤 5：完成

```
✓ 渠道创建成功: My Claude Channel (ID: ch_xyz789)
  模型: claude-3-5-sonnet-20241022, claude-3-opus-20240229
```

### 3. 选择模型

查看所有可用模型，并选择要使用的模型。

**示例：**

```
═ 选择模型 ═

可用模型:

1. claude-3-5-sonnet-20241022
   Claude 3.5 Sonnet - 最新版本，最强性能
   能力: 200K context, Function Calling, Vision, Artifacts
   可用渠道: Anthropic Main, Anthropic Backup

2. gpt-4-turbo
   GPT-4 Turbo - 最新 GPT-4，128K 上下文
   能力: 128K context, Function Calling, JSON mode
   可用渠道: OpenAI Main

选择模型 (输入序号): 1

已选择: claude-3-5-sonnet-20241022

该模型在以下渠道可用:
  1. Anthropic Main
     优先级: 90, 权重: 70
     成功率: 98.7% (150 请求)

  2. Anthropic Backup
     优先级: 70, 权重: 50
     成功率: 100.0% (20 请求)

提示: 在实际使用中，Routex 会根据负载均衡策略自动选择最佳渠道
```

### 4. 测试渠道连接

测试指定渠道的连接状态。

**流程：**

```
═ 测试渠道连接 ═

选择要测试的渠道:
  1. Anthropic Main (anthropic)
  2. OpenAI Backup (openai)

输入序号: 1

ℹ 正在测试渠道: Anthropic Main...
  检查 API Key...
  检查网络连接...
  发送测试请求...

✓ 连接测试成功！
  响应时间: ~350ms
```

### 5. 渠道统计信息

显示所有渠道的详细统计数据。

**示例输出：**

```
═ 渠道统计信息 ═

总体统计:
  总请求数: 195
  成功: 193
  失败: 2
  成功率: 99.0%

各渠道详情:

✓ Anthropic Main
  请求数: 150
  成功: 148
  失败: 2
  成功率: 98.7%
  平均延迟: ~200ms
  最后使用: 2024-01-15 14:30:25

✓ OpenAI Backup
  请求数: 45
  成功: 45
  失败: 0
  成功率: 100.0%
  平均延迟: ~200ms
  最后使用: 2024-01-15 12:15:10
```

## 使用指南

### 典型工作流

#### 场景 1：初始设置

1. 启动 CLI
2. 选择 "添加新渠道"
3. 添加 Anthropic 渠道
4. 添加 OpenAI 渠道（备用）
5. 查看所有渠道验证配置

#### 场景 2：选择模型进行开发

1. 启动 CLI
2. 选择 "选择模型"
3. 浏览可用模型
4. 查看每个模型的能力和可用渠道
5. 记录选择的模型名称

#### 场景 3：排查问题

1. 启动 CLI
2. 选择 "渠道统计信息"
3. 检查失败率
4. 选择 "测试渠道连接"
5. 测试有问题的渠道

### 环境变量

#### ROUTEX_DB_PATH

指定数据库文件路径。

```bash
export ROUTEX_DB_PATH=/path/to/custom/routex.db
bun run cli
```

默认值：`./data/routex.db`

## 模型数据库

CLI 内置了主流模型的信息数据库。

### Anthropic Claude 模型

| 模型 | 描述 | 上下文 | 能力 |
|------|------|--------|------|
| claude-3-5-sonnet-20241022 | 最新版本，最强性能 | 200K | Function Calling, Vision, Artifacts |
| claude-3-5-sonnet-20240620 | 前一版本 | 200K | Function Calling, Vision |
| claude-3-opus-20240229 | 最强能力，复杂任务 | 200K | Function Calling, Vision |
| claude-3-sonnet-20240229 | 平衡性能与成本 | 200K | Function Calling, Vision |
| claude-3-haiku-20240307 | 快速响应，低成本 | 200K | Function Calling, Vision |

### OpenAI GPT 模型

| 模型 | 描述 | 上下文 | 能力 |
|------|------|--------|------|
| gpt-4-turbo | 最新 GPT-4 | 128K | Function Calling, JSON mode |
| gpt-4-turbo-preview | 预览版本 | 128K | Function Calling |
| gpt-4 | 标准版本 | 8K | Function Calling |
| gpt-4-32k | 扩展上下文 | 32K | Function Calling |
| gpt-3.5-turbo | 快速且经济 | 16K | Function Calling |
| gpt-3.5-turbo-16k | 扩展上下文 | 16K | Function Calling |

### 自定义模型

对于不在数据库中的模型，CLI 支持手动输入：

```
模型列表 (用逗号分隔): custom-model-1, custom-model-2
```

## 高级功能

### 批量添加渠道

虽然 CLI 是交互式的，但您可以通过脚本自动化：

```bash
#!/bin/bash
# 批量添加渠道的示例脚本

# 使用 Routex API 或直接操作数据库
# 这里展示概念，实际实现需要更多代码
```

### 导出配置

CLI 读写相同的 SQLite 数据库，配置可以通过：

1. 复制数据库文件
2. 使用 Web 界面导出
3. 直接查询数据库

### 自动化集成

将 CLI 集成到 CI/CD 流程：

```yaml
# .github/workflows/setup-routex.yml
name: Setup Routex

on:
  workflow_dispatch:

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Configure channels
        run: |
          # 使用环境变量配置
          export ANTHROPIC_KEY=${{ secrets.ANTHROPIC_KEY }}
          export OPENAI_KEY=${{ secrets.OPENAI_KEY }}

          # 运行配置脚本
          bun run scripts/setup-channels.ts
```

## 常见问题

### Q: CLI 无法启动？

**A:** 检查：

1. Bun 是否已安装：`bun --version`
2. 是否在项目根目录
3. 数据库路径是否有写入权限

### Q: 看不到彩色输出？

**A:** 某些终端不支持 ANSI 颜色代码。尝试：

- 使用现代终端（iTerm2、Windows Terminal 等）
- 设置 `FORCE_COLOR=1` 环境变量

### Q: 如何重置所有配置？

**A:** 删除数据库文件：

```bash
rm ./data/routex.db
```

下次启动时会创建新数据库。

### Q: CLI 支持哪些操作系统？

**A:** 支持所有 Bun 支持的平台：

- macOS (Intel 和 Apple Silicon)
- Linux (x64 和 ARM64)
- Windows (通过 WSL)

### Q: 可以同时运行多个 CLI 实例吗？

**A:** 可以，但要注意：

- SQLite 支持并发读
- 并发写入可能有冲突
- 建议一次只运行一个实例进行写操作

### Q: 如何添加新的模型到数据库？

**A:** 编辑 `src/cli/model-selector.ts` 中的 `MODEL_DATABASE`：

```typescript
const MODEL_DATABASE = {
  // ... 现有模型
  'your-custom-model': {
    provider: 'custom',
    description: '你的自定义模型描述',
    capabilities: ['Feature 1', 'Feature 2'],
  },
};
```

### Q: CLI 会修改运行中的服务器吗？

**A:** 不会直接影响。CLI 修改的是数据库，服务器需要重启才能加载新配置。

建议流程：
1. 使用 CLI 配置
2. 重启 Routex 服务器
3. 验证新配置生效

## 最佳实践

### 1. 开发环境设置

开发时使用独立的数据库：

```bash
export ROUTEX_DB_PATH=./data/dev.db
bun run cli
```

### 2. 生产环境配置

生产环境建议：

- 使用 Web 界面进行配置
- CLI 用于快速查看状态
- 定期备份数据库

### 3. 团队协作

- 提交示例配置到版本控制
- 不提交包含真实 API Key 的数据库
- 使用环境变量管理敏感信息

### 4. 快速测试

快速测试新模型：

```bash
# 1. 添加测试渠道
bun run cli
# 选择 "添加新渠道"

# 2. 启动服务器
bun run dev

# 3. 发送测试请求
curl http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model":"your-test-model","messages":[...]}'
```

## 相关文档

- [渠道配置](./channels.md)
- [负载均衡](./load-balancing.md)
- [Smart Router](./smart-router.md)
- [Web 控制面板](./dashboard.md)

## 贡献

欢迎改进 CLI 工具！可以添加的功能：

- [ ] 模型性能对比
- [ ] 成本估算
- [ ] 配置导入/导出
- [ ] 批量操作
- [ ] 配置验证
- [ ] 更丰富的统计图表

提交 PR 到：https://github.com/dctx-team/Routex
