import React, { useState, useEffect } from 'react';
import type { RequestLog } from '../types';
import { t, type Locale } from '../i18n';

interface RequestLogsProps {
  apiBase: string;
  locale?: Locale;
}

export function RequestLogs({ apiBase, locale = 'en' }: RequestLogsProps) {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<{ status?: string; channel?: string; model?: string }>({});
  const [search, setSearch] = useState('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${apiBase}/requests?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to load request logs');
      const data = await response.json();
      let items: RequestLog[] = data.data || [];
      // Client-side filter and search
      if (filter.status) {
        const statusNum = Number(filter.status);
        items = items.filter((l) => l.status === statusNum);
      }
      if (filter.channel) {
        items = items.filter((l) => l.channelName?.toLowerCase().includes(filter.channel!.toLowerCase()));
      }
      if (filter.model) {
        items = items.filter((l) => l.model?.toLowerCase().includes(filter.model!.toLowerCase()));
      }
      if (search) {
        const q = search.toLowerCase();
        items = items.filter((l) =>
          l.path.toLowerCase().includes(q) ||
          l.channelName?.toLowerCase().includes(q) ||
          l.model?.toLowerCase().includes(q) ||
          String(l.status).includes(q)
        );
      }
      setLogs(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    if (autoRefresh) {
      const interval = setInterval(loadLogs, 10000);
      return () => clearInterval(interval);
    }
  }, [apiBase, limit, autoRefresh]);

  const formatDate = (timestamp: string | number) => {
    const ts = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
    return new Date(ts).toLocaleString();
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${(ms || 0).toFixed(0)}ms`;
    return `${((ms || 0) / 1000).toFixed(2)}s`;
  };

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) return 'badge-success';
    if (status >= 400 && status < 500) return 'badge-warning';
    if (status >= 500) return 'badge-error';
    return 'badge-info';
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 500) return 'text-green-600';
    if (latency < 2000) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-800">{t(locale, 'logs.title')}</h2>
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
            <label className="text-sm font-medium text-gray-700">{t(locale, 'logs.limit')}:</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="border-0 text-sm bg-transparent focus:ring-0"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
            <input
              type="text"
              placeholder="Search path/channel/model/status"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm bg-transparent border-0 focus:ring-0"
            />
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
            <label className="text-sm text-gray-700">Status:</label>
            <select
              value={filter.status || ''}
              onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
              className="border-0 text-sm bg-transparent focus:ring-0"
            >
              <option value="">All</option>
              <option value="200">200</option>
              <option value="400">400</option>
              <option value="401">401</option>
              <option value="403">403</option>
              <option value="404">404</option>
              <option value="500">500</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
            <input
              type="text"
              placeholder="Channel"
              value={filter.channel || ''}
              onChange={(e) => setFilter({ ...filter, channel: e.target.value || undefined })}
              className="text-sm bg-transparent border-0 focus:ring-0"
            />
            <input
              type="text"
              placeholder="Model"
              value={filter.model || ''}
              onChange={(e) => setFilter({ ...filter, model: e.target.value || undefined })}
              className="text-sm bg-transparent border-0 focus:ring-0"
            />
          </div>
          <label className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">{t(locale, 'logs.autoRefresh')}</span>
          </label>
          <button onClick={loadLogs} className="btn btn-primary" disabled={loading}>
            {loading ? t(locale, 'common.refreshing') : t(locale, 'common.refresh')}
          </button>
        </div>
      </div>

      {error && (
        <div className="card bg-red-50 border-l-4 border-red-500">
          <h3 className="text-red-800 font-semibold mb-2">Error Loading Logs</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Logs Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto scrollbar-thin" style={{ maxHeight: '70vh' }}>
          <table className="table">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left">Timestamp</th>
                <th className="text-left">Method</th>
                <th className="text-left">Path</th>
                <th className="text-left">Channel</th>
                <th className="text-left">Model</th>
                <th className="text-center">Status</th>
                <th className="text-right">Latency</th>
                <th className="text-right">Tokens</th>
                <th className="text-right">Cost</th>
                <th className="text-left">Trace</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex items-center justify-center">
                      <div className="spinner"></div>
                      <span className="ml-3 text-gray-600">Loading logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    No request logs available
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="text-sm text-gray-900 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td>
                      <span className="badge badge-info text-xs">{log.method}</span>
                    </td>
                    <td className="text-sm font-mono text-gray-700 max-w-xs truncate">
                      {log.path}
                    </td>
                    <td className="text-sm text-gray-900">{log.channelName}</td>
                    <td className="text-sm text-gray-700 font-mono">{log.model}</td>
                    <td className="text-center">
                      <span className={`badge ${getStatusBadge(log.status)} text-xs`}>
                        {log.status}
                      </span>
                    </td>
                    <td className={`text-right font-semibold ${getLatencyColor(log.latency)}`}>
                      {formatLatency(log.latency)}
                    </td>
                    <td className="text-right text-sm text-gray-700">
                      {log.inputTokens && log.outputTokens ? (
                        <span>
                          {log.inputTokens.toLocaleString()} / {log.outputTokens.toLocaleString()}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="text-right text-sm font-semibold text-gray-800">
                      {log.cost ? `$${(log.cost || 0).toFixed(4)}` : '-'}
                    </td>
                    <td className="text-sm text-gray-700">
                      {log.traceId ? (
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            // 跳转到追踪标签页，触发加载对应 trace
                            const traceEvent = new CustomEvent('open-trace', { detail: { traceId: log.traceId } });
                            window.dispatchEvent(traceEvent);
                          }}
                          className="underline text-blue-600 hover:text-blue-800"
                        >
                          {log.traceId.slice(0, 8)}...
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {logs.length > 0 && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-800">{logs.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {(logs.length > 0 ? (logs.filter((l) => l.status < 400).length / logs.length) * 100 : 0).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Latency</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatLatency(logs.reduce((sum, l) => sum + l.latency, 0) / logs.length)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-purple-600">
                ${(logs.reduce((sum, l) => sum + (l.cost || 0), 0) || 0).toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
