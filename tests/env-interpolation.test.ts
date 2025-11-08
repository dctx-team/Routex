/**
 * 环境变量插值功能测试
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import {
  interpolateEnvVars,
  validateEnvVars,
  extractEnvVars,
  generateEnvExample,
} from '../src/utils/env-interpolation';

describe('环境变量插值', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 重置环境变量
    process.env = { ...originalEnv };
    process.env.TEST_API_KEY = 'sk-test-123';
    process.env.TEST_BASE_URL = 'https://api.test.com';
    process.env.TEST_PORT = '3000';
  });

  afterEach(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
  });

  describe('interpolateEnvVars', () => {
    it('应该替换 ${VAR_NAME} 格式', () => {
      const input = {
        apiKey: '${TEST_API_KEY}',
        baseUrl: '${TEST_BASE_URL}',
      };

      const result = interpolateEnvVars(input);

      expect(result.apiKey).toBe('sk-test-123');
      expect(result.baseUrl).toBe('https://api.test.com');
    });

    it('应该替换 $VAR_NAME 格式', () => {
      const input = {
        apiKey: '$TEST_API_KEY',
        baseUrl: '$TEST_BASE_URL',
      };

      const result = interpolateEnvVars(input);

      expect(result.apiKey).toBe('sk-test-123');
      expect(result.baseUrl).toBe('https://api.test.com');
    });

    it('应该处理嵌套对象', () => {
      const input = {
        provider: {
          auth: {
            apiKey: '${TEST_API_KEY}',
          },
          config: {
            url: '${TEST_BASE_URL}',
          },
        },
      };

      const result = interpolateEnvVars(input);

      expect(result.provider.auth.apiKey).toBe('sk-test-123');
      expect(result.provider.config.url).toBe('https://api.test.com');
    });

    it('应该处理数组', () => {
      const input = {
        channels: [
          { apiKey: '${TEST_API_KEY}' },
          { apiKey: '$TEST_API_KEY' },
        ],
      };

      const result = interpolateEnvVars(input);

      expect(result.channels[0].apiKey).toBe('sk-test-123');
      expect(result.channels[1].apiKey).toBe('sk-test-123');
    });

    it('应该处理字符串中间的变量', () => {
      const input = {
        message: 'API Key: ${TEST_API_KEY}, URL: ${TEST_BASE_URL}',
      };

      const result = interpolateEnvVars(input);

      expect(result.message).toBe('API Key: sk-test-123, URL: https://api.test.com');
    });

    it('应该处理数字类型的环境变量', () => {
      const input = {
        port: '${TEST_PORT}',
      };

      const result = interpolateEnvVars(input);

      expect(result.port).toBe('3000');
    });

    it('未定义的环境变量应该保留原样', () => {
      const input = {
        apiKey: '${UNDEFINED_VAR}',
        url: '$UNDEFINED_VAR',
      };

      const result = interpolateEnvVars(input);

      expect(result.apiKey).toBe('${UNDEFINED_VAR}');
      expect(result.url).toBe('$UNDEFINED_VAR');
    });

    it('应该忽略非环境变量的 $ 符号', () => {
      const input = {
        price: '$100',
        currency: '价格: $100',
      };

      const result = interpolateEnvVars(input);

      expect(result.price).toBe('$100');
      expect(result.currency).toBe('价格: $100');
    });
  });

  describe('validateEnvVars', () => {
    it('应该返回缺失的环境变量', () => {
      const config = {
        apiKey: '${TEST_API_KEY}',
        secret: '${MISSING_SECRET}',
        token: '$MISSING_TOKEN',
      };

      const missing = validateEnvVars(config);

      expect(missing).toEqual(['MISSING_SECRET', 'MISSING_TOKEN']);
    });

    it('所有环境变量都存在时应该返回空数组', () => {
      const config = {
        apiKey: '${TEST_API_KEY}',
        baseUrl: '$TEST_BASE_URL',
      };

      const missing = validateEnvVars(config);

      expect(missing).toEqual([]);
    });

    it('应该处理嵌套配置', () => {
      const config = {
        providers: [
          { key: '${TEST_API_KEY}' },
          { key: '${MISSING_KEY}' },
        ],
      };

      const missing = validateEnvVars(config);

      expect(missing).toEqual(['MISSING_KEY']);
    });
  });

  describe('extractEnvVars', () => {
    it('应该提取所有环境变量名称', () => {
      const config = {
        apiKey: '${TEST_API_KEY}',
        baseUrl: '$TEST_BASE_URL',
        port: '${TEST_PORT}',
        nested: {
          key: '${TEST_API_KEY}', // 重复的应该去重
        },
      };

      const vars = extractEnvVars(config);

      expect(vars).toEqual(['TEST_API_KEY', 'TEST_BASE_URL', 'TEST_PORT']);
    });

    it('空配置应该返回空数组', () => {
      const config = {
        name: 'test',
        value: 123,
      };

      const vars = extractEnvVars(config);

      expect(vars).toEqual([]);
    });
  });

  describe('generateEnvExample', () => {
    it('应该生成 .env 示例文件', () => {
      const config = {
        apiKey: '${TEST_API_KEY}',
        baseUrl: '$TEST_BASE_URL',
      };

      const example = generateEnvExample(config);

      expect(example).toContain('# Routex 环境变量配置');
      expect(example).toContain('TEST_API_KEY=');
      expect(example).toContain('TEST_BASE_URL=');
    });

    it('无环境变量时应该返回提示信息', () => {
      const config = {
        name: 'test',
      };

      const example = generateEnvExample(config);

      expect(example).toContain('当前配置未使用环境变量');
    });
  });

  describe('复杂场景测试', () => {
    it('应该处理完整的 Channel 配置', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.OPENAI_API_KEY = 'sk-openai-test';

      const config = {
        channels: [
          {
            name: 'anthropic',
            type: 'anthropic',
            apiKey: '${ANTHROPIC_API_KEY}',
            baseUrl: 'https://api.anthropic.com',
            models: ['claude-opus-4'],
          },
          {
            name: 'openai',
            type: 'openai',
            apiKey: '$OPENAI_API_KEY',
            baseUrl: 'https://api.openai.com',
            models: ['gpt-4'],
          },
        ],
      };

      const result = interpolateEnvVars(config);

      expect(result.channels[0].apiKey).toBe('sk-ant-test');
      expect(result.channels[1].apiKey).toBe('sk-openai-test');
      expect(result.channels[0].baseUrl).toBe('https://api.anthropic.com');
    });

    it('应该处理混合配置(部分使用环境变量)', () => {
      const config = {
        name: 'production',
        apiKey: '${TEST_API_KEY}',
        port: 3000,
        debug: false,
        baseUrl: 'https://api.test.com',
      };

      const result = interpolateEnvVars(config);

      expect(result.name).toBe('production');
      expect(result.apiKey).toBe('sk-test-123');
      expect(result.port).toBe(3000);
      expect(result.debug).toBe(false);
      expect(result.baseUrl).toBe('https://api.test.com');
    });
  });
});
