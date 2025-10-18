# Routex 

 Routex 

## 

- (#)
- [API ](#api-)
- (#)
- (#)
- (#)
- (#)
- (#)

---

## 

Routex 

|  |  |  |
|------|------|----------|
| **API ** |  | AES-256-GCM  |
| **** |  | HMAC-SHA256  |
| **** |  API  DDoS  |  |
| **** |  | `timingSafeEqual` |
| **** |  | API  |

---

## API 

### 

Routex  AES-256-GCM  API 

### 

```typescript
// 
plaintext → AES-256-GCM(key, IV) → iv:authTag:ciphertext

// 
- AES-256-GCM
- 256 bits
- IV 128 bits
- 128 bitsGCM 
```

### 

```bash
# 
MASTER_PASSWORD=your-super-strong-master-password-min-32-chars

# 
ENCRYPTION_SALT=64-hex-character-salt-value

# 
node -e console.log(require('crypto').randomBytes(32).toString('hex'))
```

### 

#### 1.  API 

```typescript
import { encryptApiKey } from './utils/encryption';

const plainKey = 'sk-ant-api-key-secret-12345';
const encrypted = encryptApiKey(plainKey);

console.log(encrypted);
// : a1b2c3d4e5f6...:1a2b3c4d5e6f...:9f8e7d6c5b4a...
```

#### 2.  API 

```typescript
import { decryptApiKey } from './utils/encryption';

const encrypted = 'a1b2c3d4...:1a2b3c4d...:9f8e7d6c...';
const plainKey = decryptApiKey(encrypted);

console.log(plainKey);
// : sk-ant-api-key-secret-12345
```

#### 3. 

```typescript
import { getApiKey } from './utils/encryption';

// 
const key1 = getApiKey('sk-ant-plain-key');  // 
const key2 = getApiKey('a1b2c3:1a2b3c:9f8e7d');  // 
```

#### 4. 

```typescript
import { maskApiKey } from './utils/encryption';

const apiKey = 'sk-ant-api-key-1234567890';
const masked = maskApiKey(apiKey, 4);

console.log(masked);
// : sk-a****************7890
```

### 

1. ****`MASTER_PASSWORD`  32 
2. **** 90 
3. ****dev/staging/prod
4. **** AWS KMSHashiCorp Vault
5. ****

---

## 

### 

 HMAC-SHA256 

### 

```typescript
// 
message = METHOD + '\n' + PATH + '\n' + TIMESTAMP + '\n' + BODY + '\n' + HEADERS

// HMAC 
signature = HMAC-SHA256(message, secret)

// 
valid = timingSafeEqual(providedSignature, expectedSignature)
```

### 

```typescript
import { signatureVerification, SignaturePresets } from './middleware/signature';

// 5 
app.use('/api/*', signatureVerification(
  SignaturePresets.standard(process.env.SIGNATURE_SECRET || 'your-secret')
));

// 1 
app.use('/api/sensitive/*', signatureVerification(
  SignaturePresets.strict(process.env.SIGNATURE_SECRET || 'your-secret')
));

// 
app.use('/api/custom/*', signatureVerification({
  secret: process.env.SIGNATURE_SECRET!,
  tolerance: 60000,  // 1 
  headersToSign: ['x-api-key', 'content-type', 'user-agent'],
  skipPaths: ['/api/public', '/health'],
}));
```

### 

#### 

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

// 
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

#### Python 

```python
import hmac
import hashlib
import time
import requests

def compute_signature(method, path, body, timestamp, secret, headers=None):
    parts = [
        method.upper,
        path,
        str(timestamp),
        body or '',
    ]

    if headers:
        for key, value in sorted(headers.items):
            parts.append(f{key}:{value})

    message = '\n'.join(parts)
    signature = hmac.new(
        secret.encode,
        message.encode,
        hashlib.sha256
    ).hexdigest

    return signature

# 
secret = 'your-shared-secret'
method = 'POST'
path = '/api/channels'
body = '{name:Test Channel,key:sk-test-123}'
timestamp = int(time.time * 1000)

headers_to_sign = {
    'x-api-key': 'your-api-key',
    'content-type': 'application/json',
}

signature = compute_signature(method, path, body, timestamp, secret, headers_to_sign)

# 
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

### 

1. **** 32 
2. **HTTPS ** HTTPS 
3. **** NTP
4. **** 90 
5. **** User-Agent

---

## 

### 

 API  DDoS 

### 

```typescript
import { rateLimit, RateLimitPresets } from './middleware/rate-limit';

//  - 10
app.use('/api/admin/*', rateLimit({
  ...RateLimitPresets.strict,
  message: 'Too many admin requests. Maximum 10 per minute.',
}));

//  -  API100
app.use('/api/*', rateLimit({
  ...RateLimitPresets.standard,
  message: 'Too many requests. Maximum 100 per minute.',
}));

//  - 1000
app.use('/public/*', rateLimit({
  ...RateLimitPresets.lenient,
  message: 'Too many requests. Maximum 1000 per minute.',
}));

// 1000
app.use('/api/heavy/*', rateLimit({
  ...RateLimitPresets.hourly,
}));

// 5 /15 
app.use('/auth/login', rateLimit({
  ...RateLimitPresets.auth,
  message: 'Too many login attempts. Try again later.',
}));
```

### 

```typescript
import { rateLimit } from './middleware/rate-limit';

app.use('/api/custom', rateLimit({
  windowMs: 60000,  // 1 
  max: 50,  // 

  //  IP
  keyGenerator: (c) => {
    //  API key
    const apiKey = c.req.header('x-api-key');
    if (apiKey) return `api:${apiKey}`;

    //  IP
    return c.req.header('x-forwarded-for') || 'unknown';
  },

  // 
  skip: (c) => {
    // 
    return c.req.path === '/health';
  },

  // 
  message: 'Rate limit exceeded. Please slow down.',

  // 
  standardHeaders: true,  // X-RateLimit-*
}));
```

###  API 

```typescript
import { apiKeyRateLimit } from './middleware/rate-limit';

//  API key 
const limits = new Map([
  ['premium-key-123', { max: 1000, windowMs: 60000 }],  // 1000/
  ['standard-key-456', { max: 100, windowMs: 60000 }],  // 100/
  ['free-key-789', { max: 10, windowMs: 60000 }],       // 10/
]);

app.use('/api/*', apiKeyRateLimit({
  limits,
  defaultMax: 50,  //  key 
  defaultWindowMs: 60000,
}));
```

### 

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-10-18T02:30:00.000Z
Retry-After: 60
```

### 

```typescript
async function makeRequest(url: string) {
  const response = await fetch(url);

  // 
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);

    // 
    await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter!) * 1000));
    return makeRequest(url);
  }

  // 
  const remaining = response.headers.get('X-RateLimit-Remaining');
  console.log(`Remaining requests: ${remaining}`);

  return response;
}
```

### 

1. ****
2. **** API key IP
3. ****
4. ****
5. **** Redis 

---

## 

### 

```bash
# .env.production

# ===  ===
MASTER_PASSWORD=super-strong-master-password-min-32-chars-with-special-chars-123!@#
ENCRYPTION_SALT=a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890

# ===  ===
SIGNATURE_SECRET=another-strong-secret-for-hmac-signature-verification-min-32-bytes

# ===  ===
DATABASE_PATH=/secure/path/to/routex.db
DATABASE_ENCRYPTION=true

# ===  ===
LOG_LEVEL=info
LOG_SENSITIVE_DATA=false  # 

# === CORS  ===
CORS_ORIGINS=https://app.example.com,https://dashboard.example.com

# ===  ===
NODE_ENV=production
HTTPS_ONLY=true
HELMET_ENABLED=true
```

### Helmet 

```typescript
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';

const app = new Hono;

// 
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ['self'],
    scriptSrc: ['self', 'unsafe-inline'],
    styleSrc: ['self', 'unsafe-inline'],
    imgSrc: ['self', 'data:', 'https:'],
  },
  strictTransportSecurity: {
    maxAge: 31536000,  // 1 
    includeSubDomains: true,
    preload: true,
  },
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
}));
```

### CORS 

```typescript
import { cors } from 'hono/cors';

app.use('/api/*', cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Signature', 'X-Timestamp'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,  // 24 
  credentials: true,
}));
```

---

## 

### 1. Defense in Depth

```typescript
// ✅ 
app.use('/api/admin/*',
  rateLimit({ ...RateLimitPresets.strict }),  // 
  signatureVerification({ secret: process.env.SIGNATURE_SECRET! }),  // 
  apiKeyAuth,  // API key 
  adminAuth,   // 
  auditLog,    // 
);

// ❌ 
app.use('/api/admin/*', apiKeyAuth);
```

### 2. 

```typescript
// API key 
interface ApiKeyPermissions {
  key: string;
  permissions: string;  // ['read:channels', 'write:channels', 'admin:*']
  rateLimit: { max: number; windowMs: number };
  allowedIPs?: string;  //  IP 
}

// 
function checkPermission(apiKey: string, requiredPermission: string): boolean {
  const keyConfig = getApiKeyConfig(apiKey);
  return keyConfig.permissions.some(p =>
    p === requiredPermission ||
    p === '*' ||
    p.endsWith(':*') && requiredPermission.startsWith(p.split(':')[0])
  );
}
```

### 3. 

```typescript
import { logger } from './utils/logger';
import { maskApiKey } from './utils/encryption';

// ✅ 
logger.info({
  apiKey: maskApiKey(apiKey, 4),
  action: 'create_channel',
  channel: channelId,
});

// ❌ 
logger.info({
  apiKey: apiKey,  // 
  action: 'create_channel',
});
```

### 4. 

```typescript
// ✅ 
app.onError((err, c) => {
  logger.error({ error: err.message, stack: err.stack });

  return c.json({
    success: false,
    error: {
      type: 'internal_error',
      message: 'An error occurred. Please try again later.',
      // 
    },
  }, 500);
});

// ❌ 
app.onError((err, c) => {
  return c.json({
    success: false,
    error: {
      message: err.message,  // 
      stack: err.stack,      // 
    },
  }, 500);
});
```

### 5. 

```typescript
import { z } from 'zod';

//  schema
const createChannelSchema = z.object({
  name: z.string.min(1).max(100),
  key: z.string.regex(/^sk-ant-/),  // 
  baseURL: z.string.url,
  models: z.array(z.string).optional,
});

// 
app.post('/api/channels', async (c) => {
  const body = await c.req.json;

  // 
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

  // 
  const channel = result.data;
  // ...
});
```

### 6. 

```typescript
// ✅ 
const channel = {
  id: generateId,
  name: input.name,
  key: encryptApiKey(input.key),  // 
  baseURL: input.baseURL,
  enabled: true,
  createdAt: Date.now,
};

db.insertChannel(channel);

// ❌ 
const channel = {
  id: generateId,
  name: input.name,
  key: input.key,  // 
  // ...
};
```

### 7. 

```bash
# 
bun audit

# 
bun update

# 
bun run lint

# 
bun test tests/security.test.ts
```

---

## 

### 

-   `MASTER_PASSWORD` 32 
-   `ENCRYPTION_SALT`
-   `SIGNATURE_SECRET`
-   HTTPS
-  
-  Helmet
-   CORS 
-  `LOG_SENSITIVE_DATA=false`
-  
-  
-  
-  
-  

### 

-  
-  
-  
-   API 
-   401/429 
-  
-  
-  

### 

-   90  `MASTER_PASSWORD`
-   90  `SIGNATURE_SECRET`
-  
-  
-  
-  

---

## 

 `docs/PERFORMANCE_BENCHMARK.md`

|  |  |  |
|------|---------|------|
| **/** | ~0.013ms/1000  13ms |  |
| **** | ~0.0023ms/10k  23ms |  |
| **** | < 0.001ms/ |  |
| **** | ~0.0006ms/10k  6ms |  |

****

---

## 

### 

1. 
2. 
3.  API key
4. 
5. 

### 

1. 
2. 
3.  IP/API key
4. 
5.  WAF

### 

1. 
2. 
3. 
4. 
5. 

---

## 

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

****1.0.0
****2025-10-18
**Routex **1.1.0-beta
