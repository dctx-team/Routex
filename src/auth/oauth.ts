/**
 * OAuth Authentication Service
 * OAuth 
 *
 * Handles OAuth 2.0 authentication flow for official provider accounts
 *  OAuth 2.0 
 */

import { Database } from '../db/database';
import { logger } from '../utils/logger';
import type { ChannelType } from '../types';

/**
 * OAuth provider configuration
 * OAuth 
 */
export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string;
  redirectUri: string;
}

/**
 * OAuth token response
 * OAuth token 
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
 *  OAuth 
 */
export interface OAuthSession {
  id: string;
  channelId: string;
  provider: ChannelType;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scopes: string;
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
 *  AI  OAuth 
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
 * OAuth 
 */
export class OAuthService {
  private sessions = new Map<string, OAuthSession>;

  constructor(
    private db: Database,
    private configs: Map<ChannelType, OAuthProviderConfig>
  ) {
    this.loadSessions;
  }

  /**
   * Load OAuth sessions from database
   *  OAuth 
   */
  private async loadSessions {
    try {
      const sessions = this.db.getOAuthSessions;
      for (const session of sessions) {
        this.sessions.set(session.id, session);
      }
      logger.info({ count: sessions.length }, '🔐 Loaded OAuth sessions');
    } catch (error) {
      logger.error({ error }, '❌ Failed to load OAuth sessions');
    }
  }

  /**
   * Generate authorization URL for OAuth flow
   *  OAuth  URL
   */
  generateAuthUrl(provider: ChannelType, state: string): string {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`OAuth not configured for provider: ${provider}`);
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
    });

    return `${config.authorizationUrl}?${params.toString}`;
  }

  /**
   * Exchange authorization code for access token
   * 
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

    // Exchange code for tokens
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
      const error = await response.text;
      throw new Error(`OAuth token exchange failed: ${error}`);
    }

    const tokens = (await response.json) as OAuthTokenResponse;

    // Create session
    const session: OAuthSession = {
      id: crypto.randomUUID,
      channelId: '', // Will be set when linking to channel
      provider,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now + tokens.expires_in * 1000,
      scopes: tokens.scope?.split(' ') || config.scopes,
      createdAt: Date.now,
      updatedAt: Date.now,
    };

    // Save session
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
   * 
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

    // Refresh token
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
      const error = await response.text;
      throw new Error(`Token refresh failed: ${error}`);
    }

    const tokens = (await response.json) as OAuthTokenResponse;

    // Update session
    session.accessToken = tokens.access_token;
    if (tokens.refresh_token) {
      session.refreshToken = tokens.refresh_token;
    }
    session.expiresAt = Date.now + tokens.expires_in * 1000;
    session.updatedAt = Date.now;

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
   *  ID  OAuth 
   */
  getSession(sessionId: string): OAuthSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get OAuth session by channel ID
   *  ID  OAuth 
   */
  getSessionByChannel(channelId: string): OAuthSession | undefined {
    for (const session of this.sessions.values) {
      if (session.channelId === channelId) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Link OAuth session to a channel
   *  OAuth 
   */
  async linkSessionToChannel(sessionId: string, channelId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`OAuth session not found: ${sessionId}`);
    }

    session.channelId = channelId;
    session.updatedAt = Date.now;

    this.sessions.set(sessionId, session);
    this.db.updateOAuthSession(sessionId, session);

    logger.info({
      sessionId,
      channelId,
    }, '🔗 OAuth session linked to channel');
  }

  /**
   * Revoke OAuth session
   *  OAuth 
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
   * 
   */
  isTokenExpired(session: OAuthSession): boolean {
    return Date.now >= session.expiresAt - 60000; // 1 minute buffer / 1
  }

  /**
   * Get valid access token (auto-refresh if needed)
   * 
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
