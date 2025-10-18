# Routex 安全指南

本文档详细介绍 Routex 的安全功能、配置和最佳实践。

## 目录

- [安全功能概览](#安全功能概览)
- [API 密钥加密](#api-密钥加密)
- [请求签名验证](#请求签名验证)
- [速率限制](#速率限制)
- [安全配置](#安全配置)
- [最佳实践](#最佳实践)
- [安全检查清单](#安全检查清单)

---

## 安全功能概览

Routex 提供多层安全防护：

| 功能 | 用途 | 实现方式 |
|------|------|----------|
| **API 密钥加密** | 保护存储的敏感信息 | AES-256-GCM 加密 |
| **请求签名验证** | 确保请求完整性和真实性 | HMAC-SHA256 签名 |
| **速率限制** | 防止 API 滥用和 DDoS 攻击 | 基于时间窗口的令牌桶算法 |
| **时间安全比较** | 防止时序攻击 | `timingSafeEqual` |
| **日志掩码** | 防止敏感信息泄露 | API 密钥部分掩码 |

---

## API 密钥加密

### 功能说明

Routex 使用 AES-256-GCM 加密算法保护存储在数据库中的 API 密钥，防止明文泄露。

### 加密原理

```typescript
// 加密流程
plaintext → AES-256-GCM(key, IV) → iv:authTag:ciphertext

// 特性
- 算法：AES-256-GCM（认证加密）
- 密钥长度：256 bits
- IV 长度：128 bits（每次加密随机生成）
- 认证标签：128 bits（GCM 模式提供）
```

### 环境变量配置

在生产环境中设置以下环境变量：

```bash
# 主密码（用于派生加密密钥）
MASTER_PASSWORD=your-super-strong-master-password-min-32-chars

# 加密盐值（可选，建议设置）
ENCRYPTION_SALT=64-hex-character-salt-value

# 生成盐值的方式
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 使用方式

#### 1. 加密 API 密钥

```typescript
import { encryptApiKey } from './utils/encryption';

const plainKey = 'sk-ant-api-key-secret-12345';
const encrypted = encryptApiKey(plainKey);

console.log(encrypted);
// 输出: a1b2c3d4e5f6...:1a2b3c4d5e6f...:9f8e7d6c5b4a...
```

#### 2. 解密 API 密钥

```typescript
import { decryptApiKey } from './utils/encryption';

const encrypted = 'a1b2c3d4...:1a2b3c4d...:9f8e7d6c...';
const plainKey = decryptApiKey(encrypted);

console.log(plainKey);
// 输出: sk-ant-api-key-secret-12345
```

#### 3. 自动检测和解密

```typescript
import { getApiKey } from './utils/encryption';

// 自动检测是否加密，如果加密则解密
const key1 = getApiKey('sk-ant-plain-key');  // 返回原始值
const key2 = getApiKey('a1b2c3:1a2b3c:9f8e7d');  // 自动解密
```

#### 4. 掩码显示（用于日志）

```typescript
import { maskApiKey } from './utils/encryption';

const apiKey = 'sk-ant-api-key-1234567890';
const masked = maskApiKey(apiKey, 4);

console.log(masked);
// 输出: sk-a****************7890
```

### 安全建议

1. **强密码**：`MASTER_PASSWORD` 应至少 32 个字符，包含大小写字母、数字和特殊字符
2. **定期轮换**：建议每 90 天轮换主密码
3. **环境隔离**：不同环境（dev/staging/prod）使用不同的主密码
4. **密钥管理**：生产环境应使用密钥管理服务（如 AWS KMS、HashiCorp Vault）
5. **不要硬编码**：永远不要在代码中硬编码密钥或盐值

---

## 请求签名验证

### 功能说明

使用 HMAC-SHA256 签名验证确保请求未被篡改，并验证请求来自可信客户端。

### 签名原理

```typescript
// 签名字符串构建
message = METHOD + '\n' + PATH + '\n' + TIMESTAMP + '\n' + BODY + '\n' + HEADERS

// HMAC 签名
signature = HMAC-SHA256(message, secret)

// 验证
valid = timingSafeEqual(providedSignature, expectedSignature)
```

### 配置中间件

```typescript
import { signatureVerification, SignaturePresets } from './middleware/signature';

// 标准配置（5 分钟容差）
app.use('/api/*', signatureVerification(
  SignaturePresets.standard(process.env.SIGNATURE_SECRET || 'your-secret')
));

// 严格配置（1 分钟容差）
app.use('/api/sensitive/*', signatureVerification(
  SignaturePresets.strict(process.env.SIGNATURE_SECRET || 'your-secret')
));

// 自定义配置
app.use('/api/custom/*', signatureVerification({
  secret: process.env.SIGNATURE_SECRET!,
  tolerance: 60000,  // 1 分钟
  headersToSign: ['x-api-key', 'content-type', 'user-agent'],
  skipPaths: ['/api/public', '/health'],
}));
```

### 客户端实现

#### 生成签名

```typescript
import { generateRequestSignature } from './middleware/signature';

const secret = 'your-shared-secret';
const method = 'POST';
const path = '/api/channels';
const body = { name: 'Test Channel', key: 'sk-test-123' };

const { signature, timestamp } = generateRequestSignature(
  method,
  path,
  body,
  secret,
  {
    headers: {
      'x-api-key': 'your-api-key',
      'content-type': 'application/json',
    },
  }
);

// 发送请求
fetch('https://api.example.com/api/channels', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Signature': signature,
    'X-Timestamp': timestamp,
    'X-API-Key': 'your-api-key',
  },
  body: JSON.stringify(body),
});
```

#### Python 客户端示例

```python
import hmac
import hashlib
import time
import requests

def compute_signature(method, path, body, timestamp, secret, headers=None):
    parts = [
        method.upper(),
        path,
        str(timestamp),
        body or '',
    ]

    if headers:
        for key, value in sorted(headers.items()):
            parts.append(f"{key}:{value}")

    message = '\n'.join(parts)
    signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    return signature

# 使用示例
secret = 'your-shared-secret'
method = 'POST'
path = '/api/channels'
body = '{"name":"Test Channel","key":"sk-test-123"}'
timestamp = int(time.time() * 1000)

headers_to_sign = {
    'x-api-key': 'your-api-key',
    'content-type': 'application/json',
}

signature = compute_signature(method, path, body, timestamp, secret, headers_to_sign)

# 发送请求
response = requests.post(
    'https://api.example.com/api/channels',
    headers={
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': str(timestamp),
        'X-API-Key': 'your-api-key',
    },
    data=body
)
```

### 安全建议

1. **强密钥**：签名密钥应至少 32 字节，使用加密随机生成
2. **HTTPS 必须**：签名验证不加密数据，必须配合 HTTPS 使用
3. **时间同步**：确保客户端和服务器时间同步（使用 NTP）
4. **密钥轮换**：定期轮换签名密钥（建议每 90 天）
5. **头部限制**：只签名必要的头部，避免签名可变头部（如 User-Agent）

---

## 速率限制

### 功能说明

基于时间窗口的速率限制，防止 API 滥用和 DDoS 攻击。

### 预设配置

```typescript
import { rateLimit, RateLimitPresets } from './middleware/rate-limit';

// 严格限制 - 用于敏感操作（10 次/分钟）
app.use('/api/admin/*', rateLimit({
  ...RateLimitPresets.strict,
  message: 'Too many admin requests. Maximum 10 per minute.',
}));

// 标准限制 - 用于一般 API（100 次/分钟）
app.use('/api/*', rateLimit({
  ...RateLimitPresets.standard,
  message: 'Too many requests. Maximum 100 per minute.',
}));

// 宽松限制 - 用于公共端点（1000 次/分钟）
app.use('/public/*', rateLimit({
  ...RateLimitPresets.lenient,
  message: 'Too many requests. Maximum 1000 per minute.',
}));

// 按小时限制（1000 次/小时）
app.use('/api/heavy/*', rateLimit({
  ...RateLimitPresets.hourly,
}));

// 登录限制（5 次/15 分钟）
app.use('/auth/login', rateLimit({
  ...RateLimitPresets.auth,
  message: 'Too many login attempts. Try again later.',
}));
```

### 自定义配置

```typescript
import { rateLimit } from './middleware/rate-limit';

app.use('/api/custom', rateLimit({
  windowMs: 60000,  // 时间窗口（1 分钟）
  max: 50,  // 窗口内最大请求数

  // 自定义标识符提取（默认使用 IP）
  keyGenerator: (c) => {
    // 优先使用 API key
    const apiKey = c.req.header('x-api-key');
    if (apiKey) return `api:${apiKey}`;

    // 否则使用 IP
    return c.req.header('x-forwarded-for') || 'unknown';
  },

  // 跳过某些请求
  skip: (c) => {
    // 跳过健康检查
    return c.req.path === '/health';
  },

  // 自定义错误消息
  message: 'Rate limit exceeded. Please slow down.',

  // 启用标准响应头
  standardHeaders: true,  // X-RateLimit-*
}));
```

### 基于 API 密钥的限制

```typescript
import { apiKeyRateLimit } from './middleware/rate-limit';

// 为不同 API key 设置不同限制
const limits = new Map([
  ['premium-key-123', { max: 1000, windowMs: 60000 }],  // 1000/分钟
  ['standard-key-456', { max: 100, windowMs: 60000 }],  // 100/分钟
  ['free-key-789', { max: 10, windowMs: 60000 }],       // 10/分钟
]);

app.use('/api/*', apiKeyRateLimit({
  limits,
  defaultMax: 50,  // 未知 key 的默认限制
  defaultWindowMs: 60000,
}));
```

### 响应头

速率限制中间件会在响应中添加以下头部：

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-10-18T02:30:00.000Z
Retry-After: 60
```

### 客户端处理

```typescript
async function makeRequest(url: string) {
  const response = await fetch(url);

  // 检查速率限制
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);

    // 等待后重试
    await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter!) * 1000));
    return makeRequest(url);
  }

  // 检查剩余配额
  const remaining = response.headers.get('X-RateLimit-Remaining');
  console.log(`Remaining requests: ${remaining}`);

  return response;
}
```

### 安全建议

1. **分层限制**：对不同端点使用不同的速率限制
2. **标识符选择**：优先使用 API key，其次使用 IP
3. **动态调整**：根据实际负载动态调整限制
4. **监控告警**：监控触发速率限制的频率
5. **分布式存储**：生产环境使用 Redis 等分布式存储

---

## 安全配置

### 生产环境配置示例

```bash
# .env.production

# === 加密配置 ===
MASTER_PASSWORD=super-strong-master-password-min-32-chars-with-special-chars-123!@#
ENCRYPTION_SALT=a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890

# === 签名验证配置 ===
SIGNATURE_SECRET=another-strong-secret-for-hmac-signature-verification-min-32-bytes

# === 数据库配置 ===
DATABASE_PATH=/secure/path/to/routex.db
DATABASE_ENCRYPTION=true

# === 日志配置 ===
LOG_LEVEL=info
LOG_SENSITIVE_DATA=false  # 生产环境禁用

# === CORS 配置 ===
CORS_ORIGINS=https://app.example.com,https://dashboard.example.com

# === 其他安全配置 ===
NODE_ENV=production
HTTPS_ONLY=true
HELMET_ENABLED=true
```

### Helmet 安全头配置

```typescript
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';

const app = new Hono();

// 安全响应头
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
  },
  strictTransportSecurity: {
    maxAge: 31536000,  // 1 年
    includeSubDomains: true,
    preload: true,
  },
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
}));
```

### CORS 配置

```typescript
import { cors } from 'hono/cors';

app.use('/api/*', cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Signature', 'X-Timestamp'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,  // 24 小时
  credentials: true,
}));
```

---

## 最佳实践

### 1. 深度防御（Defense in Depth）

使用多层安全措施，而非依赖单一防护：

```typescript
// ✅ 良好：多层防护
app.use('/api/admin/*',
  rateLimit({ ...RateLimitPresets.strict }),  // 速率限制
  signatureVerification({ secret: process.env.SIGNATURE_SECRET! }),  // 签名验证
  apiKeyAuth,  // API key 认证
  adminAuth,   // 管理员权限验证
  auditLog,    // 审计日志
);

// ❌ 不佳：单一防护
app.use('/api/admin/*', apiKeyAuth);
```

### 2. 最小权限原则

```typescript
// API key 权限配置
interface ApiKeyPermissions {
  key: string;
  permissions: string[];  // ['read:channels', 'write:channels', 'admin:*']
  rateLimit: { max: number; windowMs: number };
  allowedIPs?: string[];  // 可选的 IP 白名单
}

// 验证权限
function checkPermission(apiKey: string, requiredPermission: string): boolean {
  const keyConfig = getApiKeyConfig(apiKey);
  return keyConfig.permissions.some(p =>
    p === requiredPermission ||
    p === '*' ||
    p.endsWith(':*') && requiredPermission.startsWith(p.split(':')[0])
  );
}
```

### 3. 安全日志

```typescript
import { logger } from './utils/logger';
import { maskApiKey } from './utils/encryption';

// ✅ 良好：掩码敏感信息
logger.info({
  apiKey: maskApiKey(apiKey, 4),
  action: 'create_channel',
  channel: channelId,
});

// ❌ 危险：记录完整密钥
logger.info({
  apiKey: apiKey,  // 不要这样做！
  action: 'create_channel',
});
```

### 4. 错误处理

```typescript
// ✅ 良好：通用错误消息
app.onError((err, c) => {
  logger.error({ error: err.message, stack: err.stack });

  return c.json({
    success: false,
    error: {
      type: 'internal_error',
      message: 'An error occurred. Please try again later.',
      // 不暴露详细错误信息
    },
  }, 500);
});

// ❌ 危险：暴露详细错误
app.onError((err, c) => {
  return c.json({
    success: false,
    error: {
      message: err.message,  // 可能包含敏感信息
      stack: err.stack,      // 暴露内部实现
    },
  }, 500);
});
```

### 5. 输入验证

```typescript
import { z } from 'zod';

// 定义验证 schema
const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  key: z.string().regex(/^sk-ant-/),  // 验证格式
  baseURL: z.string().url(),
  models: z.array(z.string()).optional(),
});

// 使用验证
app.post('/api/channels', async (c) => {
  const body = await c.req.json();

  // 验证输入
  const result = createChannelSchema.safeParse(body);
  if (!result.success) {
    return c.json({
      success: false,
      error: {
        type: 'validation_error',
        message: 'Invalid input',
        details: result.error.errors,
      },
    }, 400);
  }

  // 使用验证后的数据
  const channel = result.data;
  // ...
});
```

### 6. 数据库安全

```typescript
// ✅ 良好：加密敏感字段
const channel = {
  id: generateId(),
  name: input.name,
  key: encryptApiKey(input.key),  // 加密存储
  baseURL: input.baseURL,
  enabled: true,
  createdAt: Date.now(),
};

db.insertChannel(channel);

// ❌ 危险：明文存储
const channel = {
  id: generateId(),
  name: input.name,
  key: input.key,  // 明文存储！
  // ...
};
```

### 7. 定期安全审计

```bash
# 依赖漏洞扫描
bun audit

# 更新依赖
bun update

# 静态代码分析
bun run lint

# 安全测试
bun test tests/security.test.ts
```

---

## 安全检查清单

### 部署前检查

- [ ] 已设置强 `MASTER_PASSWORD`（至少 32 字符）
- [ ] 已设置随机 `ENCRYPTION_SALT`
- [ ] 已设置强 `SIGNATURE_SECRET`
- [ ] 已启用 HTTPS（生产环境必须）
- [ ] 已配置适当的速率限制
- [ ] 已启用安全响应头（Helmet）
- [ ] 已配置 CORS 白名单
- [ ] 已禁用敏感日志（`LOG_SENSITIVE_DATA=false`）
- [ ] 已加密数据库敏感字段
- [ ] 已配置错误处理（不暴露详细错误）
- [ ] 已实现输入验证
- [ ] 已进行依赖漏洞扫描
- [ ] 已进行安全测试（所有测试通过）

### 运行时监控

- [ ] 监控速率限制触发频率
- [ ] 监控签名验证失败次数
- [ ] 监控异常登录尝试
- [ ] 监控 API 异常调用模式
- [ ] 设置安全告警（如：频繁 401/429 错误）
- [ ] 定期审查访问日志
- [ ] 定期检查数据库加密状态
- [ ] 定期轮换密钥和密码

### 定期维护

- [ ] 每 90 天轮换 `MASTER_PASSWORD`
- [ ] 每 90 天轮换 `SIGNATURE_SECRET`
- [ ] 每月更新依赖
- [ ] 每月进行安全扫描
- [ ] 每季度进行渗透测试
- [ ] 每半年进行全面安全审计

---

## 性能影响

根据性能基准测试（详见 `docs/PERFORMANCE_BENCHMARK.md`），安全功能的性能开销：

| 功能 | 性能开销 | 影响 |
|------|---------|------|
| **加密/解密** | ~0.013ms/次（1000 次约 13ms） | 极低 |
| **签名计算** | ~0.0023ms/次（10k 次约 23ms） | 极低 |
| **签名验证** | < 0.001ms/次（时间安全比较） | 极低 |
| **速率限制** | ~0.0006ms/次（10k 次约 6ms） | 极低 |

**结论**：所有安全功能的性能开销都在微秒级别，对整体性能影响可忽略不计。

---

## 安全事件响应

### 怀疑密钥泄露

1. 立即轮换受影响的密钥
2. 审查访问日志，识别异常访问
3. 撤销可疑 API key
4. 通知受影响的用户
5. 加强监控

### 发现异常流量

1. 检查速率限制配置
2. 分析流量来源和模式
3. 临时封禁可疑 IP/API key
4. 调整速率限制阈值
5. 考虑启用 WAF

### 数据库泄露

1. 评估泄露范围
2. 验证加密是否有效
3. 通知受影响用户
4. 强制轮换所有密钥
5. 审查和加强访问控制

---

## 参考资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**文档版本**：1.0.0
**最后更新**：2025-10-18
**Routex 版本**：1.1.0-beta
