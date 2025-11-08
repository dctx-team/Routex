/**
 * OAuth Login Component
 * OAuth 登录组件
 *
 * Provides OAuth 2.0 authentication for official provider accounts
 * 为官方提供商账户提供 OAuth 2.0 认证
 */

import React, { useState, useEffect } from 'react';
import type { ChannelType } from '../types';

interface OAuthProvider {
  name: ChannelType;
  enabled: boolean;
}

interface OAuthSession {
  id: string;
  channelId: string | null;
  provider: ChannelType;
  expiresAt: number;
  scopes: string[];
  userInfo?: {
    id: string;
    email?: string;
    name?: string;
  };
  createdAt: number;
  updatedAt: number;
  isExpired: boolean;
}

interface OAuthLoginProps {
  onSessionCreated?: (session: OAuthSession) => void;
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  azure: 'Azure',
  zhipu: '智谱 AI',
  custom: 'Custom'
};

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'bg-orange-500 hover:bg-orange-600',
  openai: 'bg-green-500 hover:bg-green-600',
  google: 'bg-blue-500 hover:bg-blue-600',
  azure: 'bg-cyan-500 hover:bg-cyan-600',
  zhipu: 'bg-purple-500 hover:bg-purple-600',
  custom: 'bg-gray-500 hover:bg-gray-600'
};

export const OAuthLogin: React.FC<OAuthLoginProps> = ({ onSessionCreated }) => {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders();
    checkOAuthCallback();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/oauth/providers');
      const result = await response.json();

      if (result.success) {
        setProviders(result.data);
      } else {
        setError('Failed to fetch OAuth providers');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Error fetching providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkOAuthCallback = () => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('oauth');
    const sessionId = params.get('sessionId');
    const provider = params.get('provider');
    const message = params.get('message');

    if (oauthStatus === 'success' && sessionId && provider) {
      // OAuth authentication succeeded
      setError(null);
      // Fetch the session details
      fetchSession(sessionId);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (oauthStatus === 'error') {
      // OAuth authentication failed
      setError(message || 'OAuth authentication failed');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const fetchSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/oauth/sessions/${sessionId}`);
      const result = await response.json();

      if (result.success && onSessionCreated) {
        onSessionCreated(result.data);
      }
    } catch (err) {
      console.error('Error fetching session:', err);
    }
  };

  const handleLogin = async (provider: ChannelType) => {
    try {
      setAuthenticating(provider);
      setError(null);

      // Get authorization URL
      const response = await fetch(`/api/oauth/${provider}/authorize`);
      const result = await response.json();

      if (result.success) {
        // Store state in sessionStorage for CSRF protection
        sessionStorage.setItem('oauth_state', result.data.state);
        sessionStorage.setItem('oauth_provider', provider);

        // Redirect to OAuth provider
        window.location.href = result.data.url;
      } else {
        setError(`Failed to start OAuth flow: ${result.error || 'Unknown error'}`);
        setAuthenticating(null);
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Error starting OAuth flow:', err);
      setAuthenticating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">No OAuth Providers Configured</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>To enable OAuth authentication, configure the following environment variables:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><code className="bg-yellow-100 px-1 rounded">ANTHROPIC_OAUTH_CLIENT_ID</code> and <code className="bg-yellow-100 px-1 rounded">ANTHROPIC_OAUTH_CLIENT_SECRET</code></li>
                <li><code className="bg-yellow-100 px-1 rounded">OPENAI_OAUTH_CLIENT_ID</code> and <code className="bg-yellow-100 px-1 rounded">OPENAI_OAUTH_CLIENT_SECRET</code></li>
                <li><code className="bg-yellow-100 px-1 rounded">GOOGLE_OAUTH_CLIENT_ID</code> and <code className="bg-yellow-100 px-1 rounded">GOOGLE_OAUTH_CLIENT_SECRET</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="inline-flex text-red-400 hover:text-red-500"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Connect Official Account</h2>
        <p className="text-sm text-gray-600 mb-6">
          Authenticate with your official provider account using OAuth 2.0
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <button
              key={provider.name}
              onClick={() => handleLogin(provider.name)}
              disabled={authenticating !== null}
              className={`
                ${PROVIDER_COLORS[provider.name] || PROVIDER_COLORS.custom}
                text-white font-medium py-3 px-4 rounded-lg
                transition-all duration-200
                flex items-center justify-center space-x-2
                disabled:opacity-50 disabled:cursor-not-allowed
                shadow-sm hover:shadow-md
              `}
            >
              {authenticating === provider.name ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Connect {PROVIDER_DISPLAY_NAMES[provider.name] || provider.name}</span>
                </>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">About OAuth Authentication</h4>
              <p className="mt-1 text-sm text-blue-700">
                OAuth 2.0 provides secure authentication without storing your credentials.
                You'll be redirected to the provider's login page and then back here after authentication.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
