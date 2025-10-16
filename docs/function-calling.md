# Function Calling Guide

Routex 完全支持 AI 模型的 Function Calling（工具调用）功能，支持 Anthropic 和 OpenAI 格式的自动转换。

## 📖 目录

- [功能概述](#功能概述)
- [Anthropic 格式](#anthropic-格式)
- [OpenAI 格式](#openai-格式)
- [格式转换](#格式转换)
- [使用示例](#使用示例)
- [最佳实践](#最佳实践)

## 功能概述

### 支持的功能

- ✅ **Anthropic Tools API** - 原生支持 Claude 的 tools 格式
- ✅ **OpenAI Function Calling** - 支持 OpenAI 的 function calling 格式
- ✅ **自动格式转换** - Anthropic ↔ OpenAI 双向转换
- ✅ **并行工具调用** - 支持一次调用多个工具
- ✅ **工具结果处理** - 完整的工具调用-结果循环
- ✅ **跨平台兼容** - 通过 transformer 实现格式统一

### 架构说明

```
Client (Anthropic 格式)
    ↓
Routex Proxy
    ↓
[Transformer: anthropic → openai]  # 如果目标是 OpenAI 兼容服务
    ↓
Provider (OpenAI/OpenRouter/etc)
    ↓
[Transformer: openai → anthropic]  # 响应转换回来
    ↓
Client (Anthropic 格式)
```

## Anthropic 格式

### 工具定义

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 1024,
  "tools": [
    {
      "name": "get_weather",
      "description": "Get the current weather in a given location",
      "input_schema": {
        "type": "object",
        "properties": {
          "location": {
            "type": "string",
            "description": "The city and state, e.g. San Francisco, CA"
          },
          "unit": {
            "type": "string",
            "enum": ["celsius", "fahrenheit"],
            "description": "The unit of temperature"
          }
        },
        "required": ["location"]
      }
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "What's the weather like in San Francisco?"
    }
  ]
}
```

### 工具调用响应

```json
{
  "id": "msg_01XFDUDYJgAACzvnptvVoYEL",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Let me check the weather for you."
    },
    {
      "type": "tool_use",
      "id": "toolu_01A09q90qw90lq917835lq9",
      "name": "get_weather",
      "input": {
        "location": "San Francisco, CA",
        "unit": "fahrenheit"
      }
    }
  ],
  "model": "claude-3-5-sonnet-20241022",
  "stop_reason": "tool_use",
  "usage": {
    "input_tokens": 385,
    "output_tokens": 120
  }
}
```

### 工具结果提交

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 1024,
  "tools": [...],  // 同上
  "messages": [
    {
      "role": "user",
      "content": "What's the weather like in San Francisco?"
    },
    {
      "role": "assistant",
      "content": [
        {
          "type": "text",
          "text": "Let me check the weather for you."
        },
        {
          "type": "tool_use",
          "id": "toolu_01A09q90qw90lq917835lq9",
          "name": "get_weather",
          "input": {
            "location": "San Francisco, CA",
            "unit": "fahrenheit"
          }
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "tool_result",
          "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
          "content": "The current temperature in San Francisco, CA is 72°F with partly cloudy skies."
        }
      ]
    }
  ]
}
```

### Tool Choice 控制

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "tools": [...],
  "tool_choice": {"type": "auto"},  // 默认：模型自动决定
  // 或
  "tool_choice": {"type": "any"},   // 强制使用工具
  // 或
  "tool_choice": {
    "type": "tool",
    "name": "get_weather"  // 强制使用特定工具
  }
}
```

## OpenAI 格式

### 函数定义

```json
{
  "model": "gpt-4-turbo",
  "max_tokens": 1024,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get the current weather in a given location",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "The city and state, e.g. San Francisco, CA"
            },
            "unit": {
              "type": "string",
              "enum": ["celsius", "fahrenheit"]
            }
          },
          "required": ["location"]
        }
      }
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "What's the weather like in San Francisco?"
    }
  ]
}
```

### 函数调用响应

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1699896916,
  "model": "gpt-4-turbo",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": null,
        "tool_calls": [
          {
            "id": "call_abc123",
            "type": "function",
            "function": {
              "name": "get_weather",
              "arguments": "{\"location\": \"San Francisco, CA\", \"unit\": \"fahrenheit\"}"
            }
          }
        ]
      },
      "finish_reason": "tool_calls"
    }
  ],
  "usage": {
    "prompt_tokens": 82,
    "completion_tokens": 18,
    "total_tokens": 100
  }
}
```

