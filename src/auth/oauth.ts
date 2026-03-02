/**
 * OAuth Authentication Service
 * OAuth 认证服务
 *
 * Handles OAuth 2.0 authentication flow for official provider accounts
 * 处理官方提供商账户的 OAuth 2.0 认证流程
 */

import { Database } from '../db/database';
import { logger } from '../utils/logger';
import type { ChannelType } from '../types';

/**
 * OAuth provider configuration
 * OAuth 提供商配置
 */
export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

/**
 * OAuth token response
 * OAuth token 响应
 */
export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

/**
 * Stored OAuth session
 * 存储的 OAuth 会话
 */
export interface OAuthSession {
  id: string;
  channelId: string;
  provider: ChannelType;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scopes: string[];
  userInfo?: {
    id: string;
    email?: string;
    name?: string;
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * OAuth provider configurations for major AI providers
 * 主要 AI 提供商的 OAuth 配置
 */
export const OAUTH_PROVIDERS: Record<string, Partial<OAuthProviderConfig>> = {
  anthropic: {
    authorizationUrl: 'https://console.anthropic.com/oauth/authorize',
    tokenUrl: 'https://api.anthropic.com/v1/oauth/token',
    scopes: ['api:read', 'api:write'],
  },
  openai: {
    authorizationUrl: 'https://auth.openai.com/authorize',
    tokenUrl: 'https://auth.openai.com/oauth/token',
    scopes: ['api.read', 'api.write'],
  },
  google: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/generative-language'],
  },
};

/**
 * OAuth Authentication Service
 * OAuth 认证服务
 */
export class OAuthService {
  private sessions = new Map<string, OAuthSession>();

  constructor(
    private db: Database,
    private configs: Map<ChannelType, OAuthProviderConfig>
  ) {
    // loadSessions is async; fire-and-forget with explicit error handling
    this.loadSessions().catch((error) => {
      logger.error({ error }, '❌ Failed to initialize OAuth sessions');
    });
  }

  /**
   * Load OAuth sessions from database
   * 从数据库加载 OAuth 会话
   */
  private async loadSessions() {
    try {
      const sessions = this.db.getOAuthSessions();
      for (const session of sessions) {
        this.sessions.set(session.id, session);
      }
      logger.info({ count: sessions.length }, '🔐 Loaded OAuth sessions');
    } catch (error) {
      logger.error({ error }, '❌ Failed to load OAuth sessions');
    }
  }

  /**
   * Get configured provider names
   * 获取已配置的提供商名称列表
   */
  getConfiguredProviders(): ChannelType[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Encode provider + opaque nonce into state string for CSRF protection
   * 将提供商名称和随机 nonce 编码到 state 字符串中用于 CSRF 保护
   * Format: base64url(JSON({ provider, nonce }))
   */
  static encodeState(provider: ChannelType, nonce: string): string {
    const payload = JSON.stringify({ provider, nonce });
    return Buffer.from(payload).toString('base64url');
  }

  /**
   * Decode provider + nonce from state string
   * 从 state 字符串中解码提供商和 nonce
   */
  static decodeState(state: string): { provider: ChannelType; nonce: string } | null {
    try {
      const payload = Buffer.from(state, 'base64url').toString('utf-8');
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed.provider === 'string' && typeof parsed.nonce === 'string') {
        return { provider: parsed.provider as ChannelType, nonce: parsed.nonce };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Generate authorization URL for OAuth flow
   * 生成 OAuth 流程的授权 URL
   * The state parameter encodes the provider to correctly identify it in the callback.
   */
  generateAuthUrl(provider: ChannelType, nonce: string): string {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`OAuth not configured for provider: ${provider}`);
    }

    // Encode provider into state so callback can identify it without a query param
    const state = OAuthService.encodeState(provider, nonce);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * 交换授权码以获取访问令牌
   */
  async exchangeCode(
    provider: ChannelType,
    code: string,
    _state: string
  ): Promise<OAuthSession> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`OAuth not configured for provider: ${provider}`);
    }

    // Exchange code for tokens / 交换代码获取令牌
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OAuth token exchange failed: ${error}`);
    }

    const tokens = (await response.json()) as OAuthTokenResponse;

    // Create session / 创建会话
    const session: OAuthSession = {
      id: crypto.randomUUID(),
      channelId: '', // Will be set when linking to channel / 链接到通道时设置
      provider,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      scopes: tokens.scope?.split(' ') || config.scopes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save session / 保存会话
    this.sessions.set(session.id, session);
    this.db.createOAuthSession(session);

    logger.info({
      provider,
      sessionId: session.id,
    }, '🔐 OAuth session created');

    return session;
  }

  /**
   * Refresh access token using refresh token
   * 使用刷新令牌刷新访问令牌
   */
  async refreshToken(sessionId: string): Promise<OAuthSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`OAuth session not found: ${sessionId}`);
    }

    if (!session.refreshToken) {
      throw new Error('No refresh token available');
    }

    const config = this.configs.get(session.provider);
    if (!config) {
      throw new Error(`OAuth not configured for provider: ${session.provider}`);
    }

    // Refresh token / 刷新令牌
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const tokens = (await response.json()) as OAuthTokenResponse;

    // Update session / 更新会话
    session.accessToken = tokens.access_token;
    if (tokens.refresh_token) {
      session.refreshToken = tokens.refresh_token;
    }
    session.expiresAt = Date.now() + tokens.expires_in * 1000;
    session.updatedAt = Date.now();

    this.sessions.set(sessionId, session);
    this.db.updateOAuthSession(sessionId, session);

    logger.info({
      provider: session.provider,
      sessionId,
    }, '🔄 OAuth token refreshed');

    return session;
  }

  /**
   * Get OAuth session by ID
   * 通过 ID 获取 OAuth 会话
   */
  getSession(sessionId: string): OAuthSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get OAuth session by channel ID
   * 通过通道 ID 获取 OAuth 会话
   */
  getSessionByChannel(channelId: string): OAuthSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.channelId === channelId) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Link OAuth session to a channel
   * 将 OAuth 会话链接到通道
   */
  async linkSessionToChannel(sessionId: string, channelId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`OAuth session not found: ${sessionId}`);
    }

    session.channelId = channelId;
    session.updatedAt = Date.now();

    this.sessions.set(sessionId, session);
    this.db.updateOAuthSession(sessionId, session);

    logger.info({
      sessionId,
      channelId,
    }, '🔗 OAuth session linked to channel');
  }

  /**
   * Revoke OAuth session
   * 撤销 OAuth 会话
   */
  async revokeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`OAuth session not found: ${sessionId}`);
    }

    this.sessions.delete(sessionId);
    this.db.deleteOAuthSession(sessionId);

    logger.info({
      provider: session.provider,
      sessionId,
    }, '🗑️  OAuth session revoked');
  }

  /**
   * Check if token is expired
   * 检查令牌是否过期
   */
  isTokenExpired(session: OAuthSession): boolean {
    return Date.now() >= session.expiresAt - 60000; // 1 minute buffer / 1分钟缓冲
  }

  /**
   * Get valid access token (auto-refresh if needed)
   * 获取有效的访问令牌（如需要则自动刷新）
   */
  async getValidAccessToken(sessionId: string): Promise<string> {
    let session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`OAuth session not found: ${sessionId}`);
    }

    if (this.isTokenExpired(session)) {
      session = await this.refreshToken(sessionId);
    }

    return session.accessToken;
  }
}
