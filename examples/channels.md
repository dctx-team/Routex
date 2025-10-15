# Example Channel Configurations

## Anthropic Channel (API Key)

```bash
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "anthropic-main",
    "type": "anthropic",
    "apiKey": "sk-ant-api03-your-api-key-here",
    "models": [
      "claude-opus-4-20250514",
      "claude-sonnet-4-20250514",
      "claude-haiku-4-20250514"
    ],
    "priority": 100,
    "weight": 1,
    "enabled": true
  }'
```

## OpenAI Channel

```bash
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "openai-main",
    "type": "openai",
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-your-openai-api-key-here",
    "models": [
      "gpt-4-turbo",
      "gpt-4",
      "gpt-3.5-turbo"
    ],
    "priority": 80,
    "weight": 1,
    "enabled": true,
    "transformers": {
      "use": ["openai"]
    }
  }'
```

## Azure OpenAI Channel

```bash
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "azure-main",
    "type": "azure",
    "baseUrl": "https://your-resource.openai.azure.com",
    "apiKey": "your-azure-api-key",
    "models": [
      "gpt-4",
      "gpt-35-turbo"
    ],
    "priority": 70,
    "weight": 1,
    "enabled": true,
    "transformers": {
      "use": ["openai"]
    }
  }'
```

## Custom API Channel

```bash
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "custom-api",
    "type": "custom",
    "baseUrl": "https://your-custom-api.com/v1",
    "apiKey": "your-custom-api-key",
    "models": [
      "your-model-name"
    ],
    "priority": 50,
    "weight": 1,
    "enabled": true
  }'
```

## Backup Channel (Lower Priority)

```bash
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "anthropic-backup",
    "type": "anthropic",
    "apiKey": "sk-ant-api03-your-backup-key-here",
    "models": [
      "claude-sonnet-4-20250514",
      "claude-haiku-4-20250514"
    ],
    "priority": 40,
    "weight": 1,
    "enabled": true
  }'
```

## Channel with Transformers

For channels that use different API formats, you can configure transformers:

```bash
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "openai-compatible",
    "type": "openai",
    "baseUrl": "https://api.compatible-service.com/v1",
    "apiKey": "your-api-key",
    "models": ["model-name"],
    "priority": 60,
    "weight": 1,
    "enabled": true,
    "transformers": {
      "use": ["openai"]
    }
  }'
```

## Update Channel Configuration

```bash
curl -X PUT http://localhost:8080/api/channels/{channel-id} \
  -H "Content-Type: application/json" \
  -d '{
    "priority": 90,
    "models": [
      "claude-opus-4-20250514",
      "claude-sonnet-4-20250514"
    ]
  }'
```

## Enable/Disable Channel

```bash
# Disable
curl -X POST http://localhost:8080/api/channels/{channel-id}/disable

# Enable
curl -X POST http://localhost:8080/api/channels/{channel-id}/enable
```

## List All Channels

```bash
curl http://localhost:8080/api/channels
```

## Get Channel Details

```bash
curl http://localhost:8080/api/channels/{channel-id}
```

## Delete Channel

```bash
curl -X DELETE http://localhost:8080/api/channels/{channel-id}
```

## Notes

- **Priority**: Higher priority channels are selected first (100 = highest)
- **Weight**: Used for weighted round-robin load balancing
- **Transformers**: Configure API format conversion (e.g., OpenAI format → Anthropic format)
- **Status**: Automatically managed based on circuit breaker state
