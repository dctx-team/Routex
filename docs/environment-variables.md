# 环境变量插值功能使用指南

## 🎯 功能概述

Routex v1.1.0+ 支持在配置中使用环境变量,提升安全性和便携性。此功能灵感来源于 **claude-code-router** 和 **cce-master** 项目。

## ✨ 主要特性

- 🔐 **安全性**: API密钥不再硬编码,可安全提交配置文件到Git
- 📦 **便携性**: 同一配置文件可在不同环境使用不同凭证
- 🔄 **灵活性**: 支持 `$VAR_NAME` 和 `${VAR_NAME}` 两种语法
- ✅ **验证**: 自动检测缺失的环境变量并提供警告
- 📝 **自动生成**: 根据配置自动生成 `.env.example` 文件

## 📖 使用方法

### 1. 创建 .env 文件

在 Routex 项目根目录创建 `.env` 文件:

```bash
# Routex 环境变量配置

# Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here

# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-key-here

# Google API Key
GOOGLE_API_KEY=your-google-api-key

# Custom Provider
CUSTOM_BASE_URL=https://api.custom-provider.com
CUSTOM_API_KEY=custom-secret-key
```

### 2. 在配置中使用环境变量

#### 方式一: 使用 Dashboard UI

在 Dashboard 中添加 Channel 时,可以直接使用环境变量语法:

**使用 `${VAR_NAME}` 格式(推荐):**

```json
{
  "name": "Anthropic Official",
  "type": "anthropic",
  "apiKey": "${ANTHROPIC_API_KEY}",
  "baseUrl": "https://api.anthropic.com",
  "models": ["claude-opus-4", "claude-sonnet-4"]
}
```

**使用 `$VAR_NAME` 格式:**

```json
{
  "name": "OpenAI",
  "type": "openai",
  "apiKey": "$OPENAI_API_KEY",
  "baseUrl": "https://api.openai.com/v1",
  "models": ["gpt-4", "gpt-4-turbo"]
}
```

#### 方式二: 使用 API 端点

```bash
curl -X POST http://localhost:3000/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Google Gemini",
    "type": "google",
    "apiKey": "${GOOGLE_API_KEY}",
    "baseUrl": "https://generativelanguage.googleapis.com",
    "models": ["gemini-2.5-pro", "gemini-2.5-flash"]
  }'
```

#### 方式三: 直接编辑数据库

SQLite 数据库中的配置也支持环境变量:

```sql
INSERT INTO channels (
  id, name, type, api_key, base_url, models, priority
) VALUES (
  'custom-channel',
  'Custom Provider',
  'openai',
  '${CUSTOM_API_KEY}',
  '${CUSTOM_BASE_URL}',
  '["custom-model"]',
  80
);
```

### 3. 混合使用环境变量和实际值

可以在字符串中混合使用环境变量和实际值:

```json
{
  "name": "Multi-Region",
  "apiKey": "${PRIMARY_API_KEY}",
  "baseUrl": "https://${REGION}.api.example.com/v1",
  "headers": {
    "Authorization": "Bearer ${AUTH_TOKEN}",
    "X-Custom-Header": "static-value"
  }
}
```

## 🔍 支持的配置字段

环境变量插值支持以下配置字段:

### Channel 配置
- ✅ `apiKey` - API密钥
- ✅ `baseUrl` - 基础URL
- ✅ `refreshToken` - 刷新令牌(OAuth)
- ✅ `transformers` - Transformer配置
- ✅ `config` - 自定义配置

### RoutingRule 配置
- ✅ `targetChannel` - 目标Channel
- ✅ `targetModel` - 目标模型
- ✅ `condition` - 路由条件

### TeeDestination 配置
- ✅ `url` - 目标URL
- ✅ `headers` - HTTP头部

## ⚙️ 高级特性

### 自动验证

Routex 会自动验证配置中引用的环境变量:

```typescript
// 启动时自动检查
[INFO] 从 .env 加载了 5 个环境变量
[WARN] Channel "anthropic" 配置引用了未定义的环境变量:
       missing: ["ANTHROPIC_API_KEY"]
       hint: 请在 .env 文件中设置这些环境变量
```

### 生成 .env.example

自动扫描配置并生成环境变量示例文件:

```bash
# 使用 API 端点
curl http://localhost:3000/api/config/env-example > .env.example
```

生成的 `.env.example`:

