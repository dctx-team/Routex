# Transformer Pipeline System

Routex 的增强型 Transformer 流水线系统，支持条件执行、预设配置和流水线组合。

## 📖 目录

- [基本概念](#基本概念)
- [内置 Transformers](#内置-transformers)
- [Pipeline 预设](#pipeline-预设)
- [条件 Transformers](#条件-transformers)
- [高级用法](#高级用法)
- [API 参考](#api-参考)

## 基本概念

Transformer Pipeline 是一个处理链，用于在请求发送到上游 API 之前和响应返回给客户端之前对数据进行转换。

### 工作流程

```
Client Request
    ↓
[Transformer 1] → [Transformer 2] → [Transformer 3]
    ↓
Upstream API
    ↓
[Transformer 3] ← [Transformer 2] ← [Transformer 1]  (reverse order)
    ↓
Client Response
```

## 内置 Transformers

### 1. MaxToken Transformer

限制最大 token 数量，防止超额使用。

**配置选项：**
```typescript
{
  name: 'maxtoken',
  options: {
    maxTokens: 4096,        // 最大 tokens 数量
    defaultMaxTokens: 1024, // 默认值（当未指定时）
    enforceStrict: false    // 严格模式：超过限制直接拒绝
  }
}
```

**示例：**
```json
{
  "transformers": {
    "use": [
      ["maxtoken", { "maxTokens": 2048, "enforceStrict": true }]
    ]
  }
}
```

### 2. Sampling Transformer

控制采样参数（temperature、top_p、top_k）。

**配置选项：**
```typescript
{
  name: 'sampling',
  options: {
    temperature: {
      min: 0,
      max: 2,
      default: 1
    },
    topP: {
      min: 0,
      max: 1,
      default: undefined
    },
    topK: {
      min: 0,
      max: 500,
      default: undefined
    },
    enforceDefaults: false  // 强制使用默认值（忽略客户端设置）
  }
}
```

**示例：**
```json
{
  "transformers": {
    "use": [
      ["sampling", {
        "temperature": { "min": 0, "max": 1.5, "default": 0.7 },
        "topP": { "default": 0.9 }
      }]
    ]
  }
}
```

### 3. CleanCache Transformer

清理缓存和元数据字段，确保请求的一致性。

**配置选项：**
```typescript
{
  name: 'cleancache',
  options: {
    removeMetadata: true,   // 移除元数据字段
    removeCache: true,      // 移除缓存控制字段
    removeInternal: true,   // 移除内部字段
    customFields: []        // 自定义要移除的字段
  }
}
```

**示例：**
```json
{
  "transformers": {
    "use": [
      ["cleancache", {
        "customFields": ["debug_info", "trace_id"]
      }]
    ]
  }
}
```

## Pipeline 预设

Routex 提供了多个预配置的 transformer 组合，适用于不同的使用场景。

### 1. Safe（安全模式）

基础安全设置：限制 token 并清理缓存。

```typescript
{
  transformers: [
    { name: 'maxtoken', options: { maxTokens: 4096 } },
    { name: 'cleancache' }
  ]
}
```

**适用场景：** 一般用途，平衡安全性和灵活性

### 2. Strict（严格模式）

严格限制所有参数。

```typescript
{
  transformers: [
    { name: 'maxtoken', options: { maxTokens: 2048, enforceStrict: true } },
    { name: 'sampling', options: { enforceDefaults: true } },
    { name: 'cleancache' }
  ]
}
```

**适用场景：** 生产环境、成本控制、多租户场景

### 3. Balanced（平衡模式）

合理的限制配合灵活性。

```typescript
{
  transformers: [
    { name: 'maxtoken', options: { maxTokens: 8192 } },
    { name: 'sampling', options: {
      temperature: { min: 0, max: 2, default: 1 },
      topP: { min: 0, max: 1 }
    }},
    { name: 'cleancache' }
  ]
}
```

**适用场景：** 推荐的默认配置

### 4. Quality（高质量模式）

优化参数以获得最佳质量。

```typescript
{
  transformers: [
    { name: 'maxtoken', options: { maxTokens: 16384 } },
    { name: 'sampling', options: {
      temperature: { min: 0, max: 1.5, default: 0.7 },
      topP: { default: 0.9 }
    }}
  ]
}
```

**适用场景：** 高质量内容生成、专业应用

## 条件 Transformers

条件 transformers 允许根据请求上下文动态决定是否应用某个转换。

### 基本用法

```typescript
import { TransformerPipeline, Conditions } from './transformers';

const pipeline = new TransformerPipeline(transformerManager);

// 只对 GPT-4 模型应用 maxtoken
const specs = [
  {
    name: 'maxtoken',
    options: { maxTokens: 8192 },
    condition: Conditions.modelMatches(/gpt-4/)
  }
];

const result = await pipeline.executeRequest(request, specs, {
  model: 'gpt-4-turbo',
  channelType: 'openai'
});
```

### 条件助手

#### modelMatches

只在模型匹配时应用。

```typescript
Conditions.modelMatches('claude-3-opus')
Conditions.modelMatches(/gpt-4/)
```

#### channelTypeIs

只在特定渠道类型时应用。

```typescript
Conditions.channelTypeIs('anthropic')
Conditions.channelTypeIs('openai')
```

#### hasField

只在请求包含特定字段时应用。

```typescript
Conditions.hasField('tools')
Conditions.hasField('messages.0.content')
```

#### 逻辑组合

```typescript
// AND: 所有条件都满足
Conditions.and(
  Conditions.modelMatches(/gpt-4/),
  Conditions.hasField('tools')
)

// OR: 任一条件满足
Conditions.or(
  Conditions.channelTypeIs('openai'),
  Conditions.channelTypeIs('azure')
)

// NOT: 条件取反
Conditions.not(
  Conditions.hasField('stream')
)
```

### 自定义条件

```typescript
const customCondition: TransformerCondition = (data, context) => {
  // 检查是否是高优先级请求
  return context.metadata?.priority === 'high';
};

const specs = [
  {
    name: 'maxtoken',
    options: { maxTokens: 16384 },
    condition: customCondition
  }
];
```

## 高级用法

### 1. 错误处理

使用 `skipOnError` 在转换失败时跳过而不是抛出错误。

```typescript
const specs = [
  {
    name: 'maxtoken',
    skipOnError: true  // 失败时跳过，继续执行后续 transformers
  }
];

const result = await pipeline.executeRequest(request, specs);

// 检查执行结果
console.log('Applied:', result.metadata.appliedTransformers);
console.log('Skipped:', result.metadata.skippedTransformers);
console.log('Errors:', result.metadata.errors);
```

### 2. Pipeline 组合

组合多个预设创建自定义流水线。

```typescript
const pipeline = new TransformerPipeline(transformerManager);

// 组合 safe 和自定义 transformers
const customPipeline = [
  ...pipeline.composePresets('safe'),
  {
    name: 'sampling',
    options: { temperature: { default: 0.8 } }
  }
];

const result = await pipeline.executeRequest(request, customPipeline);
```

### 3. 自定义预设

注册自己的预设配置。

```typescript
pipeline.registerPreset({
  name: 'my-custom',
  description: 'My custom transformer preset',
  transformers: [
    { name: 'maxtoken', options: { maxTokens: 4096 } },
    {
      name: 'sampling',
      options: { temperature: { default: 0.5 } },
      condition: Conditions.hasField('tools')
    }
  ]
});

// 使用自定义预设
const result = await pipeline.executePreset(request, 'my-custom');
```

### 4. 模型特定的 Transformers

在渠道配置中为不同模型指定不同的 transformers。

```json
{
  "id": "channel-1",
  "name": "OpenAI",
  "type": "openai",
  "transformers": {
    "use": [
      "cleancache"
    ],
    "gpt-4": {
      "use": [
        ["maxtoken", { "maxTokens": 8192 }]
      ]
    },
    "gpt-3.5-turbo": {
      "use": [
        ["maxtoken", { "maxTokens": 4096 }]
      ]
    }
  }
}
```

### 5. 响应转换

Transformers 也可以用于处理响应数据（按相反顺序执行）。

```typescript
class ResponseFilterTransformer extends BaseTransformer {
  name = 'response-filter';

  async transformResponse(response: any): Promise<any> {
    // 过滤或修改响应数据
    if (response.choices) {
      response.choices = response.choices.filter(
        choice => choice.finish_reason === 'stop'
      );
    }
    return response;
  }
}
```

## API 参考

### TransformerPipeline

#### 构造函数

```typescript
new TransformerPipeline(transformerManager: TransformerManager)
```

#### 方法

##### executeRequest

执行请求转换流水线。

```typescript
async executeRequest(
  request: any,
  specs: ConditionalTransformerSpec[],
  context?: PipelineContext
): Promise<PipelineResult>
```

##### executeResponse

执行响应转换流水线（逆序）。

```typescript
async executeResponse(
  response: any,
  specs: ConditionalTransformerSpec[],
  context?: PipelineContext
): Promise<PipelineResult>
```

##### executePreset

执行预设配置。

```typescript
async executePreset(
  request: any,
  presetName: string,
  context?: PipelineContext
): Promise<PipelineResult>
```

##### registerPreset

注册自定义预设。

```typescript
registerPreset(preset: PipelinePreset): void
```

##### getPreset

获取预设配置。

```typescript
getPreset(name: string): PipelinePreset | undefined
```

##### listPresets

列出所有可用预设。

```typescript
listPresets(): PipelinePreset[]
```

##### composePresets

组合多个预设。

```typescript
composePresets(...presetNames: string[]): ConditionalTransformerSpec[]
```

### 类型定义

#### ConditionalTransformerSpec

```typescript
interface ConditionalTransformerSpec {
  name: string;
  options?: Record<string, any>;
  condition?: TransformerCondition;
  skipOnError?: boolean;
}
```

#### PipelineContext

```typescript
interface PipelineContext {
  channelId?: string;
  channelType?: string;
  model?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}
```

#### PipelineResult

```typescript
interface PipelineResult {
  body: any;
  headers?: Record<string, string>;
  metadata?: {
    appliedTransformers: string[];
    skippedTransformers: string[];
    errors: Array<{ transformer: string; error: string }>;
  };
}
```

#### TransformerCondition

```typescript
type TransformerCondition = (
  data: any,
  context: PipelineContext
) => boolean | Promise<boolean>;
```

## 最佳实践

### 1. 生产环境配置

```json
{
  "transformers": {
    "use": [
      ["maxtoken", { "maxTokens": 4096, "enforceStrict": true }],
      ["sampling", {
        "temperature": { "min": 0, "max": 1.5 },
        "enforceDefaults": false
      }],
      "cleancache"
    ]
  }
}
```

### 2. 开发环境配置

```json
{
  "transformers": {
    "use": [
      ["maxtoken", { "maxTokens": 8192 }]
    ]
  }
}
```

### 3. 成本优化配置

```json
{
  "transformers": {
    "use": [
      ["maxtoken", { "maxTokens": 2048, "defaultMaxTokens": 512 }],
      ["sampling", { "enforceDefaults": true }],
      "cleancache"
    ]
  }
}
```

### 4. 错误处理策略

```typescript
// 关键 transformers 抛出错误
const criticalSpecs = [
  { name: 'maxtoken', skipOnError: false }
];

// 可选 transformers 跳过错误
const optionalSpecs = [
  { name: 'cleancache', skipOnError: true }
];
```

## 故障排查

### 查看执行的 Transformers

```typescript
const result = await pipeline.executeRequest(request, specs);
console.log('Applied transformers:', result.metadata.appliedTransformers);
console.log('Skipped transformers:', result.metadata.skippedTransformers);
```

### 检查错误

```typescript
if (result.metadata.errors.length > 0) {
  console.error('Transformer errors:', result.metadata.errors);
}
```

### 启用调试日志

在 transformer 中添加日志输出：

```typescript
class MyTransformer extends BaseTransformer {
  async transformRequest(request: any) {
    console.log('🔍 MyTransformer input:', request);
    const result = { body: /* ... */ };
    console.log('✅ MyTransformer output:', result);
    return result;
  }
}
```

## 相关文档

- [Transformer 基础](./transformers.md)
- [自定义 Transformer 开发](./custom-transformers.md)
- [API 格式转换](./api-formats.md)