## 格式转换

### Anthropic → OpenAI

Routex 自动转换：

| Anthropic | OpenAI |
|-----------|--------|
| `tools[].name` | `tools[].function.name` |
| `tools[].input_schema` | `tools[].function.parameters` |
| `content[].type: "tool_use"` | `message.tool_calls[]` |
| `content[].input` | `function.arguments` (JSON string) |
| `tool_choice.type: "any"` | `tool_choice: "required"` |

### OpenAI → Anthropic

反向转换同样自动进行。

## 使用示例

### 示例 1：天气查询（完整流程）

**1. 配置渠道**

```bash
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenRouter Claude",
    "type": "openai",
    "baseUrl": "https://openrouter.ai/api/v1/chat/completions",
    "apiKey": "sk-or-xxx",
    "models": ["anthropic/claude-3.5-sonnet"],
    "transformers": {
      "use": ["openai"]
    }
  }'
```

**2. 发送工具调用请求**

```bash
curl -X POST http://localhost:8080/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-routex-api-key" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "tools": [
      {
        "name": "get_weather",
        "description": "Get current weather",
        "input_schema": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "City and state"
            }
          },
          "required": ["location"]
        }
      }
    ],
    "messages": [
      {
        "role": "user",
        "content": "What is the weather in Tokyo?"
      }
    ]
  }'
```

**3. 处理工具调用并提交结果**

```javascript
// 模拟工具执行
function getWeather(location) {
  // 实际应用中这里会调用天气 API
  return `The weather in ${location} is sunny, 22°C`;
}

// 假设收到了上一步的响应
const assistantMessage = {
  role: "assistant",
  content: [
    {
      type: "tool_use",
      id: "toolu_xxx",
      name: "get_weather",
      input: { location: "Tokyo" }
    }
  ]
};

// 执行工具
const toolResult = getWeather(assistantMessage.content[0].input.location);

// 提交结果
const response = await fetch('http://localhost:8080/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-routex-api-key'
  },
  body: JSON.stringify({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    tools: [...],  // 同上
    messages: [
      { role: "user", content: "What is the weather in Tokyo?" },
      assistantMessage,
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "toolu_xxx",
            content: toolResult
          }
        ]
      }
    ]
  })
});
```

### 示例 2：并行工具调用

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 2048,
  "tools": [
    {
      "name": "get_weather",
      "description": "Get weather info",
      "input_schema": {...}
    },
    {
      "name": "get_flight_status",
      "description": "Get flight status",
      "input_schema": {...}
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "What's the weather in Tokyo and status of flight UA123?"
    }
  ]
}
```

响应可能包含多个工具调用：

```json
{
  "content": [
    {
      "type": "tool_use",
      "id": "toolu_01",
      "name": "get_weather",
      "input": {"location": "Tokyo"}
    },
    {
      "type": "tool_use",
      "id": "toolu_02",
      "name": "get_flight_status",
      "input": {"flight_number": "UA123"}
    }
  ],
  "stop_reason": "tool_use"
}
```

### 示例 3：使用 SDK（Python）

```python
import anthropic

# 通过 Routex 代理
client = anthropic.Anthropic(
    api_key="your-routex-api-key",
    base_url="http://localhost:8080"
)

tools = [
    {
        "name": "calculator",
        "description": "A simple calculator",
        "input_schema": {
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "enum": ["add", "subtract", "multiply", "divide"]
                },
                "a": {"type": "number"},
                "b": {"type": "number"}
            },
            "required": ["operation", "a", "b"]
        }
    }
]

# 发送请求
message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=tools,
    messages=[
        {"role": "user", "content": "What is 123 * 456?"}
    ]
)

# 检查是否有工具调用
if message.stop_reason == "tool_use":
    tool_use = next(block for block in message.content if block.type == "tool_use")

    # 执行工具
    result = execute_calculator(tool_use.input)

    # 提交结果
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        tools=tools,
        messages=[
            {"role": "user", "content": "What is 123 * 456?"},
            {"role": "assistant", "content": message.content},
            {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": str(result)
                    }
                ]
            }
        ]
    )

    print(response.content[0].text)  # "123 * 456 = 56088"
