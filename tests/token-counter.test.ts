import { describe, test, expect } from 'bun:test';
import {
  ClaudeTokenCounter,
  OpenAITokenCounter,
  TokenCounterManager,
  countTokens,
  estimateMessageTokens,
} from '../src/core/token-counter';

describe('ClaudeTokenCounter', () => {
  const counter = new ClaudeTokenCounter();

  test('should count tokens for simple text', () => {
    const text = 'Hello, world!';
    const tokens = counter.countTokens(text);

    // "Hello, world!" should be ~4-5 tokens
    expect(tokens).toBeGreaterThan(2);
    expect(tokens).toBeLessThan(10);
  });

  test('should handle longer text', () => {
    const text = 'The quick brown fox jumps over the lazy dog. This is a test sentence with multiple words.';
    const tokens = counter.countTokens(text);

    // Should be roughly 20-30 tokens
    expect(tokens).toBeGreaterThan(15);
    expect(tokens).toBeLessThan(40);
  });

  test('should handle text with punctuation', () => {
    const text = 'Hello! How are you? I am fine, thank you.';
    const tokens = counter.countTokens(text);

    // Punctuation adds tokens
    expect(tokens).toBeGreaterThan(5);
  });

  test('should estimate message tokens', () => {
    const messages = [
      {
        role: 'user' as const,
        content: 'Hello, how are you?',
      },
      {
        role: 'assistant' as const,
        content: 'I am doing well, thank you for asking!',
      },
    ];

    const estimate = counter.estimateMessages(messages);

    expect(estimate.inputTokens).toBeGreaterThan(10);
    expect(estimate.breakdown).toBeDefined();
  });

  test('should handle messages with content blocks', () => {
    const messages = [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: 'What is in this image?',
          },
          {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: 'image/png' as const,
              data: 'abc123',
            },
          },
        ],
      },
    ];

    const estimate = counter.estimateMessages(messages);

    // Should include text tokens + image tokens (~1500)
    expect(estimate.inputTokens).toBeGreaterThan(1500);
  });
});

describe('OpenAITokenCounter', () => {
  const counter = new OpenAITokenCounter();

  test('should count tokens for simple text', () => {
    const text = 'Hello, world!';
    const tokens = counter.countTokens(text);

    // Should be ~3-5 tokens
    expect(tokens).toBeGreaterThan(2);
    expect(tokens).toBeLessThan(10);
  });

  test('should handle numbers', () => {
    const text = 'The answer is 42 and the year is 2024.';
    const tokens = counter.countTokens(text);

    // Numbers should be counted accurately
    expect(tokens).toBeGreaterThan(5);
  });

  test('should estimate message tokens with overhead', () => {
    const messages = [
      {
        role: 'user' as const,
        content: 'Hello!',
      },
    ];

    const estimate = counter.estimateMessages(messages);

    // Should include message overhead (3 + 1 per message + 3 final)
    expect(estimate.inputTokens).toBeGreaterThan(5);
  });
});

describe('TokenCounterManager', () => {
  const manager = new TokenCounterManager();

  test('should get Claude counter for Claude models', () => {
    const counter = manager.getCounter('claude-opus-4-20250514');
    expect(counter.name).toBe('claude');
  });

  test('should get OpenAI counter for GPT models', () => {
    const counter = manager.getCounter('gpt-4-turbo');
    expect(counter.name).toBe('openai');
  });

  test('should use default counter for unknown models', () => {
    const counter = manager.getCounter('unknown-model');
    expect(counter.name).toBe('claude'); // Default
  });

  test('should count tokens with model specification', () => {
    const tokens = manager.countTokens('Hello, world!', 'claude-sonnet-4-20250514');
    expect(tokens).toBeGreaterThan(0);
  });

  test('should estimate message tokens with model', () => {
    const messages = [
      {
        role: 'user' as const,
        content: 'Test message',
      },
    ];

    const estimate = manager.estimateMessages(messages, 'gpt-4');
    expect(estimate.inputTokens).toBeGreaterThan(0);
  });
});

