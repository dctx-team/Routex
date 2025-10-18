/**
 * Encryption Utility for API Keys
 * API 密钥加密工具
 *
 * 提供安全的加密/解密功能，用于保护敏感数据如 API 密钥
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * 加密配置
 */
export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
}

/**
 * 默认加密配置
 */
const DEFAULT_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16,  // 128 bits
  saltLength: 32,
  iterations: 100000,
};

/**
 * 加密工具类
 */
export class EncryptionService {
  private config: EncryptionConfig;
  private masterKey: Buffer;

  constructor(masterPassword: string, config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 从主密码派生密钥
    const salt = this.getMasterKeySalt();
    // Bun 的 scryptSync 参数略有不同
    this.masterKey = scryptSync(
      masterPassword,
      salt,
      this.config.keyLength
    );
  }

  /**
   * 加密文本
   */
  encrypt(plaintext: string): string {
    try {
      // 生成随机 IV
      const iv = randomBytes(this.config.ivLength);

      // 创建加密器
      const cipher = createCipheriv(this.config.algorithm, this.masterKey, iv);

      // 加密数据
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // 获取认证标签（GCM 模式）
      const authTag = (cipher as any).getAuthTag().toString('hex');

      // 格式: iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 解密文本
   */
  decrypt(ciphertext: string): string {
    try {
      // 解析加密数据
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format');
      }

      const [ivHex, authTagHex, encryptedHex] = parts;

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // 创建解密器
      const decipher = createDecipheriv(this.config.algorithm, this.masterKey, iv);
      (decipher as any).setAuthTag(authTag);

      // 解密数据
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 加密对象（转为 JSON）
   */
  encryptObject<T>(obj: T): string {
    return this.encrypt(JSON.stringify(obj));
  }

  /**
   * 解密对象（从 JSON）
   */
  decryptObject<T>(ciphertext: string): T {
    const plaintext = this.decrypt(ciphertext);
    return JSON.parse(plaintext);
  }

  /**
   * 验证加密文本是否可以成功解密
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
   * 获取主密钥的盐值
   * 在生产环境中，这应该从环境变量或密钥管理服务获取
   */
  private getMasterKeySalt(): Buffer {
    const salt = process.env.ENCRYPTION_SALT;

    if (salt) {
      return Buffer.from(salt, 'hex');
    }

    // 开发环境使用固定盐值（生产环境应使用环境变量）
    console.warn('⚠️  Using default encryption salt. Set ENCRYPTION_SALT in production!');
    return Buffer.from('routex-default-salt-change-in-production', 'utf8');
  }

  /**
   * 生成新的加密盐值（用于初始化）
   */
  static generateSalt(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * 生成强随机密码
   */
  static generatePassword(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const bytes = randomBytes(length);
    let password = '';

    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }

    return password;
  }
}

/**
 * 单例加密服务
 * 使用环境变量中的主密码初始化
 */
let encryptionService: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
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
 * 辅助函数：加密 API 密钥
 */
export function encryptApiKey(apiKey: string): string {
  const service = getEncryptionService();
  return service.encrypt(apiKey);
}

/**
 * 辅助函数：解密 API 密钥
 */
export function decryptApiKey(encryptedKey: string): string {
  const service = getEncryptionService();
  return service.decrypt(encryptedKey);
}

/**
 * 辅助函数：检查字符串是否已加密
 */
export function isEncrypted(value: string): boolean {
  // 加密格式: hex:hex:hex (iv:authTag:encrypted)
  const parts = value.split(':');
  if (parts.length !== 3) {
    return false;
  }

  // 检查是否为有效的十六进制
  return parts.every(part => /^[0-9a-f]+$/i.test(part));
}

/**
 * 辅助函数：安全地获取 API 密钥（自动解密）
 */
export function getApiKey(storedKey: string): string {
  if (isEncrypted(storedKey)) {
    return decryptApiKey(storedKey);
  }
  // 如果未加密，直接返回（向后兼容）
  return storedKey;
}

/**
 * 掩码显示敏感信息
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