```

## 最佳实践

### 1. 工具定义

✅ **推荐做法：**
- 提供清晰的工具描述
- 使用详细的参数说明
- 正确标记必需参数
- 使用枚举限制参数值

```json
{
  "name": "send_email",
  "description": "Send an email to a recipient. Returns success status.",
  "input_schema": {
    "type": "object",
    "properties": {
      "to": {
        "type": "string",
        "description": "Email address of the recipient (e.g., user@example.com)"
      },
      "subject": {
        "type": "string",
        "description": "Subject line of the email"
      },
      "priority": {
        "type": "string",
        "enum": ["low", "normal", "high"],
        "description": "Email priority level",
        "default": "normal"
      }
    },
    "required": ["to", "subject"]
  }
}
```

❌ **避免：**
```json
{
  "name": "send_email",
  "description": "Send email",  // 太简略
  "input_schema": {
    "type": "object",
    "properties": {
      "data": {"type": "string"}  // 不明确
    }
  }
}
```

### 2. 错误处理

在工具结果中包含错误信息：

```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_xxx",
  "content": "Error: Location not found. Please provide a valid city name.",
  "is_error": true
}
```

### 3. 性能优化

- **缓存工具定义**：避免每次请求都发送相同的 tools 数组
- **批量处理**：支持并行工具调用时，一次执行所有工具
- **超时控制**：为工具执行设置合理的超时时间

### 4. 安全建议

- ⚠️ **验证工具输入**：始终验证模型提供的参数
- ⚠️ **权限控制**：限制敏感操作的工具访问
- ⚠️ **日志记录**：记录所有工具调用用于审计

```javascript
function executeTool(toolUse) {
  // 验证工具名称
  if (!ALLOWED_TOOLS.includes(toolUse.name)) {
    throw new Error(`Tool ${toolUse.name} not allowed`);
  }

  // 验证输入
  const validated = validateInput(toolUse.name, toolUse.input);

  // 记录日志
  logger.info('Tool execution', {
    tool: toolUse.name,
    input: toolUse.input,
    user: currentUser
  });

  // 执行工具
  return tools[toolUse.name](validated);
}
```

### 5. 跨平台兼容

使用 Routex 的 transformer 实现统一接口：

```javascript
// 客户端始终使用 Anthropic 格式
const request = {
  model: "claude-3-5-sonnet-20241022",
  tools: anthropicTools,  // Anthropic 格式
  messages: [...]
};

// Routex 自动转换到后端格式
// OpenRouter → OpenAI 格式
// Claude Direct → Anthropic 格式
// Google Gemini → 自定义格式
```

## 调试技巧

### 查看转换日志

Routex 会自动记录 transformer 的工作：

```
🔄 Applying 1 request transformer(s) for channel OpenRouter
🔄 Applying 1 response transformer(s) for channel OpenRouter
```

### 测试工具定义

使用 transformer 测试端点：

```bash
curl -X POST http://localhost:8080/api/transformers/test \
  -H "Content-Type: application/json" \
  -d '{
    "transformer": "openai",
    "direction": "request",
    "request": {
      "model": "claude-3.5-sonnet",
      "tools": [...],
      "messages": [...]
    }
  }'
```

## 常见问题

### Q: Function calling 和 Tool use 有什么区别？

A: 它们是同一个概念的不同叫法：
- **Function calling** - OpenAI 的术语
- **Tool use** - Anthropic 的术语

Routex 自动处理两种格式的转换。

### Q: 支持哪些模型？

A: 支持所有提供 function calling 能力的模型：
- Claude 3 系列（Opus, Sonnet, Haiku）
- Claude 3.5 Sonnet
- GPT-4 系列
- GPT-3.5-turbo
- Gemini Pro

### Q: 如何限制工具调用次数？

A: 在应用层实现：

```javascript
let toolCallCount = 0;
const MAX_TOOL_CALLS = 5;

while (response.stop_reason === "tool_use" && toolCallCount < MAX_TOOL_CALLS) {
  // 执行工具并继续对话
  toolCallCount++;
}

if (toolCallCount >= MAX_TOOL_CALLS) {
  console.warn("Max tool calls reached");
}
```

### Q: 支持流式响应吗？

A: 是的！使用 `stream: true` 即可：

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "stream": true,
  "tools": [...],
  "messages": [...]
}
```

工具调用会在流式响应中逐步返回。

## 相关资源

- [Anthropic Tools API 文档](https://docs.anthropic.com/claude/docs/tool-use)
- [OpenAI Function Calling 文档](https://platform.openai.com/docs/guides/function-calling)
- [Routex Transformers 文档](./transformers.md)
- [API 参考](../API_REFERENCE.md)

## 更新日志

- **v1.1.0** - 添加 SmartRouter 对 tools 的支持
- **v1.0.0** - 初始 function calling 支持
- **v0.9.0** - OpenAI transformer 实现
