# Function Calling Guide

Routex  AI  Function Calling Anthropic  OpenAI 

## 📖 

- (#)
- [Anthropic ](#anthropic-)
- [OpenAI ](#openai-)
- (#)
- (#)
- (#)

## 

### 

- ✅ **Anthropic Tools API** -  Claude  tools 
- ✅ **OpenAI Function Calling** -  OpenAI  function calling 
- ✅ **** - Anthropic ↔ OpenAI 
- ✅ ****
- ✅ **** - -
- ✅ **** -  transformer 

### 

```
Client (Anthropic )
    ↓
Routex Proxy
    ↓
[Transformer: anthropic → openai]  #  OpenAI 
    ↓
Provider (OpenAI/OpenRouter/etc)
    ↓
[Transformer: openai → anthropic]  # 
    ↓
Client (Anthropic )
```

## Anthropic 

### 

```json
{
  model: claude-3-5-sonnet-20241022,
  max_tokens: 1024,
  tools: [
    {
      name: get_weather,
      description: Get the current weather in a given location,
      input_schema: {
        type: object,
        properties: {
          location: {
            type: string,
            description: The city and state, e.g. San Francisco, CA
          },
          unit: {
            type: string,
            enum: [celsius, fahrenheit],
            description: The unit of temperature
          }
        },
        required: [location]
      }
    }
  ],
  messages: [
    {
      role: user,
      content: What's the weather like in San Francisco?
    }
  ]
}
```

### 

```json
{
  id: msg_01XFDUDYJgAACzvnptvVoYEL,
  type: message,
  role: assistant,
  content: [
    {
      type: text,
      text: Let me check the weather for you.
    },
    {
      type: tool_use,
      id: toolu_01A09q90qw90lq917835lq9,
      name: get_weather,
      input: {
        location: San Francisco, CA,
        unit: fahrenheit
      }
    }
  ],
  model: claude-3-5-sonnet-20241022,
  stop_reason: tool_use,
  usage: {
    input_tokens: 385,
    output_tokens: 120
  }
}
```

### 

```json
{
  model: claude-3-5-sonnet-20241022,
  max_tokens: 1024,
  tools: [...],  // 
  messages: [
    {
      role: user,
      content: What's the weather like in San Francisco?
    },
    {
      role: assistant,
      content: [
        {
          type: text,
          text: Let me check the weather for you.
        },
        {
          type: tool_use,
          id: toolu_01A09q90qw90lq917835lq9,
          name: get_weather,
          input: {
            location: San Francisco, CA,
            unit: fahrenheit
          }
        }
      ]
    },
    {
      role: user,
      content: [
        {
          type: tool_result,
          tool_use_id: toolu_01A09q90qw90lq917835lq9,
          content: The current temperature in San Francisco, CA is 72°F with partly cloudy skies.
        }
      ]
    }
  ]
}
```

### Tool Choice 

```json
{
  model: claude-3-5-sonnet-20241022,
  tools: [...],
  tool_choice: {type: auto},  // 
  // 
  tool_choice: {type: any},   // 
  // 
  tool_choice: {
    type: tool,
    name: get_weather  // 
  }
}
```

## OpenAI 

### 

```json
{
  model: gpt-4-turbo,
  max_tokens: 1024,
  tools: [
    {
      type: function,
      function: {
        name: get_weather,
        description: Get the current weather in a given location,
        parameters: {
          type: object,
          properties: {
            location: {
              type: string,
              description: The city and state, e.g. San Francisco, CA
            },
            unit: {
              type: string,
              enum: [celsius, fahrenheit]
            }
          },
          required: [location]
        }
      }
    }
  ],
  messages: [
    {
      role: user,
      content: What's the weather like in San Francisco?
    }
  ]
}
```

### 

```json
{
  id: chatcmpl-abc123,
  object: chat.completion,
  created: 1699896916,
  model: gpt-4-turbo,
  choices: [
    {
      index: 0,
      message: {
        role: assistant,
        content: null,
        tool_calls: [
          {
            id: call_abc123,
            type: function,
            function: {
              name: get_weather,
              arguments: {\location\: \San Francisco, CA\, \unit\: \fahrenheit\}
            }
          }
        ]
      },
      finish_reason: tool_calls
    }
  ],
  usage: {
    prompt_tokens: 82,
    completion_tokens: 18,
    total_tokens: 100
  }
}
```

## 

### Anthropic → OpenAI

Routex 

| Anthropic | OpenAI |
|-----------|--------|
| `tools.name` | `tools.function.name` |
| `tools.input_schema` | `tools.function.parameters` |
| `content.type: tool_use` | `message.tool_calls` |
| `content.input` | `function.arguments` (JSON string) |
| `tool_choice.type: any` | `tool_choice: required` |

### OpenAI → Anthropic

## 

###  1

**1. **

```bash
curl -X POST http://localhost:3000/api/channels \
  -H Content-Type: application/json \
  -d '{
    name: OpenRouter Claude,
    type: openai,
    baseUrl: https://openrouter.ai/api/v1/chat/completions,
    apiKey: sk-or-xxx,
    models: [anthropic/claude-3.5-sonnet],
    transformers: {
      use: [openai]
    }
  }'
```

**2. **

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H Content-Type: application/json \
  -H x-api-key: your-routex-api-key \
  -d '{
    model: claude-3-5-sonnet-20241022,
    max_tokens: 1024,
    tools: [
      {
        name: get_weather,
        description: Get current weather,
        input_schema: {
          type: object,
          properties: {
            location: {
              type: string,
              description: City and state
            }
          },
          required: [location]
        }
      }
    ],
    messages: [
      {
        role: user,
        content: What is the weather in Tokyo?
      }
    ]
  }'
```

**3. **

```javascript
// 
function getWeather(location) {
  //  API
  return `The weather in ${location} is sunny, 22°C`;
}

// 
const assistantMessage = {
  role: assistant,
  content: [
    {
      type: tool_use,
      id: toolu_xxx,
      name: get_weather,
      input: { location: Tokyo }
    }
  ]
};

// 
const toolResult = getWeather(assistantMessage.content[0].input.location);

// 
const response = await fetch('http://localhost:3000/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-routex-api-key'
  },
  body: JSON.stringify({
    model: claude-3-5-sonnet-20241022,
    max_tokens: 1024,
    tools: [...],  // 
    messages: [
      { role: user, content: What is the weather in Tokyo? },
      assistantMessage,
      {
        role: user,
        content: [
          {
            type: tool_result,
            tool_use_id: toolu_xxx,
            content: toolResult
          }
        ]
      }
    ]
  })
});
```

###  2

```json
{
  model: claude-3-5-sonnet-20241022,
  max_tokens: 2048,
  tools: [
    {
      name: get_weather,
      description: Get weather info,
      input_schema: {...}
    },
    {
      name: get_flight_status,
      description: Get flight status,
      input_schema: {...}
    }
  ],
  messages: [
    {
      role: user,
      content: What's the weather in Tokyo and status of flight UA123?
    }
  ]
}
```

```json
{
  content: [
    {
      type: tool_use,
      id: toolu_01,
      name: get_weather,
      input: {location: Tokyo}
    },
    {
      type: tool_use,
      id: toolu_02,
      name: get_flight_status,
      input: {flight_number: UA123}
    }
  ],
  stop_reason: tool_use
}
```

###  3 SDKPython

```python
import anthropic

#  Routex 
client = anthropic.Anthropic(
    api_key=your-routex-api-key,
    base_url=http://localhost:3000
)

tools = [
    {
        name: calculator,
        description: A simple calculator,
        input_schema: {
            type: object,
            properties: {
                operation: {
                    type: string,
                    enum: [add, subtract, multiply, divide]
                },
                a: {type: number},
                b: {type: number}
            },
            required: [operation, a, b]
        }
    }
]

# 
message = client.messages.create(
    model=claude-3-5-sonnet-20241022,
    max_tokens=1024,
    tools=tools,
    messages=[
        {role: user, content: What is 123 * 456?}
    ]
)

# 
if message.stop_reason == tool_use:
    tool_use = next(block for block in message.content if block.type == tool_use)

    # 
    result = execute_calculator(tool_use.input)

    # 
    response = client.messages.create(
        model=claude-3-5-sonnet-20241022,
        max_tokens=1024,
        tools=tools,
        messages=[
            {role: user, content: What is 123 * 456?},
            {role: assistant, content: message.content},
            {
                role: user,
                content: [
                    {
                        type: tool_result,
                        tool_use_id: tool_use.id,
                        content: str(result)
                    }
                ]
            }
        ]
    )

    print(response.content[0].text)  # 123 * 456 = 56088
```

## 

### 1. 

✅ ****
```json
{
  name: send_email,
  description: Send an email to a recipient. Returns success status.,
  input_schema: {
    type: object,
    properties: {
      to: {
        type: string,
        description: Email address of the recipient (e.g., user@example.com)
      },
      subject: {
        type: string,
        description: Subject line of the email
      },
      priority: {
        type: string,
        enum: [low, normal, high],
        description: Email priority level,
        default: normal
      }
    },
    required: [to, subject]
  }
}
```

❌ ****
```json
{
  name: send_email,
  description: Send email,  // 
  input_schema: {
    type: object,
    properties: {
      data: {type: string}  // 
    }
  }
}
```

### 2. 

```json
{
  type: tool_result,
  tool_use_id: toolu_xxx,
  content: Error: Location not found. Please provide a valid city name.,
  is_error: true
}
```

### 3. 

- **** tools 
- ****
- ****

### 4. 

- ⚠️ ****
- ⚠️ ****
- ⚠️ ****

```javascript
function executeTool(toolUse) {
  // 
  if (!ALLOWED_TOOLS.includes(toolUse.name)) {
    throw new Error(`Tool ${toolUse.name} not allowed`);
  }

  // 
  const validated = validateInput(toolUse.name, toolUse.input);

  // 
  logger.info('Tool execution', {
    tool: toolUse.name,
    input: toolUse.input,
    user: currentUser
  });

  // 
  return tools[toolUse.name](validated);
}
```

### 5. 

 Routex  transformer 

```javascript
//  Anthropic 
const request = {
  model: claude-3-5-sonnet-20241022,
  tools: anthropicTools,  // Anthropic 
  messages: [...]
};

// Routex 
// OpenRouter → OpenAI 
// Claude Direct → Anthropic 
// Google Gemini → 
```

## 

### 

Routex  transformer 

```
🔄 Applying 1 request transformer(s) for channel OpenRouter
🔄 Applying 1 response transformer(s) for channel OpenRouter
```

### 

 transformer 

```bash
curl -X POST http://localhost:3000/api/transformers/test \
  -H Content-Type: application/json \
  -d '{
    transformer: openai,
    direction: request,
    request: {
      model: claude-3.5-sonnet,
      tools: [...],
      messages: [...]
    }
  }'
```

## 

### Q: Function calling  Tool use 

A: 
- **Function calling** - OpenAI 
- **Tool use** - Anthropic 

Routex 

### Q: 

A:  function calling 
- Claude 3 Opus, Sonnet, Haiku
- Claude 3.5 Sonnet
- GPT-4 
- GPT-3.5-turbo
- Gemini Pro

### Q: 

A: 

```javascript
let toolCallCount = 0;
const MAX_TOOL_CALLS = 5;

while (response.stop_reason === tool_use && toolCallCount < MAX_TOOL_CALLS) {
  // 
  toolCallCount++;
}

if (toolCallCount >= MAX_TOOL_CALLS) {
  console.warn(Max tool calls reached);
}
```

### Q: 

A:  `stream: true` 

```json
{
  model: claude-3-5-sonnet-20241022,
  stream: true,
  tools: [...],
  messages: [...]
}
```

## 

- [Anthropic Tools API ](https://docs.anthropic.com/claude/docs/tool-use)
- [OpenAI Function Calling ](https://platform.openai.com/docs/guides/function-calling)
- [Routex Transformers ](./transformers.md)
- [API ](../API_REFERENCE.md)

## 

- **v1.1.0** -  SmartRouter  tools 
- **v1.0.0** -  function calling 
- **v0.9.0** - OpenAI transformer 
