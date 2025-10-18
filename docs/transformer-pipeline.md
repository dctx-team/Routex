# Transformer Pipeline System

Routex  Transformer 

## 📖 

- (#)
- [ Transformers](#-transformers)
- [Pipeline ](#pipeline-)
- [ Transformers](#-transformers)
- (#)
- [API ](#api-)

## 

Transformer Pipeline  API 

### 

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

##  Transformers

### 1. MaxToken Transformer

 token 

****
```typescript
{
  name: 'maxtoken',
  options: {
    maxTokens: 4096,        //  tokens 
    defaultMaxTokens: 1024, // 
    enforceStrict: false    // 
  }
}
```

****
```json
{
  transformers: {
    use: [
      [maxtoken, { maxTokens: 2048, enforceStrict: true }]
    ]
  }
}
```

### 2. Sampling Transformer

temperaturetop_ptop_k

****
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
    enforceDefaults: false  // 
  }
}
```

****
```json
{
  transformers: {
    use: [
      [sampling, {
        temperature: { min: 0, max: 1.5, default: 0.7 },
        topP: { default: 0.9 }
      }]
    ]
  }
}
```

### 3. CleanCache Transformer

****
```typescript
{
  name: 'cleancache',
  options: {
    removeMetadata: true,   // 
    removeCache: true,      // 
    removeInternal: true,   // 
    customFields:         // 
  }
}
```

****
```json
{
  transformers: {
    use: [
      [cleancache, {
        customFields: [debug_info, trace_id]
      }]
    ]
  }
}
```

## Pipeline 

Routex  transformer 

### 1. Safe

 token 

```typescript
{
  transformers: [
    { name: 'maxtoken', options: { maxTokens: 4096 } },
    { name: 'cleancache' }
  ]
}
```

**** 

### 2. Strict

```typescript
{
  transformers: [
    { name: 'maxtoken', options: { maxTokens: 2048, enforceStrict: true } },
    { name: 'sampling', options: { enforceDefaults: true } },
    { name: 'cleancache' }
  ]
}
```

**** 

### 3. Balanced

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

**** 

### 4. Quality

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

**** 

##  Transformers

 transformers 

### 

```typescript
import { TransformerPipeline, Conditions } from './transformers';

const pipeline = new TransformerPipeline(transformerManager);

//  GPT-4  maxtoken
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

### 

#### modelMatches

```typescript
Conditions.modelMatches('claude-3-opus')
Conditions.modelMatches(/gpt-4/)
```

#### channelTypeIs

```typescript
Conditions.channelTypeIs('anthropic')
Conditions.channelTypeIs('openai')
```

#### hasField

```typescript
Conditions.hasField('tools')
Conditions.hasField('messages.0.content')
```

#### 

```typescript
// AND: 
Conditions.and(
  Conditions.modelMatches(/gpt-4/),
  Conditions.hasField('tools')
)

// OR: 
Conditions.or(
  Conditions.channelTypeIs('openai'),
  Conditions.channelTypeIs('azure')
)

// NOT: 
Conditions.not(
  Conditions.hasField('stream')
)
```

### 

```typescript
const customCondition: TransformerCondition = (data, context) => {
  // 
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

## 

### 1. 

 `skipOnError` 

```typescript
const specs = [
  {
    name: 'maxtoken',
    skipOnError: true  //  transformers
  }
];

const result = await pipeline.executeRequest(request, specs);

// 
console.log('Applied:', result.metadata.appliedTransformers);
console.log('Skipped:', result.metadata.skippedTransformers);
console.log('Errors:', result.metadata.errors);
```

### 2. Pipeline 

```typescript
const pipeline = new TransformerPipeline(transformerManager);

//  safe  transformers
const customPipeline = [
  ...pipeline.composePresets('safe'),
  {
    name: 'sampling',
    options: { temperature: { default: 0.8 } }
  }
];

const result = await pipeline.executeRequest(request, customPipeline);
```

### 3. 

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

// 
const result = await pipeline.executePreset(request, 'my-custom');
```

### 4.  Transformers

 transformers

```json
{
  id: channel-1,
  name: OpenAI,
  type: openai,
  transformers: {
    use: [
      cleancache
    ],
    gpt-4: {
      use: [
        [maxtoken, { maxTokens: 8192 }]
      ]
    },
    gpt-3.5-turbo: {
      use: [
        [maxtoken, { maxTokens: 4096 }]
      ]
    }
  }
}
```

### 5. 

Transformers 

```typescript
class ResponseFilterTransformer extends BaseTransformer {
  name = 'response-filter';

  async transformResponse(response: any): Promise<any> {
    // 
    if (response.choices) {
      response.choices = response.choices.filter(
        choice => choice.finish_reason === 'stop'
      );
    }
    return response;
  }
}
```

## API 

### TransformerPipeline

#### 

```typescript
new TransformerPipeline(transformerManager: TransformerManager)
```

#### 

##### executeRequest

```typescript
async executeRequest(
  request: any,
  specs: ConditionalTransformerSpec,
  context?: PipelineContext
): Promise<PipelineResult>
```

##### executeResponse

```typescript
async executeResponse(
  response: any,
  specs: ConditionalTransformerSpec,
  context?: PipelineContext
): Promise<PipelineResult>
```

##### executePreset

```typescript
async executePreset(
  request: any,
  presetName: string,
  context?: PipelineContext
): Promise<PipelineResult>
```

##### registerPreset

```typescript
registerPreset(preset: PipelinePreset): void
```

##### getPreset

```typescript
getPreset(name: string): PipelinePreset | undefined
```

##### listPresets

```typescript
listPresets: PipelinePreset
```

##### composePresets

```typescript
composePresets(...presetNames: string): ConditionalTransformerSpec
```

### 

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
    appliedTransformers: string;
    skippedTransformers: string;
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

## 

### 1. 

```json
{
  transformers: {
    use: [
      [maxtoken, { maxTokens: 4096, enforceStrict: true }],
      [sampling, {
        temperature: { min: 0, max: 1.5 },
        enforceDefaults: false
      }],
      cleancache
    ]
  }
}
```

### 2. 

```json
{
  transformers: {
    use: [
      [maxtoken, { maxTokens: 8192 }]
    ]
  }
}
```

### 3. 

```json
{
  transformers: {
    use: [
      [maxtoken, { maxTokens: 2048, defaultMaxTokens: 512 }],
      [sampling, { enforceDefaults: true }],
      cleancache
    ]
  }
}
```

### 4. 

```typescript
//  transformers 
const criticalSpecs = [
  { name: 'maxtoken', skipOnError: false }
];

//  transformers 
const optionalSpecs = [
  { name: 'cleancache', skipOnError: true }
];
```

## 

###  Transformers

```typescript
const result = await pipeline.executeRequest(request, specs);
console.log('Applied transformers:', result.metadata.appliedTransformers);
console.log('Skipped transformers:', result.metadata.skippedTransformers);
```

### 

```typescript
if (result.metadata.errors.length > 0) {
  console.error('Transformer errors:', result.metadata.errors);
}
```

### 

 transformer 

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

## 

- [Transformer ](./transformers.md)
- [ Transformer ](./custom-transformers.md)
- [API ](./api-formats.md)
