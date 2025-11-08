# 

## 🎯 

Routex v1.1.0+ , **claude-code-router**  **cce-master** 

## ✨ 

- 🔐 ****: API,Git
- 📦 ****: 
- 🔄 ****:  `$VAR_NAME`  `${VAR_NAME}` 
- ✅ ****: 
- 📝 ****:  `.env.example` 

## 📖 

### 1.  .env 

 Routex  `.env` :

```bash
# Routex 

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

### 2. 

#### :  Dashboard UI

 Dashboard  Channel ,:

** `${VAR_NAME}` :**

```json
{
  name: Anthropic Official,
  type: anthropic,
  apiKey: ${ANTHROPIC_API_KEY},
  baseUrl: https://api.anthropic.com,
  models: [claude-opus-4, claude-sonnet-4]
}
```

** `$VAR_NAME` :**

```json
{
  name: OpenAI,
  type: openai,
  apiKey: $OPENAI_API_KEY,
  baseUrl: https://api.openai.com/v1,
  models: [gpt-4, gpt-4-turbo]
}
```

#### :  API 

```bash
curl -X POST http://localhost:3000/api/channels \
  -H Content-Type: application/json \
  -d '{
    name: Google Gemini,
    type: google,
    apiKey: ${GOOGLE_API_KEY},
    baseUrl: https://generativelanguage.googleapis.com,
    models: [gemini-2.5-pro, gemini-2.5-flash]
  }'
```

#### : 

SQLite :

```sql
INSERT INTO channels (
  id, name, type, api_key, base_url, models, priority
) VALUES (
  'custom-channel',
  'Custom Provider',
  'openai',
  '${CUSTOM_API_KEY}',
  '${CUSTOM_BASE_URL}',
  '[custom-model]',
  80
);
```

### 3. 

:

```json
{
  name: Multi-Region,
  apiKey: ${PRIMARY_API_KEY},
  baseUrl: https://${REGION}.api.example.com/v1,
  headers: {
    Authorization: Bearer ${AUTH_TOKEN},
    X-Custom-Header: static-value
  }
}
```

## 🔍 

:

### Channel 
- ✅ `apiKey` - API
- ✅ `baseUrl` - URL
- ✅ `refreshToken` - (OAuth)
- ✅ `transformers` - Transformer
- ✅ `config`
### RoutingRule 
- ✅ `targetChannel` - Channel
- ✅ `targetModel`
- ✅ `condition`
### TeeDestination 
- ✅ `url` - URL
- ✅ `headers` - HTTP

## ⚙️ 

### 

Routex :

```typescript
// 
[INFO]  .env  5 
[WARN] Channel anthropic :
       missing: [ANTHROPIC_API_KEY]
       hint:  .env 
```

###  .env.example

:

```bash
#  API 
curl http://localhost:3000/api/config/env-example > .env.example
```

 `.env.example`:

```bash
# Routex 
#  .env 

# ANTHROPIC_API_KEY=ANTHROPIC_API_KEY_VALUE
ANTHROPIC_API_KEY=

# CUSTOM_BASE_URL=CUSTOM_BASE_URL_VALUE
CUSTOM_BASE_URL=

# OPENAI_API_KEY=OPENAI_API_KEY_VALUE
OPENAI_API_KEY=
```

### 

1. ****
2. **.env **
3. ****

```bash
#  .env 
export ANTHROPIC_API_KEY=sk-ant-system-key

#  Routex
bun start
#  sk-ant-system-key  .env 
```

## 🔒 

### 1.  .env  Git

 `.gitignore` :

```gitignore
# 
.env
.env.local
.env.*.local
```

### 2.  .env.example 

```bash
git add .env.example
git commit -m docs: add environment variables template
```

### 3. 

```bash
# 
.env.development

# 
.env.production

# 
.env.test
```

### 4. 

,:

- **Docker**:  Docker Secrets
- **Kubernetes**:  Kubernetes Secrets
- **Cloud**: (AWS Secrets Manager, GCP Secret Manager)

## 📋 

### 

**:**

```json
{
  name: Anthropic,
  apiKey: sk-ant-api03-actual-secret-key-here,
  baseUrl: https://api.anthropic.com
}
```

**:**

1.  `.env` :
   ```bash
   ANTHROPIC_API_KEY=sk-ant-api03-actual-secret-key-here
   ```

2. :
   ```json
   {
     name: Anthropic,
     apiKey: ${ANTHROPIC_API_KEY},
     baseUrl: https://api.anthropic.com
   }
   ```

3. :
   ```bash
   bun start
   # ,
   ```

## 🐛 

### : 

****:  `${VAR_NAME}` 

**:**
1.  `.env` 
2. 
3.  Routex 

### : 

****:  `missing: [API_KEY]`

**:**
1.  `.env` 
2. :
   ```bash
   export API_KEY=your-value
   ```

### : $ 

****:  `$100` 

****:
-  `\$` : `\$100`
- : `$100`

## 🎯 

###  1: 

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

###  2: 

```bash
# .env.example ( Git)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=
CUSTOM_PROVIDER_URL=https://api.example.com

# .env 
ANTHROPIC_API_KEY=sk-ant-alice-key
OPENAI_API_KEY=sk-alice-openai-key
GOOGLE_API_KEY=alice-google-key
```

###  3: CI/CD 

```yaml
# GitHub Actions
- name: Setup Environment
  run: |
    echo ANTHROPIC_API_KEY=${{ secrets.ANTHROPIC_API_KEY }} >> .env
    echo OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }} >> .env

- name: Start Routex
  run: bun start
```

## 📚 

- [API Reference](./API_REFERENCE.md)
- [Configuration Guide](./docs/configuration.md)
- [Security Best Practices](./docs/security.md)

## 🙏 

:
- **claude-code-router** by @musistudio
- **cce-master** by @zhaopengme