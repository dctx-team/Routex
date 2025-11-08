import React, { useState, useEffect } from 'react';
import type { TraceStats, Trace, Span } from '../types';
import { t, type Locale } from '../i18n';

interface TracingProps {
  apiBase: string;
  showToast: (message: string, type: 'success' | 'error') => void;
  locale?: Locale;
}

export function Tracing({ apiBase, showToast, locale = 'en' }: TracingProps) {
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const response = await fetch(`${apiBase}/tracing/stats`);
      if (!response.ok) throw new Error(t(locale, 'tracing.failedLoadStats'));
      const data = await response.json();
      setStats(data.data || null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t(locale, 'tracing.failedLoadStats'), 'error');
    }
  };

  const loadTraces = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/tracing/traces`);
      if (!response.ok) throw new Error(t(locale, 'tracing.failedLoadTraces'));
      const data = await response.json();
      setTraces(data.data || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t(locale, 'tracing.failedLoadTraces'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTraceDetails = async (traceId: string) => {
    try {
      const response = await fetch(`${apiBase}/tracing/traces/${traceId}`);
      if (!response.ok) throw new Error(t(locale, 'tracing.failedLoadTrace'));
      const data = await response.json();
      setSelectedTrace(data.data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t(locale, 'tracing.failedLoadTrace'), 'error');
    }
  };

  const handleClearOldSpans = async () => {
    if (!confirm(t(locale, 'tracing.confirmClear'))) return;
    try {
      const response = await fetch(`${apiBase}/tracing/clear`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(t(locale, 'tracing.failedClear'));
      showToast(t(locale, 'tracing.cleared'));
      await loadStats();
      await loadTraces();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t(locale, 'tracing.failedClear'), 'error');
    }
  };

  useEffect(() => {
    loadStats();
    loadTraces();
  }, []);

  // 监听来自 RequestLogs 的 open-trace 事件，直接加载对应 Trace 详情
  useEffect(() => {
    const onOpenTrace = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { traceId?: string };
      if (detail?.traceId) {
        await loadTraceDetails(detail.traceId);
      }
    };
    window.addEventListener('open-trace', onOpenTrace as EventListener);
    return () => window.removeEventListener('open-trace', onOpenTrace as EventListener);
  }, []);

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${(ms || 0).toFixed(0)}ms`;
    return `${((ms || 0) / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString();
  };

  const renderSpanTree = (spans: Span[], parentId: string | null = null, level = 0) => {
    const children = spans.filter((s) => (parentId ? s.parentSpanId === parentId : !s.parentSpanId));

    return children.map((span) => (
      <div key={span.spanId} style={{ marginLeft: `${level * 1.5}rem` }}>
        <div className="p-3 bg-gray-50 rounded mb-2 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-gray-800">{span.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                <span>{t(locale, 'tracing.duration')}: {formatDuration(span.duration)}</span>
                <span className="ml-3">{t(locale, 'tracing.status')}: {span.status || 'OK'}</span>
              </div>
              {span.attributes && Object.keys(span.attributes).length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  {Object.entries(span.attributes).map(([key, value]) => (
                    <div key={key}>
                      {key}: {String(value)}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {formatTimestamp(span.startTime)}
            </div>
          </div>
        </div>
        {renderSpanTree(spans, span.spanId, level + 1)}
      </div>
    ));
  };

  if (loading && !stats) {
    return (
      <div className="card text-center py-12">
        <div className="spinner mx-auto"></div>
        <p className="mt-4 text-gray-600">{t(locale, 'tracing.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">{t(locale, 'tracing.totalTraces')}</div>
            <div className="text-3xl font-bold text-gray-800">{stats.totalTraces}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">{t(locale, 'tracing.totalSpans')}</div>
            <div className="text-3xl font-bold text-gray-800">{stats.totalSpans}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">{t(locale, 'tracing.activeSpans')}</div>
            <div className="text-3xl font-bold text-green-600">{stats.activeSpans}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">{t(locale, 'tracing.avgDuration')}</div>
            <div className="text-3xl font-bold text-blue-600">
              {formatDuration(stats.avgDuration)}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{t(locale, 'tracing.title')}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t(locale, 'tracing.subtitle')}
            </p>
          </div>
          <button onClick={handleClearOldSpans} className="btn btn-danger">
            {t(locale, 'tracing.clearOldData')}
          </button>
        </div>

        {traces.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t(locale, 'tracing.noData')}</p>
        ) : (
          <div className="space-y-3">
            {traces.map((trace) => (
              <div
                key={trace.traceId}
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition"
                onClick={() => loadTraceDetails(trace.traceId)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-800">
                      {t(locale, 'tracing.traceId')}: {trace.traceId.substring(0, 16)}...
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {t(locale, 'tracing.spans')}: {trace.spans?.length || 0}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {trace.spans?.[0] && formatTimestamp(trace.spans[0].startTime)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTrace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slideIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {t(locale, 'tracing.traceDetails')}: {selectedTrace.traceId}
              </h3>
              <button
                onClick={() => setSelectedTrace(null)}
                className="btn btn-secondary"
              >
                {t(locale, 'common.cancel')}
              </button>
            </div>

            <div className="space-y-4">
              <div className="card bg-blue-50">
                <div className="text-sm text-gray-700">
                  <div>{t(locale, 'tracing.totalSpans')}: {selectedTrace.spans.length}</div>
                  <div>
                    {t(locale, 'tracing.totalDuration')}:{' '}
                    {formatDuration(
                      Math.max(...selectedTrace.spans.map((s) => s.duration || 0))
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3">{t(locale, 'tracing.spanTree')}</h4>
                {renderSpanTree(selectedTrace.spans)}
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3">{t(locale, 'tracing.timeline')}</h4>
                <div className="space-y-2">
                  {selectedTrace.spans
                    .sort((a, b) => a.startTime - b.startTime)
                    .map((span) => (
                      <div key={span.spanId} className="flex items-center gap-3">
                        <div className="text-xs text-gray-500 w-32">
                          {formatTimestamp(span.startTime)}
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full flex items-center px-2 text-white text-xs"
                            style={{ width: `${Math.min(100, (span.duration || 0) / 10)}%` }}
                          >
                            {span.name}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 w-20 text-right">
                          {formatDuration(span.duration)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
