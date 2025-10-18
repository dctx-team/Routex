# Function Calling 

 Routex Function Calling 

## 📁 

### 
- [weather-query.js](#)
- [calculator.js](#)
### 
- [parallel-tools.js](#)
- [multi-turn.js](#)
- [error-handling.js](#)
## 

```javascript
// examples/function-calling/weather-query.js
import fetch from 'node-fetch';

const ROUTEX_URL = 'http://localhost:8080';
const API_KEY = 'your-routex-api-key';

// 
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

//  API
function getWeather(location, unit = 'celsius') {
  //  API
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

// 
async function main {
  const messages = [
    {
      role: 'user',
      content: 'What is the weather like in Tokyo?'
    }
  ];

  //
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

  let result = await response.json;
  console.log('First response:', JSON.stringify(result, null, 2));

  // 
  if (result.stop_reason === 'tool_use') {
    // 
    const toolUse = result.content.find(block => block.type === 'tool_use');

    console.log(`\nTool called: ${toolUse.name}`);
    console.log(`Tool input:`, toolUse.input);

    // 
    const toolResult = getWeather(toolUse.input.location, toolUse.input.unit);
    console.log(`\nTool result: ${toolResult}`);

    // 
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

    //
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

    result = await response.json;
    console.log('\nFinal response:', result.content[0].text);
  } else {
    console.log('\nNo tool use, direct response:', result.content[0].text);
  }
}

main.catch(console.error);
```

## 

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

// 
async function calculatorExample {
  const userQuestion = What is 156 multiplied by 47, and then add 392?;

  const response = await callClaude({
    tools: calculatorTools,
    messages: [{ role: 'user', content: userQuestion }]
  });

  // 
  while (response.stop_reason === 'tool_use') {
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const result = calculate(
          block.input.operation,
          block.input.a,
          block.input.b
        );

        console.log(`${block.input.operation}(${block.input.a}, ${block.input.b}) = ${result}`);

        // 
        // ... 
      }
    }
  }
}
```

## 

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

async function parallelToolsExample {
  const userQuestion = What's the weather in New York, the current time there, and latest tech news?;

  const response = await callClaude({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    tools: multiTools,
    messages: [{ role: 'user', content: userQuestion }]
  });

  if (response.stop_reason === 'tool_use') {
    // 
    const toolCalls = response.content.filter(block => block.type === 'tool_use');

    console.log(`Model wants to use ${toolCalls.length} tools in parallel:`);

    // 
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

    // 
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

## 

```javascript
// examples/function-calling/multi-turn.js
class ConversationManager {
  constructor(tools) {
    this.tools = tools;
    this.messages = ;
    this.toolHandlers = new Map;
  }

  registerTool(name, handler) {
    this.toolHandlers.set(name, handler);
  }

  async sendMessage(userMessage) {
    // 
    this.messages.push({
      role: 'user',
      content: userMessage
    });

    while (true) {
      //  AI
      const response = await callClaude({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        tools: this.tools,
        messages: this.messages
      });

      // 
      this.messages.push({
        role: 'assistant',
        content: response.content
      });

      // 
      if (response.stop_reason !== 'tool_use') {
        return response.content[0].text;
      }

      // 
      const toolResults = ;
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

      // 
      this.messages.push({
        role: 'user',
        content: toolResults
      });

      // 
    }
  }

  getHistory {
    return this.messages;
  }

  clearHistory {
    this.messages = ;
  }
}

// 
async function multiTurnExample {
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

## 

```javascript
// examples/function-calling/error-handling.js
async function robustToolExecution(toolUse) {
  try {
    // 
    if (!validateToolInput(toolUse.name, toolUse.input)) {
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: 'Error: Invalid input parameters',
        is_error: true
      };
    }

    // 
    const result = await Promise.race([
      executeTool(toolUse.name, toolUse.input),
      timeout(5000) // 5 
    ]);

    return {
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: JSON.stringify(result)
    };

  } catch (error) {
    console.error(`Tool execution error:`, error);

    // 
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
    setTimeout( => reject(new Error('Tool execution timeout')), ms)
  );
}

function validateToolInput(toolName, input) {
  // 
  const schema = toolSchemas[toolName];
  if (!schema) return false;

  // 
  for (const required of schema.required || ) {
    if (!(required in input)) {
      return false;
    }
  }

  // 
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (prop.enum && input[key] && !prop.enum.includes(input[key])) {
      return false;
    }
  }

  return true;
}

//  API 
async function handleRateLimitedTool(toolUse) {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await executeTool(toolUse.name, toolUse.input);
    } catch (error) {
      if (error.status === 429) { // Too Many Requests
        retries++;
        const backoff = Math.pow(2, retries) * 1000; // 
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

## Python 

```python
# examples/function-calling/weather_query.py
import anthropic
import json

#  Routex 
client = anthropic.Anthropic(
    api_key=your-routex-api-key,
    base_url=http://localhost:8080
)

# 
tools = [
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
                    enum: [celsius, fahrenheit]
                }
            },
            required: [location]
        }
    }
]

def get_weather(location, unit=celsius):
     API
    #  API
    return fThe weather in {location} is sunny, 22°{unit[0].upper}

def process_tool_call(tool_name, tool_input):
    
    if tool_name == get_weather:
        return get_weather(**tool_input)
    else:
        return fUnknown tool: {tool_name}

# 
def chat(user_message):
    messages = [{role: user, content: user_message}]

    while True:
        #  Claude
        response = client.messages.create(
            model=claude-3-5-sonnet-20241022,
            max_tokens=1024,
            tools=tools,
            messages=messages
        )

        print(fStop reason: {response.stop_reason})

        # 
        if response.stop_reason != tool_use:
            final_text = next(
                (block.text for block in response.content if hasattr(block, text)),
                None
            )
            return final_text

        # 
        messages.append({role: assistant, content: response.content})

        # 
        tool_results = 
        for block in response.content:
            if block.type == tool_use:
                print(fTool called: {block.name})
                print(fTool input: {block.input})

                # 
                result = process_tool_call(block.name, block.input)
                print(fTool result: {result})

                tool_results.append({
                    type: tool_result,
                    tool_use_id: block.id,
                    content: result
                })

        # 
        messages.append({role: user, content: tool_results})

        # 

if __name__ == __main__:
    response = chat(What's the weather in Tokyo?)
    print(f\nFinal response: {response})
```

## 

```bash
# 
npm install node-fetch

#  JavaScript 
node examples/function-calling/weather-query.js

#  Python 
pip install anthropic

#  Python 
python examples/function-calling/weather_query.py
```

## 

1. **API ** `your-routex-api-key`  API 
2. **** Routex  `http://localhost:8080`
3. ****
4. ****

## 

- [Function Calling ](../docs/function-calling.md)
- [API ](../API_REFERENCE.md)
- [Transformers ](../docs/transformers.md)