describe('Helper Functions', () => {
  test('countTokens should work', () => {
    const tokens = countTokens('Hello, world!');
    expect(tokens).toBeGreaterThan(0);
  });

  test('countTokens should accept model parameter', () => {
    const tokens = countTokens('Hello, world!', 'gpt-4');
    expect(tokens).toBeGreaterThan(0);
  });

  test('estimateMessageTokens should work', () => {
    const messages = [
      {
        role: 'user' as const,
        content: 'Hello!',
      },
    ];

    const tokens = estimateMessageTokens(messages);
    expect(tokens).toBeGreaterThan(0);
  });

  test('estimateMessageTokens should accept model parameter', () => {
    const messages = [
      {
        role: 'user' as const,
        content: 'Hello!',
      },
    ];

    const tokens = estimateMessageTokens(messages, 'gpt-4');
    expect(tokens).toBeGreaterThan(0);
  });
});

describe('Token Estimation Accuracy', () => {
  test('Claude counter should estimate ~3.5 chars/token', () => {
    const counter = new ClaudeTokenCounter();

    // 350 character text should be roughly 100 tokens
    const text = 'a'.repeat(350);
    const tokens = counter.countTokens(text);

    // Allow 20% margin of error
    expect(tokens).toBeGreaterThan(80);
    expect(tokens).toBeLessThan(120);
  });

  test('OpenAI counter should estimate ~4 chars/token', () => {
    const counter = new OpenAITokenCounter();

    // 400 character text should be roughly 100 tokens
    const text = 'a'.repeat(400);
    const tokens = counter.countTokens(text);

    // Allow 20% margin of error
    expect(tokens).toBeGreaterThan(80);
    expect(tokens).toBeLessThan(120);
  });

  test('should handle empty text', () => {
    const tokens = countTokens('');
    expect(tokens).toBe(0);
  });

  test('should handle whitespace-only text', () => {
    const tokens = countTokens('   \n\t  ');
    expect(tokens).toBeGreaterThanOrEqual(0);
    expect(tokens).toBeLessThan(10);
  });
});

describe('Real-world Examples', () => {
  test('should estimate tokens for typical user message', () => {
    const messages = [
      {
        role: 'user' as const,
        content:
          'Can you help me write a Python function that calculates the Fibonacci sequence up to n terms?',
      },
    ];

    const tokens = estimateMessageTokens(messages, 'claude-sonnet-4-20250514');

    // Typical short question: 15-30 tokens
    expect(tokens).toBeGreaterThan(10);
    expect(tokens).toBeLessThan(50);
  });

  test('should estimate tokens for long context', () => {
    const longContent = `
      Here is a comprehensive guide to understanding machine learning algorithms.
      Machine learning is a subset of artificial intelligence that focuses on building systems
      that can learn from and make decisions based on data. There are three main types of
      machine learning: supervised learning, unsupervised learning, and reinforcement learning.

      Supervised learning involves training a model on labeled data, where each example is
      paired with the correct answer. The model learns to map inputs to outputs by finding
      patterns in the training data. Common supervised learning algorithms include linear
      regression, logistic regression, decision trees, random forests, and neural networks.

      Unsupervised learning, on the other hand, works with unlabeled data. The goal is to
      discover hidden patterns or structures in the data without explicit guidance. Clustering
      algorithms like K-means and hierarchical clustering are examples of unsupervised learning.

      Reinforcement learning is a type of machine learning where an agent learns to make
      decisions by interacting with an environment. The agent receives rewards or penalties
      based on its actions and learns to maximize cumulative rewards over time.
    `.repeat(10); // Repeat to create long context

    const messages = [
      {
        role: 'user' as const,
        content: longContent,
      },
    ];

    const tokens = estimateMessageTokens(messages, 'claude-opus-4-20250514');

    // Should estimate several thousand tokens
    expect(tokens).toBeGreaterThan(3000);
  });

  test('should estimate tokens for multi-turn conversation', () => {
    const messages = [
      {
        role: 'user' as const,
        content: 'What is the capital of France?',
      },
      {
        role: 'assistant' as const,
        content: 'The capital of France is Paris.',
      },
      {
        role: 'user' as const,
        content: 'What is its population?',
      },
      {
        role: 'assistant' as const,
        content:
          'Paris has a population of approximately 2.2 million people within the city limits, and about 12 million in the greater metropolitan area.',
      },
    ];

    const tokens = estimateMessageTokens(messages, 'gpt-4');

    // Multi-turn conversation with overhead
    expect(tokens).toBeGreaterThan(30);
    expect(tokens).toBeLessThan(100);
  });
});
