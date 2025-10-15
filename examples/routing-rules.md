# Example Routing Rules

## 1. Long Context Route (Token Threshold)

Route messages with >50k tokens to Opus model:

```bash
curl -X POST http://localhost:8080/api/routing/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Long Context Route",
    "type": "longContext",
    "condition": {
      "tokenThreshold": 50000
    },
    "targetChannel": "anthropic-opus",
    "targetModel": "claude-opus-4-20250514",
    "priority": 90,
    "enabled": true
  }'
```

## 2. Extended Thinking Route

Route extended thinking requests to Sonnet:

```bash
curl -X POST http://localhost:8080/api/routing/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Extended Thinking Route",
    "type": "think",
    "condition": {
      "keywords": ["thinking", "extended_thinking"]
    },
    "targetChannel": "anthropic-main",
    "targetModel": "claude-sonnet-4-20250514",
    "priority": 85,
    "enabled": true
  }'
```

## 3. Keyword-Based Route

Route specific topics to specialized channels:

```bash
curl -X POST http://localhost:8080/api/routing/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Code Analysis Route",
    "type": "custom",
    "condition": {
      "keywords": ["code review", "refactor", "debug", "analyze code"]
    },
    "targetChannel": "anthropic-sonnet",
    "targetModel": "claude-sonnet-4-20250514",
    "priority": 80,
    "enabled": true
  }'
```

## 4. Model Pattern Route

Route specific model requests:

```bash
curl -X POST http://localhost:8080/api/routing/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT Model Route",
    "type": "custom",
    "condition": {
      "modelPattern": "^gpt-.*"
    },
    "targetChannel": "openai-main",
    "priority": 95,
    "enabled": true
  }'
```

## 5. Tool Use Route

Route requests with tool calls to appropriate model:

```bash
curl -X POST http://localhost:8080/api/routing/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tool Use Route",
    "type": "custom",
    "condition": {
      "hasTools": true
    },
    "targetChannel": "anthropic-main",
    "targetModel": "claude-opus-4-20250514",
    "priority": 88,
    "enabled": true
  }'
```

## 6. Image Processing Route

Route image analysis requests:

```bash
curl -X POST http://localhost:8080/api/routing/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Image Processing Route",
    "type": "image",
    "condition": {
      "hasImages": true
    },
    "targetChannel": "anthropic-main",
    "targetModel": "claude-opus-4-20250514",
    "priority": 87,
    "enabled": true
  }'
```

## 7. User Pattern Route (Regex)

Route based on message content patterns:

```bash
curl -X POST http://localhost:8080/api/routing/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Math Problem Route",
    "type": "custom",
    "condition": {
      "userPattern": "\\b(solve|calculate|compute|equation)\\b"
    },
    "targetChannel": "anthropic-main",
    "targetModel": "claude-sonnet-4-20250514",
    "priority": 75,
    "enabled": true
  }'
```

## 8. Custom Function Route

Route based on custom JavaScript logic:

```bash
curl -X POST http://localhost:8080/api/routing/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Business Hours Route",
    "type": "custom",
    "condition": {
      "customFunction": "function(context) { const hour = new Date().getHours(); return hour >= 9 && hour < 17; }"
    },
    "targetChannel": "anthropic-main",
    "targetModel": "claude-opus-4-20250514",
    "priority": 70,
    "enabled": true
  }'
```

## 9. Combined Conditions Route

Route based on multiple conditions:

```bash
curl -X POST http://localhost:8080/api/routing/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Complex Analysis Route",
    "type": "custom",
    "condition": {
      "tokenThreshold": 30000,
      "keywords": ["analysis", "research"],
      "hasTools": true
    },
    "targetChannel": "anthropic-opus",
    "targetModel": "claude-opus-4-20250514",
    "priority": 92,
    "enabled": true
  }'
```

## 10. Background Task Route

Route background/async tasks:

```bash
curl -X POST http://localhost:8080/api/routing/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Background Task Route",
    "type": "background",
    "condition": {
      "keywords": ["background", "async", "batch"]
    },
    "targetChannel": "anthropic-haiku",
    "targetModel": "claude-haiku-4-20250514",
    "priority": 60,
    "enabled": true
  }'
```

## Managing Routing Rules

### List All Rules

```bash
curl http://localhost:8080/api/routing/rules
```

### Get Rule Details

```bash
curl http://localhost:8080/api/routing/rules/{rule-id}
```

### Update Rule

```bash
curl -X PUT http://localhost:8080/api/routing/rules/{rule-id} \
  -H "Content-Type: application/json" \
  -d '{
    "priority": 95,
    "enabled": true
  }'
```

### Enable/Disable Rule

```bash
# Disable
curl -X POST http://localhost:8080/api/routing/rules/{rule-id}/disable

# Enable
curl -X POST http://localhost:8080/api/routing/rules/{rule-id}/enable
```

### Delete Rule

```bash
curl -X DELETE http://localhost:8080/api/routing/rules/{rule-id}
```

### Test Routing

Test which channel/model a request would be routed to:

```bash
curl -X POST http://localhost:8080/api/routing/test \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "messages": [
      {
        "role": "user",
        "content": "I need help with a very long analysis task..."
      }
    ],
    "system": "You are a helpful assistant"
  }'
```

## Rule Priority

Rules are evaluated in priority order (highest first). The first matching rule is used.

- **90-100**: Critical routes (long context, specific models)
- **80-89**: High priority (tool use, images, thinking)
- **70-79**: Medium priority (keywords, patterns)
- **60-69**: Low priority (background tasks)
- **< 60**: Fallback routes

## Condition Types

- **tokenThreshold**: Number - Minimum token count to match
- **keywords**: String[] - Array of keywords to search for
- **userPattern**: String - Regex pattern to match against user message
- **modelPattern**: String - Regex pattern to match against requested model
- **hasTools**: Boolean - Match if request includes tool definitions
- **hasImages**: Boolean - Match if request includes image content
- **customFunction**: String - JavaScript function that returns boolean

## Notes

- Rules are evaluated in priority order (highest first)
- First matching rule wins
- If no rules match, falls back to LoadBalancer
- Conditions can be combined (all must match)
- Custom functions have access to full request context
