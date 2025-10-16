# Function Calling 示例

本目录包含 Routex Function Calling 功能的实际使用示例。

## 📁 示例列表

### 基础示例
- [weather-query.js](#天气查询示例) - 简单的天气查询工具
- [calculator.js](#计算器示例) - 数学计算工具

### 高级示例
- [parallel-tools.js](#并行工具调用) - 同时使用多个工具
- [multi-turn.js](#多轮对话) - 工具调用的多轮对话
- [error-handling.js](#错误处理) - 处理工具执行错误

## 天气查询示例

```javascript
// examples/function-calling/weather-query.js
import fetch from 'node-fetch';

const ROUTEX_URL = 'http://localhost:8080';
const API_KEY = 'your-routex-api-key';

// 定义天气查询工具
const weatherTool = {
  name: 'get_weather',
  description: 'Get the current weather in a given location',
  input_schema: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'The city and state, e.g. San Francisco, CA'
      },
      unit: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        description: 'The unit of temperature',
        default: 'celsius'
      }
    },
    required: ['location']
  }
};

// 模拟天气 API
function getWeather(location, unit = 'celsius') {
  // 实际应用中这里应该调用真实的天气 API
  const weatherData = {
    'San Francisco, CA': { temp: 22, condition: 'Partly cloudy' },
    'Tokyo, Japan': { temp: 18, condition: 'Rainy' },
    'London, UK': { temp: 15, condition: 'Foggy' }
  };

  const data = weatherData[location] || { temp: 20, condition: 'Unknown' };

  if (unit === 'fahrenheit') {
    data.temp = (data.temp * 9/5) + 32;
  }

  return `The weather in ${location} is ${data.condition} with a temperature of ${data.temp}°${unit === 'celsius' ? 'C' : 'F'}.`;
}

// 主函数
async function main() {
  const messages = [
    {
      role: 'user',
      content: 'What is the weather like in Tokyo?'
    }
  ];

  // 第一次请求 - 模型决定是否使用工具
  let response = await fetch(`${ROUTEX_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      tools: [weatherTool],
      messages: messages
    })
  });

  let result = await response.json();
  console.log('First response:', JSON.stringify(result, null, 2));

  // 检查是否有工具调用
  if (result.stop_reason === 'tool_use') {
    // 提取工具调用
    const toolUse = result.content.find(block => block.type === 'tool_use');

    console.log(`\nTool called: ${toolUse.name}`);
    console.log(`Tool input:`, toolUse.input);

    // 执行工具
    const toolResult = getWeather(toolUse.input.location, toolUse.input.unit);
    console.log(`\nTool result: ${toolResult}`);

    // 将助手回复和工具结果添加到消息历史
    messages.push({
      role: 'assistant',
      content: result.content
    });

    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: toolResult
        }
      ]
    });

    // 第二次请求 - 让模型使用工具结果生成最终回复
    response = await fetch(`${ROUTEX_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        tools: [weatherTool],
        messages: messages
      })
    });

    result = await response.json();
    console.log('\nFinal response:', result.content[0].text);
  } else {
    console.log('\nNo tool use, direct response:', result.content[0].text);
  }
}

main().catch(console.error);
```

## 计算器示例

```javascript
// examples/function-calling/calculator.js
const calculatorTools = [
  {
    name: 'calculate',
    description: 'Perform basic arithmetic operations',
    input_schema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['add', 'subtract', 'multiply', 'divide', 'power', 'sqrt'],
          description: 'The arithmetic operation to perform'
        },
        a: {
          type: 'number',
          description: 'The first number'
        },
        b: {
          type: 'number',
          description: 'The second number (not needed for sqrt)'
        }
      },
      required: ['operation', 'a']
    }
  }
];

function calculate(operation, a, b) {
  switch (operation) {
    case 'add': return a + b;
    case 'subtract': return a - b;
    case 'multiply': return a * b;
    case 'divide':
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    case 'power': return Math.pow(a, b);
    case 'sqrt': return Math.sqrt(a);
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

// 使用示例
async function calculatorExample() {
  const userQuestion = "What is 156 multiplied by 47, and then add 392?";

  const response = await callClaude({
    tools: calculatorTools,
    messages: [{ role: 'user', content: userQuestion }]
  });

  // 处理可能的多次工具调用
  while (response.stop_reason === 'tool_use') {
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const result = calculate(
          block.input.operation,
          block.input.a,
          block.input.b
        );

        console.log(`${block.input.operation}(${block.input.a}, ${block.input.b}) = ${result}`);

        // 将结果提交回模型
        // ... 继续对话
      }
    }
  }
}
```

## 并行工具调用

```javascript
// examples/function-calling/parallel-tools.js
const multiTools = [
  {
    name: 'get_weather',
    description: 'Get weather information',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string' }
      },
      required: ['location']
    }
  },
  {
    name: 'get_time',
    description: 'Get current time in a timezone',
    input_schema: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'IANA timezone, e.g. America/Los_Angeles' }
      },
      required: ['timezone']
    }
  },
  {
    name: 'get_news',
    description: 'Get latest news headlines',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['technology', 'business', 'sports'] }
      }
    }
  }
];

async function parallelToolsExample() {
  const userQuestion = "What's the weather in New York, the current time there, and latest tech news?";

  const response = await callClaude({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    tools: multiTools,
    messages: [{ role: 'user', content: userQuestion }]
  });

  if (response.stop_reason === 'tool_use') {
    // 收集所有工具调用
    const toolCalls = response.content.filter(block => block.type === 'tool_use');

    console.log(`Model wants to use ${toolCalls.length} tools in parallel:`);

    // 并行执行所有工具
    const toolResults = await Promise.all(
      toolCalls.map(async (toolCall) => {
        console.log(`- ${toolCall.name}(${JSON.stringify(toolCall.input)})`);

        let result;
        switch (toolCall.name) {
          case 'get_weather':
            result = await getWeather(toolCall.input.location);
            break;
          case 'get_time':
            result = await getTime(toolCall.input.timezone);
            break;
          case 'get_news':
            result = await getNews(toolCall.input.category);
            break;
        }

        return {
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: result
        };
      })
    );

    // 将所有结果一起提交
    const finalResponse = await callClaude({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      tools: multiTools,
      messages: [
        { role: 'user', content: userQuestion },
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults }
      ]
    });

    console.log('\nFinal answer:', finalResponse.content[0].text);
  }
}
```

## 多轮对话

```javascript
// examples/function-calling/multi-turn.js
class ConversationManager {
  constructor(tools) {
    this.tools = tools;
    this.messages = [];
    this.toolHandlers = new Map();
  }

  registerTool(name, handler) {
    this.toolHandlers.set(name, handler);
  }

  async sendMessage(userMessage) {
    // 添加用户消息
    this.messages.push({
      role: 'user',
      content: userMessage
    });

    while (true) {
      // 调用 AI
      const response = await callClaude({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        tools: this.tools,
        messages: this.messages
      });

      // 添加助手回复
      this.messages.push({
        role: 'assistant',
        content: response.content
      });

      // 如果不需要工具，返回结果
      if (response.stop_reason !== 'tool_use') {
        return response.content[0].text;
      }

      // 执行工具调用
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const handler = this.toolHandlers.get(block.name);
          if (!handler) {
            throw new Error(`No handler for tool: ${block.name}`);
          }

          const result = await handler(block.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result
          });
        }
      }

      // 添加工具结果
      this.messages.push({
        role: 'user',
        content: toolResults
      });

      // 继续循环，让模型处理结果
    }
  }

  getHistory() {
    return this.messages;
  }

  clearHistory() {
    this.messages = [];
  }
}

// 使用示例
async function multiTurnExample() {
  const manager = new ConversationManager([
    weatherTool,
    calculatorTool,
    searchTool
  ]);

  manager.registerTool('get_weather', getWeather);
  manager.registerTool('calculate', calculate);
  manager.registerTool('search', search);

  console.log('User: What is the weather in Tokyo?');
  let response = await manager.sendMessage('What is the weather in Tokyo?');
  console.log('Assistant:', response);

  console.log('\nUser: How about in London?');
  response = await manager.sendMessage('How about in London?');
  console.log('Assistant:', response);

  console.log('\nUser: What is the temperature difference?');
  response = await manager.sendMessage('What is the temperature difference?');
  console.log('Assistant:', response);
}
```

## 错误处理

```javascript
// examples/function-calling/error-handling.js
async function robustToolExecution(toolUse) {
  try {
    // 验证工具输入
    if (!validateToolInput(toolUse.name, toolUse.input)) {
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: 'Error: Invalid input parameters',
        is_error: true
      };
    }

    // 执行工具（带超时）
    const result = await Promise.race([
      executeTool(toolUse.name, toolUse.input),
      timeout(5000) // 5 秒超时
    ]);

    return {
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: JSON.stringify(result)
    };

  } catch (error) {
    console.error(`Tool execution error:`, error);

    // 返回错误信息给模型
    return {
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: `Error: ${error.message}`,
      is_error: true
    };
  }
}

function timeout(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Tool execution timeout')), ms)
  );
}

function validateToolInput(toolName, input) {
  // 根据工具定义验证输入
  const schema = toolSchemas[toolName];
  if (!schema) return false;

  // 检查必需字段
  for (const required of schema.required || []) {
    if (!(required in input)) {
      return false;
    }
  }

  // 检查枚举值
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (prop.enum && input[key] && !prop.enum.includes(input[key])) {
      return false;
    }
  }

  return true;
}

// 示例：处理 API 速率限制
async function handleRateLimitedTool(toolUse) {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await executeTool(toolUse.name, toolUse.input);
    } catch (error) {
      if (error.status === 429) { // Too Many Requests
        retries++;
        const backoff = Math.pow(2, retries) * 1000; // 指数退避
        console.log(`Rate limited, retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max retries exceeded');
}
```

## Python 示例

```python
# examples/function-calling/weather_query.py
import anthropic
import json

