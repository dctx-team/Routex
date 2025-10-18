/**
 * Content Analyzer for Smart Routing
 * 
 *
 * Provides advanced content analysis for intelligent request routing
 */

import type { Message, Tool } from '../../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Content analysis result
 * 
 */
export interface ContentAnalysis {
  // Basic metrics
  // 
  wordCount: number;
  characterCount: number;
  estimatedTokens: number;

  // Content features
  // 
  hasCode: boolean;
  hasUrls: boolean;
  hasImages: boolean;
  hasTools: boolean;
  languages: string; // Programming languages detected

  // Content type classification
  // 
  topic?: string;
  category?: ContentCategory;
  complexity?: ComplexityLevel;

  // Intent detection
  // 
  intent?: RequestIntent;
  keywords: string;
}

export type ContentCategory =
  | 'coding'
  | 'writing'
  | 'analysis'
  | 'conversation'
  | 'research'
  | 'creative'
  | 'technical'
  | 'general';

export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'very_complex';

export type RequestIntent =
  | 'question'
  | 'task'
  | 'generation'
  | 'analysis'
  | 'conversation'
  | 'review'
  | 'debug';

// ============================================================================
// Content Analyzer
// ============================================================================

export class ContentAnalyzer {
  /**
   * Analyze message content
   * 
   */
  analyze(messages: Message, tools?: Tool): ContentAnalysis {
    const fullText = this.extractAllText(messages);

    return {
      // Basic metrics
      wordCount: this.countWords(fullText),
      characterCount: fullText.length,
      estimatedTokens: Math.ceil(fullText.length / 4), // Rough estimate

      // Features
      hasCode: this.detectCode(fullText),
      hasUrls: this.detectUrls(fullText),
      hasImages: this.detectImages(messages),
      hasTools: tools ? tools.length > 0 : false,
      languages: this.detectLanguages(fullText),

      // Classification
      topic: this.detectTopic(fullText),
      category: this.classifyContent(fullText, messages, tools),
      complexity: this.assessComplexity(fullText, messages),

      // Intent
      intent: this.detectIntent(fullText, messages),
      keywords: this.extractKeywords(fullText),
    };
  }

