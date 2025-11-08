/**
 * 加密服务 - 管理敏感数据的加密和解密
 * Encryption Service - Manage encryption and decryption of sensitive data
 */

import { encryptApiKey as encrypt, decryptApiKey as decrypt } from '../utils/encryption';
import { logger } from '../utils/logger';

export class EncryptionService {
  private static instance: EncryptionService;
  private masterPassword: string;
  private enabled: boolean;

  private constructor() {
    this.masterPassword = process.env.MASTER_PASSWORD || '';
    this.enabled = !!this.masterPassword && this.masterPassword.length >= 32;

    if (!this.enabled) {
      logger.warn('⚠️  Encryption disabled: MASTER_PASSWORD not set or too short (min 32 chars)');
    } else {
      logger.info('🔐 Encryption enabled for sensitive data');
    }
  }

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * 加密 API Key
   * Encrypt API key
   */
  encryptApiKey(apiKey: string): string {
    if (!this.enabled) {
      return apiKey; // 如果加密未启用，返回原始值
    }

    try {
      return encrypt(apiKey);
    } catch (error) {
      logger.error({ error }, '❌ Failed to encrypt API key');
      throw new Error('Failed to encrypt API key');
    }
  }

  /**
   * 解密 API Key
   * Decrypt API key
   */
  decryptApiKey(encryptedApiKey: string): string {
    if (!this.enabled) {
      return encryptedApiKey; // 如果加密未启用，返回原始值
    }

    try {
      return decrypt(encryptedApiKey);
    } catch (error) {
      logger.error({ error }, '❌ Failed to decrypt API key');
      throw new Error('Failed to decrypt API key');
    }
  }

  /**
   * 检查加密是否启用
   * Check if encryption is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 批量加密 API Keys
   * Batch encrypt API keys
   */
  encryptBatch(apiKeys: string[]): string[] {
    return apiKeys.map((key) => this.encryptApiKey(key));
  }

  /**
   * 批量解密 API Keys
   * Batch decrypt API keys
   */
  decryptBatch(encryptedKeys: string[]): string[] {
    return encryptedKeys.map((key) => this.decryptApiKey(key));
  }

  /**
   * 加密 Refresh Token
   * Encrypt refresh token
   */
  encryptRefreshToken(token: string): string {
    return this.encryptApiKey(token); // 使用相同的加密方法
  }

  /**
   * 解密 Refresh Token
   * Decrypt refresh token
   */
  decryptRefreshToken(encryptedToken: string): string {
    return this.decryptApiKey(encryptedToken); // 使用相同的解密方法
  }
}
