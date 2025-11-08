/**
 * Encryption Utility for API Keys
 * API 
 *
 * / API 
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * 
 */
export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
}

/**
 * 
 */
const DEFAULT_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16,  // 128 bits
  saltLength: 32,
  iterations: 100000,
};

/**
 * 
 */
export class EncryptionService {
  private config: EncryptionConfig;
  private masterKey: Buffer;

  constructor(masterPassword: string, config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 
    const salt = this.getMasterKeySalt;
    // Bun  scryptSync 
    this.masterKey = scryptSync(
      masterPassword,
      salt,
      this.config.keyLength
    );
  }

  /**
   * 
   */
  encrypt(plaintext: string): string {
    try {
      //  IV
      const iv = randomBytes(this.config.ivLength);

      // 
      const cipher = createCipheriv(this.config.algorithm, this.masterKey, iv);

      // 
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // GCM 
      // Note: Bun's crypto types don't include getAuthTag, but it exists at runtime
      const authTag = (cipher as unknown as { getAuthTag:  => Buffer }).getAuthTag.toString('hex');

      // : iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 
   */
  decrypt(ciphertext: string): string {
    try {
      // 
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format');
      }

      const [ivHex, authTagHex, encryptedHex] = parts;

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // 
      const decipher = createDecipheriv(this.config.algorithm, this.masterKey, iv);
      // Note: Bun's crypto types don't include setAuthTag, but it exists at runtime
      (decipher as unknown as { setAuthTag: (tag: Buffer) => void }).setAuthTag(authTag);

      // 
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   *  JSON
   */
  encryptObject<T>(obj: T): string {
    return this.encrypt(JSON.stringify(obj));
  }

  /**
   *  JSON
   */
  decryptObject<T>(ciphertext: string): T {
    const plaintext = this.decrypt(ciphertext);
    return JSON.parse(plaintext);
  }

  /**
   * 
   */
  verify(ciphertext: string): boolean {
    try {
      this.decrypt(ciphertext);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 
   * 
   */
  private getMasterKeySalt: Buffer {
    const salt = process.env.ENCRYPTION_SALT;

    if (salt) {
      return Buffer.from(salt, 'hex');
    }

    // 
    console.warn('⚠️  Using default encryption salt. Set ENCRYPTION_SALT in production!');
    return Buffer.from('routex-default-salt-change-in-production', 'utf8');
  }

  /**
   * 
   */
  static generateSalt: string {
    return randomBytes(32).toString('hex');
  }

  /**
   * 
   */
  static generatePassword(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*_+-={}|;:,.<>?';
    const bytes = randomBytes(length);
    let password = '';

    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }

    return password;
  }
}

/**
 * 
 * 
 */
let encryptionService: EncryptionService | null = null;

export function getEncryptionService: EncryptionService {
  if (!encryptionService) {
    const masterPassword = process.env.MASTER_PASSWORD || process.env.ENCRYPTION_KEY;

    if (!masterPassword) {
      console.warn('⚠️  No MASTER_PASSWORD set. Using default password. DO NOT use in production!');
      encryptionService = new EncryptionService('routex-default-password-change-me');
    } else {
      encryptionService = new EncryptionService(masterPassword);
    }
  }

  return encryptionService;
}

/**
 *  API 
 */
export function encryptApiKey(apiKey: string): string {
  const service = getEncryptionService;
  return service.encrypt(apiKey);
}

/**
 *  API 
 */
export function decryptApiKey(encryptedKey: string): string {
  const service = getEncryptionService;
  return service.decrypt(encryptedKey);
}

/**
 * 
 */
export function isEncrypted(value: string): boolean {
  // : hex:hex:hex (iv:authTag:encrypted)
  const parts = value.split(':');
  if (parts.length !== 3) {
    return false;
  }

  // 
  return parts.every(part => /^[0-9a-f]+$/i.test(part));
}

/**
 *  API 
 */
export function getApiKey(storedKey: string): string {
  if (isEncrypted(storedKey)) {
    return decryptApiKey(storedKey);
  }
  // 
  return storedKey;
}

/**
 * 
 */
export function maskApiKey(apiKey: string, visibleChars: number = 4): string {
  if (apiKey.length <= visibleChars * 2) {
    return '*'.repeat(apiKey.length);
  }

  const start = apiKey.substring(0, visibleChars);
  const end = apiKey.substring(apiKey.length - visibleChars);
  const masked = '*'.repeat(apiKey.length - visibleChars * 2);

  return `${start}${masked}${end}`;
}
