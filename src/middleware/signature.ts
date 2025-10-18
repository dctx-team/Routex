/**
 * Request Signature Verification
 * 请求签名验证
 *
 * 提供 HMAC 签名验证，确保请求的完整性和真实性
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { Context, Next } from 'hono';
import { logger } from '../utils/logger';

/**
 * 签名配置
 */
export interface SignatureConfig {
  // 签名密钥
  secret: string;
  // 签名算法
  algorithm?: string;
  // 签名头名称
  signatureHeader?: string;
  // 时间戳头名称
  timestampHeader?: string;
  // 允许的时间偏差（毫秒）
  tolerance?: number;
  // 需要包含在签名中的头
  headersToSign?: string[];
  // 跳过验证的路径
  skipPaths?: string[];
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<Omit<SignatureConfig, 'secret' | 'skipPaths'>> = {
  algorithm: 'sha256',
  signatureHeader: 'x-signature',
  timestampHeader: 'x-timestamp',
  tolerance: 300000, // 5 分钟
  headersToSign: ['x-api-key', 'content-type'],
};

/**
 * 计算请求签名
 */
export function computeSignature(
  method: string,
  path: string,
  body: string,
  timestamp: string,
  secret: string,
  headers: Record<string, string> = {},
  algorithm: string = 'sha256'
): string {
  // 构建签名字符串
  const parts = [
    method.toUpperCase(),
    path,
    timestamp,
    body || '',
  ];

  // 添加需要签名的头
  for (const [key, value] of Object.entries(headers)) {
    parts.push(`${key}:${value}`);
  }

  const message = parts.join('\n');

  // 计算 HMAC
  const hmac = createHmac(algorithm, secret);
  hmac.update(message);

  return hmac.digest('hex');
}

/**
 * 验证请求签名
 */
export function verifySignature(
  providedSignature: string,
  expectedSignature: string
): boolean {
  try {
    // 使用时间安全的比较，防止时序攻击
    const providedBuffer = Buffer.from(providedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * 签名验证中间件
 */
export function signatureVerification(config: SignatureConfig) {
  const {
    secret,
    algorithm = DEFAULT_CONFIG.algorithm,
    signatureHeader = DEFAULT_CONFIG.signatureHeader,
    timestampHeader = DEFAULT_CONFIG.timestampHeader,
    tolerance = DEFAULT_CONFIG.tolerance,
    headersToSign = DEFAULT_CONFIG.headersToSign,
    skipPaths = [],
  } = config;

  if (!secret) {
    throw new Error('Signature secret is required');
  }

  return async (c: Context, next: Next) => {
    const path = c.req.path;

    // 检查是否跳过验证
    if (skipPaths.some(skipPath => path.startsWith(skipPath))) {
      return next();
    }

    try {
      // 获取签名和时间戳
      const providedSignature = c.req.header(signatureHeader);
      const timestamp = c.req.header(timestampHeader);

      if (!providedSignature || !timestamp) {
        logger.warn({
          path,
          hasSignature: !!providedSignature,
          hasTimestamp: !!timestamp,
        }, '🔒 Missing signature or timestamp');

        return c.json(
          {
            success: false,
            error: {
              type: 'signature_required',
              message: 'Request signature and timestamp are required',
            },
          },
          401
        );
      }

      // 验证时间戳
      const requestTime = parseInt(timestamp, 10);
      if (isNaN(requestTime)) {
        return c.json(
          {
            success: false,
            error: {
              type: 'invalid_timestamp',
              message: 'Invalid timestamp format',
            },
          },
          401
        );
      }

      const now = Date.now();
      const timeDiff = Math.abs(now - requestTime);

      if (timeDiff > tolerance) {
        logger.warn({
          path,
          requestTime,
          now,
          diff: timeDiff,
        }, '🔒 Request timestamp out of tolerance');

        return c.json(
          {
            success: false,
            error: {
              type: 'timestamp_expired',
              message: 'Request timestamp is too old or in the future',
            },
          },
          401
        );
      }

      // 读取请求体
      const body = await c.req.text();

      // 收集需要签名的头
      const signedHeaders: Record<string, string> = {};
      for (const headerName of headersToSign) {
        const value = c.req.header(headerName);
        if (value) {
          signedHeaders[headerName] = value;
        }
      }

      // 计算期望的签名
      const expectedSignature = computeSignature(
        c.req.method,
        path,
        body,
        timestamp,
        secret,
        signedHeaders,
        algorithm
      );

      // 验证签名
      if (!verifySignature(providedSignature, expectedSignature)) {
        logger.warn({
          path,
          method: c.req.method,
        }, '🔒 Invalid signature');

        return c.json(
          {
            success: false,
            error: {
              type: 'invalid_signature',
              message: 'Request signature verification failed',
            },
          },
          401
        );
      }

      // 签名验证成功，继续处理请求
      // 注意：需要重新设置请求体，因为已经被读取
      const newRequest = new Request(c.req.url, {
        method: c.req.method,
        headers: c.req.headers,
        body: body || undefined,
      });

      // 替换请求对象
      (c as any).req = newRequest;

      logger.debug({ path }, '✅ Signature verified');

      return next();
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        path,
      }, '❌ Signature verification error');

      return c.json(
        {
          success: false,
          error: {
            type: 'signature_verification_error',
            message: 'An error occurred during signature verification',
          },
        },
        500
      );
    }
  };
}

/**
 * 生成签名的辅助函数
 * 用于客户端生成请求签名
 */
export function generateRequestSignature(
  method: string,
  path: string,
  body: any,
  secret: string,
  options: {
    headers?: Record<string, string>;
    algorithm?: string;
  } = {}
): { signature: string; timestamp: string } {
  const timestamp = Date.now().toString();
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);

  const signature = computeSignature(
    method,
    path,
    bodyString,
    timestamp,
    secret,
    options.headers || {},
    options.algorithm || 'sha256'
  );

  return { signature, timestamp };
}

/**
 * 签名验证配置示例
 */
export const SignaturePresets = {
  /**
   * 标准配置 - 5 分钟容差
   */
  standard: (secret: string): SignatureConfig => ({
    secret,
    tolerance: 300000, // 5 分钟
    headersToSign: ['x-api-key', 'content-type'],
  }),

  /**
   * 严格配置 - 1 分钟容差
   */
  strict: (secret: string): SignatureConfig => ({
    secret,
    tolerance: 60000, // 1 分钟
    headersToSign: ['x-api-key', 'content-type', 'user-agent'],
  }),

  /**
   * 宽松配置 - 15 分钟容差
   */
  lenient: (secret: string): SignatureConfig => ({
    secret,
    tolerance: 900000, // 15 分钟
    headersToSign: ['x-api-key'],
  }),
};
