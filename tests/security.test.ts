/**
 * Security Tests
 * 安全功能测试
 *
 * 测试加密、签名验证、速率限制等安全功能
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import {
  EncryptionService,
  encryptApiKey,
  decryptApiKey,
  isEncrypted,
  getApiKey,
  maskApiKey,
} from '../src/utils/encryption';
import {
  computeSignature,
  verifySignature,
  generateRequestSignature,
} from '../src/middleware/signature';
import { MemoryStore } from '../src/middleware/rate-limit';

describe('Security Tests', () => {
  describe('Encryption Service', () => {
    let encryptionService: EncryptionService;

    beforeAll(() => {
      encryptionService = new EncryptionService('test-master-password-123');
    });

    test('should encrypt and decrypt text correctly', () => {
      const plaintext = 'sk-ant-api-key-secret-12345';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
    });

    test('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'test-api-key';
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      // 不同的 IV 应该产生不同的密文
      expect(encrypted1).not.toBe(encrypted2);

      // 但都能正确解密
      expect(encryptionService.decrypt(encrypted1)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2)).toBe(plaintext);
    });

    test('should encrypt and decrypt objects', () => {
      const obj = {
        apiKey: 'sk-test-123',
        secretKey: 'secret-456',
        metadata: { user: 'test' },
      };

      const encrypted = encryptionService.encryptObject(obj);
      const decrypted = encryptionService.decryptObject(encrypted);

      expect(decrypted).toEqual(obj);
    });

    test('should throw error on invalid ciphertext', () => {
      expect(() => encryptionService.decrypt('invalid-ciphertext')).toThrow();
      expect(() => encryptionService.decrypt('aa:bb:cc')).toThrow();
    });

    test('should verify encrypted text', () => {
      const plaintext = 'test-data';
      const encrypted = encryptionService.encrypt(plaintext);

      expect(encryptionService.verify(encrypted)).toBe(true);
      expect(encryptionService.verify('invalid')).toBe(false);
    });

    test('should detect encrypted strings', () => {
      const plainApiKey = 'sk-ant-test-123';
      const encryptedApiKey = encryptApiKey(plainApiKey);

      expect(isEncrypted(encryptedApiKey)).toBe(true);
      expect(isEncrypted(plainApiKey)).toBe(false);
      expect(isEncrypted('not-encrypted')).toBe(false);
    });

    test('should get API key (with auto-decrypt)', () => {
      const plainKey = 'sk-ant-plain-123';
      const encryptedKey = encryptApiKey(plainKey);

      expect(getApiKey(plainKey)).toBe(plainKey);
      expect(getApiKey(encryptedKey)).toBe(plainKey);
    });

    test('should mask API keys', () => {
      const apiKey = 'sk-ant-api-key-1234567890';
      const masked4 = maskApiKey(apiKey, 4);
      const masked6 = maskApiKey(apiKey, 6);

      // 检查掩码后的长度和格式
      expect(masked4.length).toBe(apiKey.length);
      expect(masked4.startsWith('sk-a')).toBe(true);
      expect(masked4.endsWith('7890')).toBe(true);
      expect(masked4).toContain('*');

      expect(masked6.length).toBe(apiKey.length);
      expect(masked6.startsWith('sk-ant')).toBe(true);
      expect(masked6.endsWith('567890')).toBe(true);

      expect(maskApiKey('short', 4)).toBe('*****');
    });

    test('should generate salt and password', () => {
      const salt = EncryptionService.generateSalt();
      expect(salt).toMatch(/^[0-9a-f]{64}$/); // 32 字节 = 64 hex 字符

      const password = EncryptionService.generatePassword(32);
      expect(password).toHaveLength(32);
      expect(password).toMatch(/[A-Za-z0-9!@#$%^&*()\-_=+\[\]{}|;:,.<>?]+/);
    });
  });

  describe('Signature Verification', () => {
    const secret = 'test-secret-key-123';

    test('should compute signature correctly', () => {
      const signature = computeSignature(
        'POST',
        '/api/test',
        '{"data":"value"}',
        '1234567890',
        secret
      );

      expect(signature).toBeDefined();
      expect(signature).toMatch(/^[0-9a-f]{64}$/); // SHA256 = 64 hex
    });

    test('should produce same signature for same input', () => {
      const sig1 = computeSignature('GET', '/api/test', '', '12345', secret);
      const sig2 = computeSignature('GET', '/api/test', '', '12345', secret);

      expect(sig1).toBe(sig2);
    });

    test('should produce different signature for different input', () => {
      const sig1 = computeSignature('GET', '/api/test', '', '12345', secret);
      const sig2 = computeSignature('POST', '/api/test', '', '12345', secret);
      const sig3 = computeSignature('GET', '/api/other', '', '12345', secret);
      const sig4 = computeSignature('GET', '/api/test', '', '54321', secret);

      expect(sig1).not.toBe(sig2);
      expect(sig1).not.toBe(sig3);
      expect(sig1).not.toBe(sig4);
    });

    test('should verify valid signature', () => {
      const signature = computeSignature('GET', '/test', '', '123', secret);
      expect(verifySignature(signature, signature)).toBe(true);
    });

    test('should reject invalid signature', () => {
      const validSig = computeSignature('GET', '/test', '', '123', secret);
      const invalidSig = 'invalid-signature';

      expect(verifySignature(invalidSig, validSig)).toBe(false);
    });

    test('should be timing-safe (reject different length)', () => {
      const validSig = computeSignature('GET', '/test', '', '123', secret);
      const shortSig = validSig.substring(0, 32);

      expect(verifySignature(shortSig, validSig)).toBe(false);
    });

    test('should generate request signature', () => {
      const { signature, timestamp } = generateRequestSignature(
        'POST',
        '/api/channels',
        { name: 'test' },
        secret
      );

      expect(signature).toBeDefined();
      expect(signature).toMatch(/^[0-9a-f]{64}$/);
      expect(timestamp).toMatch(/^\d+$/);
      expect(parseInt(timestamp, 10)).toBeGreaterThan(0);
    });

    test('should include headers in signature', () => {
      const headers = {
        'x-api-key': 'test-key',
        'content-type': 'application/json',
      };

      const sig1 = computeSignature('POST', '/test', 'body', '123', secret, headers);
      const sig2 = computeSignature('POST', '/test', 'body', '123', secret, {});

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('Rate Limiter', () => {
    test('should increment hits correctly', async () => {
      const store = new MemoryStore(60000);
      const key = 'test-key';

      const hits1 = await store.increment(key);
      const hits2 = await store.increment(key);
      const hits3 = await store.increment(key);

      expect(hits1).toBe(1);
      expect(hits2).toBe(2);
      expect(hits3).toBe(3);
    });

    test('should reset after window expires', async () => {
      const store = new MemoryStore(100); // 100ms 窗口
      const key = 'test-reset';

      const hits1 = await store.increment(key);
      expect(hits1).toBe(1);

      // 等待窗口过期
      await new Promise(resolve => setTimeout(resolve, 150));

      const hits2 = await store.increment(key);
      expect(hits2).toBe(1); // 应该重置为 1
    });

    test('should handle multiple keys', async () => {
      const store = new MemoryStore(60000);

      await store.increment('key1');
      await store.increment('key1');
      await store.increment('key2');

      const stats = store.getStats();
      expect(stats.totalKeys).toBe(2);

      const key1Stats = stats.keys.find(k => k.key === 'key1');
      const key2Stats = stats.keys.find(k => k.key === 'key2');

      expect(key1Stats?.count).toBe(2);
      expect(key2Stats?.count).toBe(1);
    });

    test('should decrement hits', async () => {
      const store = new MemoryStore(60000);
      const key = 'test-decrement';

      await store.increment(key);
      await store.increment(key);
      await store.increment(key);

      await store.decrement(key);

      const hits = await store.increment(key);
      expect(hits).toBe(3); // 3 - 1 + 1 = 3
    });

    test('should reset specific key', async () => {
      const store = new MemoryStore(60000);

      await store.increment('key1');
      await store.increment('key2');

      await store.resetKey('key1');

      const stats = store.getStats();
      expect(stats.totalKeys).toBe(1);
      expect(stats.keys[0].key).toBe('key2');
    });

    test('should reset all keys', async () => {
      const store = new MemoryStore(60000);

      await store.increment('key1');
      await store.increment('key2');
      await store.increment('key3');

      await store.resetAll();

      const stats = store.getStats();
      expect(stats.totalKeys).toBe(0);
    });

    test('should provide accurate stats', async () => {
      const store = new MemoryStore(60000);

      await store.increment('test');
      await store.increment('test');

      const stats = store.getStats();
      expect(stats.totalKeys).toBe(1);
      expect(stats.keys[0].count).toBe(2);
      expect(stats.keys[0].resetsIn).toBeGreaterThan(0);
      expect(stats.keys[0].resetsIn).toBeLessThanOrEqual(60000);
    });
  });

  describe('Security Integration', () => {
    test('should encrypt API key before storage', () => {
      const apiKey = 'sk-ant-real-api-key-secret';
      const encrypted = encryptApiKey(apiKey);

      // 加密后的密钥不应该包含原始密钥
      expect(encrypted).not.toContain(apiKey);
      expect(encrypted).not.toContain('sk-ant');

      // 应该能正确解密
      expect(decryptApiKey(encrypted)).toBe(apiKey);
    });

    test('should handle signature with encrypted API key', () => {
      const apiKey = 'sk-ant-test-123';
      const encryptedKey = encryptApiKey(apiKey);

      const headers = {
        'x-api-key': encryptedKey,
      };

      const signature = computeSignature(
        'POST',
        '/api/test',
        'body',
        '12345',
        'secret',
        headers
      );

      expect(signature).toBeDefined();
    });

    test('should mask encrypted API keys for logging', () => {
      const apiKey = 'sk-ant-secret-key-1234567890';
      const encrypted = encryptApiKey(apiKey);
      const masked = maskApiKey(encrypted, 8);

      // 掩码后的密钥不应该暴露完整内容
      expect(masked).toContain('*');
      expect(masked.length).toBe(encrypted.length);
    });
  });

  describe('Performance and Security', () => {
    test('should encrypt/decrypt quickly', () => {
      const service = new EncryptionService('test-password');
      const plaintext = 'test-api-key-123';
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const encrypted = service.encrypt(plaintext);
        service.decrypt(encrypted);
      }
      const duration = performance.now() - start;

      console.log(`Encryption/Decryption: ${iterations} iterations in ${duration.toFixed(2)}ms`);

      // 应该在合理时间内完成
      expect(duration).toBeLessThan(1000); // < 1 秒完成 1000 次
    });

    test('should compute signature quickly', () => {
      const secret = 'test-secret';
      const iterations = 10000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        computeSignature('GET', '/test', '', '123', secret);
      }
      const duration = performance.now() - start;

      console.log(`Signature computation: ${iterations} iterations in ${duration.toFixed(2)}ms`);

      // 签名计算应该很快
      expect(duration).toBeLessThan(500); // < 500ms 完成 10k 次
    });

    test('should handle rate limiting efficiently', async () => {
      const store = new MemoryStore(60000);
      const iterations = 10000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        await store.increment(`key-${i % 100}`); // 100 个不同的 key
      }
      const duration = performance.now() - start;

      console.log(`Rate limit increments: ${iterations} iterations in ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(200); // < 200ms 完成 10k 次
    });
  });
});