```bash
# Routex 环境变量配置
# 复制此文件为 .env 并填写实际值

# ANTHROPIC_API_KEY=ANTHROPIC_API_KEY_VALUE
ANTHROPIC_API_KEY=

# CUSTOM_BASE_URL=CUSTOM_BASE_URL_VALUE
CUSTOM_BASE_URL=

# OPENAI_API_KEY=OPENAI_API_KEY_VALUE
OPENAI_API_KEY=
```

### 环境变量优先级

1. **系统环境变量**(最高优先级)
2. **.env 文件**
3. **配置中的默认值**(最低优先级)

```bash
# 系统环境变量会覆盖 .env 文件
export ANTHROPIC_API_KEY=sk-ant-system-key

# 启动 Routex
bun start
# 将使用 sk-ant-system-key 而不是 .env 中的值
```

## 🔒 安全最佳实践

### 1. 不要提交 .env 文件到 Git

确保 `.gitignore` 包含:

```gitignore
# 环境变量
.env
.env.local
.env.*.local
```

### 2. 提交 .env.example 作为模板

```bash
git add .env.example
git commit -m "docs: add environment variables template"
```

### 3. 使用不同的环境文件

```bash
# 开发环境
.env.development

# 生产环境
.env.production

# 测试环境
.env.test
```

### 4. 敏感信息管理

对于生产环境,建议使用密钥管理服务:

- **Docker**: 使用 Docker Secrets
- **Kubernetes**: 使用 Kubernetes Secrets
- **Cloud**: 使用云平台的密钥管理(AWS Secrets Manager, GCP Secret Manager等)

## 📋 迁移指南

### 从硬编码到环境变量

**迁移前:**

```json
{
  "name": "Anthropic",
  "apiKey": "sk-ant-api03-actual-secret-key-here",
  "baseUrl": "https://api.anthropic.com"
}
```

**迁移步骤:**

1. 创建 `.env` 文件:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-api03-actual-secret-key-here
   ```

2. 更新配置:
   ```json
   {
     "name": "Anthropic",
     "apiKey": "${ANTHROPIC_API_KEY}",
     "baseUrl": "https://api.anthropic.com"
   }
   ```

3. 验证配置:
   ```bash
   bun start
   # 检查日志,确认环境变量正确加载
   ```

## 🐛 故障排除

### 问题: 环境变量未替换

**症状**: 配置中显示 `${VAR_NAME}` 而不是实际值

**解决方案:**
1. 检查 `.env` 文件是否存在
2. 确认变量名称拼写正确(区分大小写)
3. 重启 Routex 服务

### 问题: 警告"环境变量未定义"

**症状**: 日志显示 `missing: ["API_KEY"]`

**解决方案:**
1. 在 `.env` 文件中添加缺失的变量
2. 或者在系统环境变量中设置:
   ```bash
   export API_KEY=your-value
   ```

### 问题: $ 符号被错误替换

**症状**: 价格 `$100` 被替换为空

**解决方案**:
- 使用 `\$` 转义: `\$100`
- 或使用双引号: `"$100"`(仅当不是有效环境变量名时)

## 🎯 实际案例

### 案例 1: 多环境部署

```bash
# .env.development
ANTHROPIC_API_KEY=sk-ant-dev-key
LOG_LEVEL=debug
METRICS_ENABLED=true

# .env.production
ANTHROPIC_API_KEY=sk-ant-prod-key
LOG_LEVEL=info
METRICS_ENABLED=true
```

### 案例 2: 团队协作

```bash
# .env.example (提交到 Git)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=
CUSTOM_PROVIDER_URL=https://api.example.com

# .env (每个团队成员自己创建)
ANTHROPIC_API_KEY=sk-ant-alice-key
OPENAI_API_KEY=sk-alice-openai-key
GOOGLE_API_KEY=alice-google-key
```

### 案例 3: CI/CD 集成

```yaml
# GitHub Actions
- name: Setup Environment
  run: |
    echo "ANTHROPIC_API_KEY=${{ secrets.ANTHROPIC_API_KEY }}" >> .env
    echo "OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}" >> .env

- name: Start Routex
  run: bun start
```

## 📚 相关文档

- [API Reference](./API_REFERENCE.md)
- [Configuration Guide](./docs/configuration.md)
- [Security Best Practices](./docs/security.md)

## 🙏 致谢

此功能设计灵感来源于:
- **claude-code-router** by @musistudio - 环境变量插值实现
- **cce-master** by @zhaopengme - 配置管理最佳实践
