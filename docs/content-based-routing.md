# Content-Based Smart Routing

Routex 

## 📖 

- (#)
- (#)
- (#)
- (#)
- (#)
- [API ](#api-)

## 

Content-Based Routing  AI 

### 

- ****
- ****
- ****
- ****
- ****

## 

ContentAnalyzer 

### 

```typescript
{
  wordCount: 450,           // 
  characterCount: 2800,     // 
  estimatedTokens: 700      //  token 
}
```

### 

```typescript
{
  hasCode: true,                    // 
  hasUrls: false,                   //  URL
  hasImages: false,                 // 
  hasTools: true,                   //  tools
  languages: ['python', 'javascript'] // 
}
```

### 

```typescript
{
  category: 'coding',               // 
  complexity: 'complex',            // 
  intent: 'task',                   // 
  topic: 'API Development',         // 
  keywords: ['api', 'endpoint', 'rest', 'python']
}
```

### 

####  (ContentCategory)

- `coding`
- `writing`
- `analysis`
- `conversation`
- `research`
- `creative`
- `technical`
- `general`
####  (ComplexityLevel)

- `simple` - < 100 
- `moderate` - 100-500 
- `complex` - 500-2000 
- `very_complex` - > 2000 

####  (RequestIntent)

- `question`
- `task`
- `generation`
- `analysis`
- `conversation`
- `review` -
- `debug`
## 

### 

```json
{
  condition: {
    tokenThreshold: 60000,
    keywords: [plan, analyze],
    userPattern: .*debug.*,
    modelPattern: ^gpt-4,
    hasTools: true,
    hasImages: false,
    customFunction: myCustomRouter
  }
}
```

### 

#### contentCategory

```json
{
  condition: {
    contentCategory: coding
  },
  targetChannel: coding-optimized-channel
}
```

#### complexityLevel

```json
{
  condition: {
    complexityLevel: very_complex
  },
  targetChannel: high-capacity-channel,
  targetModel: claude-3-opus-20240229
}
```

#### hasCode

```json
{
  condition: {
    hasCode: true
  },
  targetChannel: code-channel
}
```

#### programmingLanguage

```json
{
  condition: {
    programmingLanguage: python
  },
  targetChannel: python-expert-channel
}
```

#### intent

```json
{
  condition: {
    intent: debug
  },
  targetChannel: debugging-channel
}
```

#### 

```json
{
  condition: {
    minWordCount: 500,
    maxWordCount: 2000
  },
  targetChannel: medium-context-channel
}
```

## 

###  1

```json
{
  id: rule-coding,
  name: Coding Tasks,
  type: content,
  condition: {
    contentCategory: coding,
    hasCode: true
  },
  targetChannel: anthropic-coding,
  targetModel: claude-3-5-sonnet-20241022,
  priority: 90,
  enabled: true
}
```

###  2Python 

Python 

```json
{
  id: rule-python,
  name: Python Expert,
  type: content,
  condition: {
    programmingLanguage: python,
    complexity: complex
  },
  targetChannel: python-channel,
  priority: 85,
  enabled: true
}
```

###  3

```json
{
  id: rule-complex,
  name: Complex Tasks,
  type: content,
  condition: {
    complexityLevel: very_complex
  },
  targetChannel: high-perf-channel,
  targetModel: claude-3-opus-20240229,
  priority: 95,
  enabled: true
}
```

###  4

```json
{
  id: rule-debug,
  name: Debugging Assistant,
  type: content,
  condition: {
    intent: debug,
    hasCode: true
  },
  targetChannel: debug-channel,
  priority: 88,
  enabled: true
}
```

###  5

```json
{
  id: rule-advanced,
  name: Advanced Python Development,
  type: content,
  condition: {
    programmingLanguage: python,
    contentCategory: coding,
    minWordCount: 200,
    hasTools: true
  },
  targetChannel: advanced-dev-channel,
  targetModel: claude-3-opus-20240229,
  priority: 100,
  enabled: true
}
```

## 

### 1. 

```
100
90
80
70
```

### 2. 

```javascript
// 
{
  name: Coding Channel,
  type: anthropic,
  models: [claude-3-5-sonnet-20241022, claude-3-opus-20240229],
  // ...  transformers
}

// 
{
  name: Chat Channel,
  type: openai,
  models: [gpt-4-turbo, gpt-3.5-turbo],
  // ...  transformers
}
```

### 3. 

 SmartRouter API 

```typescript
import { SmartRouter } from './core/routing/smart-router';

const router = new SmartRouter(rules);

// 
const analysis = router.analyzeContent(messages, tools);
console.log('Content Analysis:', analysis);

// 
const result = await router.findMatchingChannel(context, availableChannels);
if (result) {
  console.log('Matched Rule:', result.rule?.name);
  console.log('Target Channel:', result.channel.name);
}
```

### 4. 

```javascript
// Phase 1: 
{ contentCategory: 'coding', enabled: true }

// Phase 2: 
{ complexityLevel: 'very_complex', enabled: true }

// Phase 3: 
{ programmingLanguage: 'python', enabled: true }
```

### 5. 

```javascript
// 
'X-Routing-Rule': 'Coding Tasks'
'X-Content-Category': 'coding'
'X-Complexity': 'complex'
```

## 

### 

```typescript
import { SmartRouter, ContentAnalyzer } from './core/routing';

//  router
const router = new SmartRouter(rules);

// 
const analyzer = new ContentAnalyzer;
const analysis = analyzer.analyze(messages, tools);

// 
const channel = router.findChannelByContent(analysis, availableChannels);
if (channel) {
  console.log(`Selected channel: ${channel.name}`);
}
```

### 

 ContentAnalyzer 

```typescript
class CustomAnalyzer extends ContentAnalyzer {
  analyze(messages, tools) {
    const baseAnalysis = super.analyze(messages, tools);

    // 
    const customFeatures = {
      ...baseAnalysis,
      myCustomFeature: this.detectCustomFeature(messages)
    };

    return customFeatures;
  }

  private detectCustomFeature(messages) {
    // 
    return true;
  }
}
```

###  Transformer Pipeline 

 transformer pipeline

```javascript
{
  rules: [
    {
      condition: {
        contentCategory: coding,
        programmingLanguage: python
      },
      targetChannel: python-channel,
      //  transformers
    }
  ],
  channels: [
    {
      id: python-channel,
      name: Python Expert,
      transformers: {
        use: [maxtoken, [sampling, { temperature: { default: 0.3 } }]]
      }
    }
  ]
}
```

## API 

### ContentAnalyzer

#### analyze(messages, tools?)

```typescript
const analyzer = new ContentAnalyzer;
const analysis = analyzer.analyze(messages, tools);
```

****: `ContentAnalysis` 

### SmartRouter

#### analyzeContent(messages, tools?)

```typescript
const router = new SmartRouter(rules);
const analysis = router.analyzeContent(messages, tools);
```

#### findChannelByContent(analysis, availableChannels)

```typescript
const channel = router.findChannelByContent(analysis, availableChannels);
```

#### findMatchingChannel(context, availableChannels)

```typescript
const result = await router.findMatchingChannel(context, availableChannels);
if (result) {
  console.log(result.channel);  // 
  console.log(result.rule);     // 
  console.log(result.analysis); // 
}
```

### ContentAnalysis 

```typescript
interface ContentAnalysis {
  // 
  wordCount: number;
  characterCount: number;
  estimatedTokens: number;

  // 
  hasCode: boolean;
  hasUrls: boolean;
  hasImages: boolean;
  hasTools: boolean;
  languages: string;

  // 
  topic?: string;
  category?: ContentCategory;
  complexity?: ComplexityLevel;
  intent?: RequestIntent;
  keywords: string;
}
```

## 

### 

```typescript
// 
const analysis = router.analyzeContent(messages, tools);
console.log('=== Content Analysis ===');
console.log('Category:', analysis.category);
console.log('Complexity:', analysis.complexity);
console.log('Intent:', analysis.intent);
console.log('Has Code:', analysis.hasCode);
console.log('Languages:', analysis.languages);
console.log('Keywords:', analysis.keywords);
```

### 

```typescript
// 
for (const rule of rules) {
  const matches = await router.matchesRule(rule, context, analysis);
  console.log(`Rule ${rule.name}: ${matches ? 'MATCH' : 'no match'}`);
}
```

### 

#### Q: 

A: 

#### Q: 

A: ContentAnalyzer \`\`\`language

#### Q: 

A:  ContentAnalyzer 

## 

### 

```typescript
const analysisCache = new Map;

function getCachedAnalysis(key, messages, tools) {
  if (!analysisCache.has(key)) {
    analysisCache.set(key, analyzer.analyze(messages, tools));
  }
  return analysisCache.get(key);
}
```

### 

ContentAnalyzer 

1. 
2. 
3. 

## 

- [Smart Router ](./smart-router.md)
- [Transformer Pipeline](./transformer-pipeline.md)
- (./routing-rules.md)
- (./custom-routing.md)
