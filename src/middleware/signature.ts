/**
 * Request Signature Verification
 * 
 *
 *  HMAC 
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { Context, Next } from 'hono';
import { logger } from '../utils/logger';

/**
 * 
 */
export interface SignatureConfig {
  // 
  secret: string;
  // 
  algorithm?: string;
  // 
  signatureHeader?: string;
  // 
  timestampHeader?: string;
  // 
  tolerance?: number;
  // 
  headersToSign?: string[];
  // 
  skipPaths?: string[];
}

/**
 * 
 */
const DEFAULT_CONFIG: Required<Omit<SignatureConfig, 'secret' | 'skipPaths'>> = {
  algorithm: 'sha256',
  signatureHeader: 'x-signature',
  timestampHeader: 'x-timestamp',
  tolerance: 300000, // 5 
  headersToSign: ['x-api-key', 'content-type'],
};

/**
 * 
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
  // 
  const parts = [
    method.toUpperCase(),
    path,
    timestamp,
    body || '',
  ];

  // 
  for (const [key, value] of Object.entries(headers)) {
    parts.push(`${key}:${value}`);
  }

  const message = parts.join('\n');

  //  HMAC
  const hmac = createHmac(algorithm, secret);
  hmac.update(message);

  return hmac.digest('hex');
}

/**
 * 
 */
export function verifySignature(
  providedSignature: string,
  expectedSignature: string
): boolean {
  try {
    // 
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
 * 
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

    // 
    if (skipPaths.some((skipPath) => path.startsWith(skipPath))) {
      return next();
    }

    try {
      // 
      const providedSignature = c.req.header(signatureHeader) || '';
      const timestamp = c.req.header(timestampHeader) || '';

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

      // 
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

      const now = Date.now;
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

      // 
      const body = await c.req.text;

      // 
      const signedHeaders: Record<string, string> = {};
      for (const headerName of headersToSign) {
        const value = c.req.header(headerName);
        if (value) {
          signedHeaders[headerName] = value;
        }
      }

      // 
      const expectedSignature = computeSignature(
        c.req.method,
        path,
        body,
        timestamp,
        secret,
        signedHeaders,
        algorithm
      );

      // 
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

      // 
      // 
      // Hono 的请求对象不可直接替换，这里仅完成校验，不改写请求

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
 * 
 * 
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
 * 
 */
export const SignaturePresets = {
  /**
   *  - 5 
   */
  standard: (secret: string): SignatureConfig => ({
    secret,
    tolerance: 300000, // 5 
    headersToSign: ['x-api-key', 'content-type'],
  }),

  /**
   *  - 1 
   */
  strict: (secret: string): SignatureConfig => ({
    secret,
    tolerance: 60000, // 1 
    headersToSign: ['x-api-key', 'content-type', 'user-agent'],
  }),

  /**
   *  - 15 
   */
  lenient: (secret: string): SignatureConfig => ({
    secret,
    tolerance: 900000, // 15 
    headersToSign: ['x-api-key'],
  }),
};