  /**
   * Extract all text from messages
   * 
   */
  private extractAllText(messages: Message): string {
    const parts: string = ;

    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        parts.push(msg.content);
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text' && block.text) {
            parts.push(block.text);
          }
        }
      }
    }

    return parts.join('\n');
  }

  /**
   * Count words in text
   * 
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Detect code blocks and inline code
   * 
   */
  private detectCode(text: string): boolean {
    // Check for code blocks (``` or ~~~)
    if (/```[\s\S]*?```/.test(text) || /~~~[\s\S]*?~~~/.test(text)) {
      return true;
    }

    // Check for inline code (`code`)
    if (/`[^`]+`/.test(text)) {
      return true;
    }

    // Check for common code patterns
    const codePatterns = [
      /function\s+\w+\s*\(/,
      /class\s+\w+/,
      /import\s+.+from/,
      /const\s+\w+\s*=/,
      /def\s+\w+\s*\(/,
      /public\s+class/,
      /<\/?[a-z][\s\S]*>/i, // HTML tags
    ];

    return codePatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Detect URLs
   *  URL
   */
  private detectUrls(text: string): boolean {
    const urlPattern = /https?:\/\/[^\s]+/gi;
    return urlPattern.test(text);
  }

  /**
   * Detect images in messages
   * 
   */
  private detectImages(messages: Message): boolean {
    for (const msg of messages) {
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'image') {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Detect programming languages
   * 
   */
  private detectLanguages(text: string): string {
    const languages: string = ;
    const langPatterns: Record<string, RegExp> = {
      javascript: [/javascript/i, /\.js\b/, /node\.js/i, /npm/i, /const\s+\w+\s*=/],
      typescript: [/typescript/i, /\.ts\b/, /interface\s+\w+/, /type\s+\w+\s*=/],
      python: [/python/i, /\.py\b/, /def\s+\w+\s*\(/, /import\s+\w+/, /pip install/i],
      java: [/java\b/i, /\.java\b/, /public\s+class/, /System\.out/],
      go: [/golang/i, /\.go\b/, /func\s+\w+/, /package\s+main/],
      rust: [/rust\b/i, /\.rs\b/, /fn\s+\w+/, /cargo/i],
      cpp: [/c\+\+/i, /\.cpp\b/, /\.h\b/, /#include/, /std::/],
      csharp: [/c#/i, /\.cs\b/, /namespace\s+\w+/, /using\s+System/],
      ruby: [/ruby/i, /\.rb\b/, /def\s+\w+$/, /gem install/i],
      php: [/php/i, /\.php\b/, /<\?php/, /\$\w+\s*=/],
      swift: [/swift/i, /\.swift\b/, /func\s+\w+/, /var\s+\w+:\s*\w+/],
      kotlin: [/kotlin/i, /\.kt\b/, /fun\s+\w+/],
    };

    for (const [lang, patterns] of Object.entries(langPatterns)) {
      if (patterns.some((pattern) => pattern.test(text))) {
        languages.push(lang);
      }
    }

    return languages;
  }

  /**
   * Detect main topic
   * 
   */
  private detectTopic(text: string): string | undefined {
    const topics: Record<string, string> = {
      'API Development': ['api', 'endpoint', 'rest', 'graphql', 'http', 'request'],
      'Database': ['database', 'sql', 'query', 'table', 'schema', 'migration'],
      'Frontend': ['react', 'vue', 'angular', 'component', 'ui', 'css', 'html'],
      'Backend': ['server', 'backend', 'nodejs', 'express', 'django', 'flask'],
      'DevOps': ['docker', 'kubernetes', 'ci/cd', 'deployment', 'pipeline'],
      'Machine Learning': ['ml', 'model', 'training', 'neural', 'dataset', 'tensorflow'],
      'Testing': ['test', 'unit test', 'integration', 'e2e', 'jest', 'pytest'],
      'Security': ['security', 'auth', 'encryption', 'vulnerability', 'xss', 'csrf'],
      'Performance': ['performance', 'optimization', 'cache', 'latency', 'throughput'],
      'Documentation': ['document', 'readme', 'guide', 'tutorial', 'explanation'],
    };

    const lowerText = text.toLowerCase;
    let maxScore = 0;
    let detectedTopic: string | undefined;

    for (const [topic, keywords] of Object.entries(topics)) {
      let score = 0;
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowerText.match(regex);
        if (matches) {
          score += matches.length;
        }
      }

      if (score > maxScore) {
        maxScore = score;
        detectedTopic = topic;
      }
    }

    return maxScore > 0 ? detectedTopic : undefined;
  }

  /**
   * Classify content category
   * 
   */
  private classifyContent(
    text: string,
    messages: Message,
    tools?: Tool
  ): ContentCategory {
    const lowerText = text.toLowerCase;

    // Coding
    if (this.detectCode(text) || this.detectLanguages(text).length > 0) {
      return 'coding';
    }

    // Technical
    if (
      /\b(algorithm|architecture|system|design|infrastructure)\b/i.test(text) ||
      tools
    ) {
      return 'technical';
    }

    // Writing
    if (
      /\b(write|essay|article|blog|story|letter|email)\b/i.test(text) &&
      !this.detectCode(text)
    ) {
      return 'writing';
    }

    // Analysis
    if (/\b(analyze|analysis|compare|evaluate|assess|review)\b/i.test(text)) {
      return 'analysis';
    }

    // Research
    if (/\b(research|study|investigate|explore|learn about)\b/i.test(text)) {
      return 'research';
    }

    // Creative
    if (/\b(creative|imagine|brainstorm|idea|concept)\b/i.test(text)) {
      return 'creative';
    }

    // Conversation (short messages)
    if (this.countWords(text) < 50 && messages.length > 2) {
      return 'conversation';
    }

    return 'general';
  }

  /**
   * Assess content complexity
   * 
   */
  private assessComplexity(text: string, messages: Message): ComplexityLevel {
    const wordCount = this.countWords(text);
    const hasCode = this.detectCode(text);
    const messageCount = messages.length;
    const avgWordsPerMessage = wordCount / Math.max(messageCount, 1);

    // Very complex: long context with code
    if (wordCount > 2000 || (hasCode && wordCount > 500)) {
      return 'very_complex';
    }

    // Complex: medium length with technical content
    if (wordCount > 500 || (hasCode && wordCount > 200) || messageCount > 10) {
      return 'complex';
    }

    // Moderate: average length
    if (wordCount > 100 || messageCount > 3) {
      return 'moderate';
    }

    // Simple: short and straightforward
    return 'simple';
  }

  /**
   * Detect user intent
   * 
   */
  private detectIntent(text: string, messages: Message): RequestIntent {
    const lowerText = text.toLowerCase;
    const lastUserMessage = this.getLastUserMessage(messages);

    // Question (ends with ?)
    if (lastUserMessage.endsWith('?') || /\b(what|how|why|when|where|who)\b/i.test(text)) {
      return 'question';
    }

    // Task (imperative verbs)
    if (
      /\b(create|build|implement|write|make|generate|add|fix|update|refactor)\b/i.test(
        text
      )
    ) {
      return 'task';
    }

    // Generation
    if (/\b(generate|create|write|produce)\b/i.test(text)) {
      return 'generation';
    }

    // Analysis
    if (/\b(analyze|review|check|examine|inspect|investigate)\b/i.test(text)) {
      return 'analysis';
    }

    // Review
    if (/\b(review|feedback|opinion|thoughts|looks good|lgtm)\b/i.test(text)) {
      return 'review';
    }

    // Debug
    if (/\b(debug|error|bug|issue|problem|not working|broken)\b/i.test(text)) {
      return 'debug';
    }

    // Conversation (short, casual)
    if (this.countWords(text) < 20) {
      return 'conversation';
    }

    return 'task';
  }

  /**
   * Get last user message
   * 
   */
  private getLastUserMessage(messages: Message): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        const content = messages[i].content;
        if (typeof content === 'string') {
          return content;
        } else if (Array.isArray(content)) {
          const textBlocks = content.filter((b) => b.type === 'text');
          if (textBlocks.length > 0) {
            return textBlocks.map((b) => (b as any).text).join(' ');
          }
        }
      }
    }
    return '';
  }

  /**
   * Extract important keywords
   * 
   */
  private extractKeywords(text: string): string {
    const lowerText = text.toLowerCase;

    // Common stop words to filter out
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'been',
      'be',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'this',
      'that',
      'these',
      'those',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'my',
      'your',
      'his',
      'her',
      'its',
      'our',
      'their',
    ]);

    // Extract words
    const words = lowerText
      .split(/\s+/)
      .map((w) => w.replace(/[^\w]/g, ''))
      .filter((w) => w.length > 3 && !stopWords.has(w));

    // Count frequency
    const frequency: Record<string, number> = {};
    for (const word of words) {
      frequency[word] = (frequency[word] || 0) + 1;
    }

    // Sort by frequency and take top 10
    const keywords = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    return keywords;
  }
}
