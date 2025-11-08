/**
 *
 * Encryption Service - Manage encryption and decryption of sensitive data
 */

import { encrypt, decrypt } from '../utils/encryption';
import { logger } from '../utils/logger';

export class EncryptionService {
  private static instance: EncryptionService;
  private masterPassword: string;
  private enabled: boolean;

  private constructor {
    this.masterPassword = process.env.MASTER_PASSWORD || '';
    this.enabled = !!this.masterPassword && this.masterPassword.length >= 32;

    if (!this.enabled) {
      logger.warn('⚠️  Encryption disabled: MASTER_PASSWORD not set or too short (min 32 chars)');
    } else {
      logger.info('🔐 Encryption enabled for sensitive data');
    }
  }

  static getInstance: EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService;
    }
    return EncryptionService.instance;
  }

  /**
   *  API Key
   * Encrypt API key
   */
  encryptApiKey(apiKey: string): string {
    if (!this.enabled) {
      return apiKey; // 
    }

    try {
      return encrypt(apiKey, this.masterPassword);
    } catch (error) {
      logger.error({ error }, '❌ Failed to encrypt API key');
      throw new Error('Failed to encrypt API key');
    }
  }

  /**
   *  API Key
   * Decrypt API key
   */
  decryptApiKey(encryptedApiKey: string): string {
    if (!this.enabled) {
      return encryptedApiKey; // 
    }

    try {
      return decrypt(encryptedApiKey, this.masterPassword);
    } catch (error) {
      logger.error({ error }, '❌ Failed to decrypt API key');
      throw new Error('Failed to decrypt API key');
    }
  }

  /**
   * 
   * Check if encryption is enabled
   */
  isEnabled: boolean {
    return this.enabled;
  }

  /**
   *  API Keys
   * Batch encrypt API keys
   */
  encryptBatch(apiKeys: string): string {
    return apiKeys.map((key) => this.encryptApiKey(key));
  }

  /**
   *  API Keys
   * Batch decrypt API keys
   */
  decryptBatch(encryptedKeys: string): string {
    return encryptedKeys.map((key) => this.decryptApiKey(key));
  }

  /**
   *  Refresh Token
   * Encrypt refresh token
   */
  encryptRefreshToken(token: string): string {
    return this.encryptApiKey(token); // 
  }

  /**
   *  Refresh Token
   * Decrypt refresh token
   */
  decryptRefreshToken(encryptedToken: string): string {
    return this.decryptApiKey(encryptedToken); // 
  }
}
