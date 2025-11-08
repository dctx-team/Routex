/**
 * OAuth Session Manager Component
 * OAuth 会话管理组件
 *
 * Manages OAuth sessions including refresh, link to channel, and revoke
 * 管理 OAuth 会话,包括刷新、链接到通道和撤销
 */

import React, { useState, useEffect } from 'react';
import type { Channel, ChannelType } from '../types';

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

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  azure: 'Azure',
  zhipu: '智谱 AI',
  custom: 'Custom'
};

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'bg-orange-100 text-orange-800 border-orange-200',
  openai: 'bg-green-100 text-green-800 border-green-200',
  google: 'bg-blue-100 text-blue-800 border-blue-200',
  azure: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  zhipu: 'bg-purple-100 text-purple-800 border-purple-200',
  custom: 'bg-gray-100 text-gray-800 border-gray-200'
};

export const OAuthManager: React.FC = () => {
  const [sessions, setSessions] = useState<OAuthSession[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [linkingSession, setLinkingSession] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // Refresh sessions every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, channelsRes] = await Promise.all([
        fetch('/api/oauth/sessions'),
        fetch('/api/channels')
      ]);

      const sessionsResult = await sessionsRes.json();
      const channelsResult = await channelsRes.json();

      if (sessionsResult.success) {
        setSessions(sessionsResult.data);
      }

      if (channelsResult.success) {
        setChannels(channelsResult.data);
      }

      setError(null);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (sessionId: string) => {
    try {
      setActionLoading(sessionId);
      const response = await fetch(`/api/oauth/sessions/${sessionId}/refresh`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        await fetchData();
      } else {
        setError(result.error || 'Failed to refresh token');
      }
    } catch (err) {
      setError('Failed to refresh token');
      console.error('Error refreshing token:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLinkChannel = async (sessionId: string, channelId: string) => {
    try {
      setActionLoading(sessionId);
      const response = await fetch(`/api/oauth/sessions/${sessionId}/link/${channelId}`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        await fetchData();
        setLinkingSession(null);
      } else {
        setError(result.error || 'Failed to link channel');
      }
    } catch (err) {
      setError('Failed to link channel');
      console.error('Error linking channel:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this OAuth session?')) {
      return;
    }

    try {
      setActionLoading(sessionId);
      const response = await fetch(`/api/oauth/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        await fetchData();
      } else {
        setError(result.error || 'Failed to revoke session');
      }
    } catch (err) {
      setError('Failed to revoke session');
      console.error('Error revoking session:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatExpiration = (expiresAt: number) => {
    const now = Date.now();
    const diff = expiresAt - now;

    if (diff <= 0) {
      return 'Expired';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  };

  const getChannelName = (channelId: string | null) => {
    if (!channelId) return 'Not linked';
    const channel = channels.find(ch => ch.id === channelId);
    return channel ? channel.name : 'Unknown channel';
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">OAuth Sessions</h2>
            <button
              onClick={fetchData}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No OAuth sessions</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create a new session by connecting an official account.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sessions.map((session) => (
              <div key={session.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${PROVIDER_COLORS[session.provider] || PROVIDER_COLORS.custom}`}>
                        {PROVIDER_DISPLAY_NAMES[session.provider] || session.provider}
                      </span>

                      {session.isExpired ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-1 text-sm">
                      {session.userInfo?.email && (
                        <p className="text-gray-600">
                          <span className="font-medium">Email:</span> {session.userInfo.email}
                        </p>
                      )}
                      {session.userInfo?.name && (
                        <p className="text-gray-600">
                          <span className="font-medium">Name:</span> {session.userInfo.name}
                        </p>
                      )}
                      <p className="text-gray-600">
                        <span className="font-medium">Channel:</span> {getChannelName(session.channelId)}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Expires in:</span> {formatExpiration(session.expiresAt)}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Created:</span> {formatDate(session.createdAt)}
                      </p>
                    </div>

                    {linkingSession === session.id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Channel to Link
                        </label>
                        <div className="flex items-center space-x-2">
                          <select
                            id={`channel-select-${session.id}`}
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          >
                            <option value="">Select a channel...</option>
                            {channels
                              .filter(ch => ch.type === session.provider)
                              .map(ch => (
                                <option key={ch.id} value={ch.id}>
                                  {ch.name}
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={() => {
                              const select = document.getElementById(`channel-select-${session.id}`) as HTMLSelectElement;
                              if (select.value) {
                                handleLinkChannel(session.id, select.value);
                              }
                            }}
                            disabled={actionLoading === session.id}
                            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                          >
                            Link
                          </button>
                          <button
                            onClick={() => setLinkingSession(null)}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                    {!session.isExpired && (
                      <button
                        onClick={() => handleRefresh(session.id)}
                        disabled={actionLoading === session.id}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                        title="Refresh token"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}

                    <button
                      onClick={() => setLinkingSession(linkingSession === session.id ? null : session.id)}
                      disabled={actionLoading === session.id}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                      title="Link to channel"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleRevoke(session.id)}
                      disabled={actionLoading === session.id}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                      title="Revoke session"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
