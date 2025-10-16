# Content-Based Smart Routing

Routex 的基于内容分析的智能路由系统，能够根据请求内容的特征自动选择最合适的渠道和模型。

## 📖 目录

- [概述](#概述)
- [内容分析](#内容分析)
- [路由条件](#路由条件)
- [使用示例](#使用示例)
- [最佳实践](#最佳实践)
- [API 参考](#api-参考)

## 概述

Content-Based Routing 通过分析请求内容的特征（如代码、语言、复杂度、意图等），智能地将请求路由到最适合的 AI 模型。

### 主要特性

- **自动内容分析**：识别代码、编程语言、话题、复杂度
- **智能分类**：将内容分类为编程、写作、分析等类别
- **意图检测**：识别用户意图（提问、任务、生成等）
- **多维度路由**：支持基于内容特征的复杂路由规则
- **高性能**：轻量级分析，对请求延迟影响极小

## 内容分析

ContentAnalyzer 会自动分析每个请求，提取以下信息：

### 基础指标

```typescript
{
  wordCount: 450,           // 单词数
  characterCount: 2800,     // 字符数
  estimatedTokens: 700      // 估算的 token 数
}
```

### 内容特征

```typescript
{
  hasCode: true,                    // 是否包含代码
  hasUrls: false,                   // 是否包含 URL
  hasImages: false,                 // 是否包含图片
  hasTools: true,                   // 是否使用 tools
  languages: ['python', 'javascript'] // 检测到的编程语言
}
```

### 内容分类

```typescript
{
  category: 'coding',               // 内容类别
  complexity: 'complex',            // 复杂度级别
  intent: 'task',                   // 用户意图
  topic: 'API Development',         // 主题
  keywords: ['api', 'endpoint', 'rest', 'python']
}
```

### 支持的分类

#### 内容类别 (ContentCategory)

- `coding` - 编程任务
- `writing` - 写作任务
- `analysis` - 分析任务
- `conversation` - 对话
- `research` - 研究
- `creative` - 创意
- `technical` - 技术
- `general` - 一般

#### 复杂度级别 (ComplexityLevel)

- `simple` - 简单（< 100 词）
- `moderate` - 中等（100-500 词）
- `complex` - 复杂（500-2000 词或包含代码）
- `very_complex` - 非常复杂（> 2000 词或大量代码）

#### 用户意图 (RequestIntent)

- `question` - 提问
- `task` - 执行任务
- `generation` - 生成内容
- `analysis` - 分析内容
- `conversation` - 对话
- `review` - 审查代码/文档
- `debug` - 调试问题

## 路由条件

### 基础条件

这些条件在之前的版本中就已支持：

```json
{
  "condition": {
    "tokenThreshold": 60000,
    "keywords": ["plan", "analyze"],
    "userPattern": ".*debug.*",
    "modelPattern": "^gpt-4",
    "hasTools": true,
    "hasImages": false,
    "customFunction": "myCustomRouter"
  }
}
```

### 内容分析条件

基于内容分析的新增条件：

#### contentCategory

匹配特定的内容类别。

```json
{
  "condition": {
    "contentCategory": "coding"
  },
  "targetChannel": "coding-optimized-channel"
}
```

#### complexityLevel

根据内容复杂度路由。

```json
{
  "condition": {
    "complexityLevel": "very_complex"
  },
  "targetChannel": "high-capacity-channel",
  "targetModel": "claude-3-opus-20240229"
}
```

#### hasCode

检查是否包含代码。

```json
{
  "condition": {
    "hasCode": true
  },
  "targetChannel": "code-channel"
}
```

#### programmingLanguage

匹配特定的编程语言。

```json
{
  "condition": {
    "programmingLanguage": "python"
  },
  "targetChannel": "python-expert-channel"
}
```

#### intent

根据用户意图路由。

```json
{
  "condition": {
    "intent": "debug"
  },
  "targetChannel": "debugging-channel"
}
```

#### 词数范围

基于词数的路由。

```json
{
  "condition": {
    "minWordCount": 500,
    "maxWordCount": 2000
  },
  "targetChannel": "medium-context-channel"
}
```

## 使用示例

### 示例 1：编程任务路由

将所有编程相关的请求路由到特定渠道。

```json
{
  "id": "rule-coding",
  "name": "Coding Tasks",
  "type": "content",
  "condition": {
    "contentCategory": "coding",
    "hasCode": true
  },
  "targetChannel": "anthropic-coding",
  "targetModel": "claude-3-5-sonnet-20241022",
  "priority": 90,
  "enabled": true
}
```

### 示例 2：Python 专家路由

Python 相关问题使用特定模型。

```json
{
  "id": "rule-python",
  "name": "Python Expert",
  "type": "content",
  "condition": {
    "programmingLanguage": "python",
    "complexity": "complex"
  },
  "targetChannel": "python-channel",
  "priority": 85,
  "enabled": true
}
```

### 示例 3：复杂任务路由

复杂任务使用高性能模型。

```json
{
  "id": "rule-complex",
  "name": "Complex Tasks",
  "type": "content",
  "condition": {
    "complexityLevel": "very_complex"
  },
  "targetChannel": "high-perf-channel",
  "targetModel": "claude-3-opus-20240229",
  "priority": 95,
  "enabled": true
}
```

### 示例 4：调试任务路由

调试请求使用专门优化的模型。

```json
{
  "id": "rule-debug",
  "name": "Debugging Assistant",
  "type": "content",
  "condition": {
    "intent": "debug",
    "hasCode": true
  },
  "targetChannel": "debug-channel",
  "priority": 88,
  "enabled": true
}
```

### 示例 5：组合条件

结合多个条件的复杂路由。

```json
{
  "id": "rule-advanced",
  "name": "Advanced Python Development",
  "type": "content",
  "condition": {
    "programmingLanguage": "python",
    "contentCategory": "coding",
    "minWordCount": 200,
    "hasTools": true
  },
  "targetChannel": "advanced-dev-channel",
  "targetModel": "claude-3-opus-20240229",
  "priority": 100,
  "enabled": true
}
```

## 最佳实践

### 1. 优先级设置

按照特定性排序优先级：

```
100 - 非常具体的规则（多个条件组合）
90  - 具体的内容类型规则
80  - 中等特定性规则
70  - 一般性规则
```

### 2. 渠道配置

为不同类型的任务配置专门的渠道：

```javascript
// 编程任务渠道
{
  name: "Coding Channel",
  type: "anthropic",
  models: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"],
  // ... 配置编程相关的 transformers
}

// 对话渠道
{
  name: "Chat Channel",
  type: "openai",
  models: ["gpt-4-turbo", "gpt-3.5-turbo"],
  // ... 配置对话相关的 transformers
}
```

### 3. 测试路由规则

使用 SmartRouter API 测试内容分析：

```typescript
import { SmartRouter } from './core/routing/smart-router';

const router = new SmartRouter(rules);

// 分析内容
const analysis = router.analyzeContent(messages, tools);
console.log('Content Analysis:', analysis);

// 测试路由
const result = await router.findMatchingChannel(context, availableChannels);
if (result) {
  console.log('Matched Rule:', result.rule?.name);
  console.log('Target Channel:', result.channel.name);
}
```

### 4. 渐进式启用

逐步启用内容路由规则：

```javascript
// Phase 1: 只启用明确的规则
{ contentCategory: 'coding', enabled: true }

// Phase 2: 添加复杂度路由
{ complexityLevel: 'very_complex', enabled: true }

// Phase 3: 添加更细粒度的规则
{ programmingLanguage: 'python', enabled: true }
```

### 5. 监控和调整

监控路由效果并调整：

```javascript
// 在响应头中查看路由信息
'X-Routing-Rule': 'Coding Tasks'
'X-Content-Category': 'coding'
'X-Complexity': 'complex'
```

## 高级用法

### 编程方式使用

```typescript
import { SmartRouter, ContentAnalyzer } from './core/routing';

// 创建 router
const router = new SmartRouter(rules);

// 分析内容
const analyzer = new ContentAnalyzer();
const analysis = analyzer.analyze(messages, tools);

// 基于分析结果选择渠道
const channel = router.findChannelByContent(analysis, availableChannels);
if (channel) {
  console.log(`Selected channel: ${channel.name}`);
}
```

### 自定义内容分析

扩展 ContentAnalyzer 以添加自定义分析逻辑：

```typescript
class CustomAnalyzer extends ContentAnalyzer {
  analyze(messages, tools) {
    const baseAnalysis = super.analyze(messages, tools);

    // 添加自定义分析
    const customFeatures = {
      ...baseAnalysis,
      myCustomFeature: this.detectCustomFeature(messages)
    };

    return customFeatures;
  }

  private detectCustomFeature(messages) {
    // 自定义检测逻辑
    return true;
  }
}
```

### 与 Transformer Pipeline 集成

结合内容分析和 transformer pipeline：

```javascript
{
  "rules": [
    {
      "condition": {
        "contentCategory": "coding",
        "programmingLanguage": "python"
      },
      "targetChannel": "python-channel",
      // 可以在渠道级别配置特定的 transformers
    }
  ],
  "channels": [
    {
      "id": "python-channel",
      "name": "Python Expert",
      "transformers": {
        "use": ["maxtoken", ["sampling", { "temperature": { "default": 0.3 } }]]
      }
    }
  ]
}
```

## API 参考

### ContentAnalyzer

#### analyze(messages, tools?)

分析消息内容并返回分析结果。

```typescript
const analyzer = new ContentAnalyzer();
const analysis = analyzer.analyze(messages, tools);
```

**返回**: `ContentAnalysis` 对象

### SmartRouter

#### analyzeContent(messages, tools?)

便捷方法，获取内容分析。

```typescript
const router = new SmartRouter(rules);
const analysis = router.analyzeContent(messages, tools);
```

#### findChannelByContent(analysis, availableChannels)

基于内容分析查找最佳渠道。

```typescript
const channel = router.findChannelByContent(analysis, availableChannels);
```

#### findMatchingChannel(context, availableChannels)

查找匹配的渠道（包含内容分析）。

```typescript
const result = await router.findMatchingChannel(context, availableChannels);
if (result) {
  console.log(result.channel);  // 匹配的渠道
  console.log(result.rule);     // 匹配的规则
  console.log(result.analysis); // 内容分析结果
}
```

### ContentAnalysis 类型

```typescript
interface ContentAnalysis {
  // 基础指标
  wordCount: number;
  characterCount: number;
  estimatedTokens: number;

  // 内容特征
  hasCode: boolean;
  hasUrls: boolean;
  hasImages: boolean;
  hasTools: boolean;
  languages: string[];

  // 分类
  topic?: string;
  category?: ContentCategory;
  complexity?: ComplexityLevel;
  intent?: RequestIntent;
  keywords: string[];
}
```

## 故障排查

### 调试内容分析

```typescript
// 启用详细日志
const analysis = router.analyzeContent(messages, tools);
console.log('=== Content Analysis ===');
console.log('Category:', analysis.category);
console.log('Complexity:', analysis.complexity);
console.log('Intent:', analysis.intent);
console.log('Has Code:', analysis.hasCode);
console.log('Languages:', analysis.languages);
console.log('Keywords:', analysis.keywords);
```

### 验证路由规则

```typescript
// 测试规则是否匹配
for (const rule of rules) {
  const matches = await router.matchesRule(rule, context, analysis);
  console.log(`Rule "${rule.name}": ${matches ? 'MATCH' : 'no match'}`);
}
```

### 常见问题

#### Q: 为什么内容没有被正确分类？

A: 检查消息内容是否包含足够的上下文。内容分析基于关键词和模式匹配，需要一定量的文本才能准确分类。

#### Q: 如何提高编程语言检测的准确性？

A: ContentAnalyzer 会检测代码块、文件扩展名和特定语法模式。确保代码使用代码块格式（\`\`\`language）可以提高准确性。

#### Q: 复杂度评估是如何工作的？

A: 复杂度基于多个因素：词数、是否包含代码、消息数量等。可以通过自定义 ContentAnalyzer 调整评估逻辑。

## 性能考虑

### 缓存分析结果

对于相似的请求，可以缓存内容分析结果：

```typescript
const analysisCache = new Map();

function getCachedAnalysis(key, messages, tools) {
  if (!analysisCache.has(key)) {
    analysisCache.set(key, analyzer.analyze(messages, tools));
  }
  return analysisCache.get(key);
}
```

### 优化检测逻辑

ContentAnalyzer 的检测逻辑已经过优化，通常只需要几毫秒。如果需要进一步优化：

1. 限制分析的消息数量
2. 禁用不需要的检测功能
3. 使用更简单的正则表达式

## 相关文档

- [Smart Router 基础](./smart-router.md)
- [Transformer Pipeline](./transformer-pipeline.md)
- [路由规则配置](./routing-rules.md)
- [自定义路由函数](./custom-routing.md)