# 配置 Routex 代理
client = anthropic.Anthropic(
    api_key="your-routex-api-key",
    base_url="http://localhost:8080"
)

# 定义工具
tools = [
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
                    "enum": ["celsius", "fahrenheit"]
                }
            },
            "required": ["location"]
        }
    }
]

def get_weather(location, unit="celsius"):
    """模拟天气 API"""
    # 实际应用中调用真实 API
    return f"The weather in {location} is sunny, 22°{unit[0].upper()}"

def process_tool_call(tool_name, tool_input):
    """执行工具调用"""
    if tool_name == "get_weather":
        return get_weather(**tool_input)
    else:
        return f"Unknown tool: {tool_name}"

# 主对话循环
def chat(user_message):
    messages = [{"role": "user", "content": user_message}]

    while True:
        # 调用 Claude
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            tools=tools,
            messages=messages
        )

        print(f"Stop reason: {response.stop_reason}")

        # 如果不需要工具，返回结果
        if response.stop_reason != "tool_use":
            final_text = next(
                (block.text for block in response.content if hasattr(block, "text")),
                None
            )
            return final_text

        # 添加助手回复
        messages.append({"role": "assistant", "content": response.content})

        # 处理工具调用
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"Tool called: {block.name}")
                print(f"Tool input: {block.input}")

                # 执行工具
                result = process_tool_call(block.name, block.input)
                print(f"Tool result: {result}")

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result
                })

        # 添加工具结果
        messages.append({"role": "user", "content": tool_results})

        # 继续循环

if __name__ == "__main__":
    response = chat("What's the weather in Tokyo?")
    print(f"\nFinal response: {response}")
```

## 运行示例

```bash
# 安装依赖
npm install node-fetch

# 运行 JavaScript 示例
node examples/function-calling/weather-query.js

# 安装 Python 依赖
pip install anthropic

# 运行 Python 示例
python examples/function-calling/weather_query.py
```

## 注意事项

1. **API 密钥**：将示例中的 `your-routex-api-key` 替换为实际的 API 密钥
2. **服务地址**：确保 Routex 服务运行在 `http://localhost:8080`
3. **工具安全**：实际应用中要验证和限制工具的执行权限
4. **错误处理**：生产环境要添加完善的错误处理和日志

## 更多资源

- [Function Calling 完整指南](../docs/function-calling.md)
- [API 参考文档](../API_REFERENCE.md)
- [Transformers 文档](../docs/transformers.md)
