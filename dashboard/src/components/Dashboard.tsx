import React from 'react';
import type { SystemStatus, LoadBalancerStrategy } from '../types';
import { t, type Locale } from '../i18n';

interface DashboardProps {
  status: SystemStatus | null | undefined;
  onRefresh: () => void;
  onCreateChannel: () => void;
  onChangeStrategy: (strategy: LoadBalancerStrategy) => void;
  loading?: boolean;
  locale?: Locale;
}

/**
 * 简洁版Dashboard组件 - 重构完成
 *
 * 设计理念：
 * 1. 减法思维 - 移除冗余元素，专注核心信息
 * 2. 信息层次 - 建立清晰的视觉层次
 * 3. 呼吸空间 - 增加留白，提升可读性
 * 4. 一致性 - 统一的视觉语言和交互模式
 */
export function Dashboard({
  status,
  onRefresh,
  onCreateChannel,
  onChangeStrategy,
  loading,
  locale = 'en'
}: DashboardProps) {

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const strategies: { value: LoadBalancerStrategy; label: string }[] = [
    { value: 'priority', label: t(locale, 'dashboard.strategy.priority') },
    { value: 'round_robin', label: t(locale, 'dashboard.strategy.roundRobin') },
    { value: 'weighted', label: t(locale, 'dashboard.strategy.weighted') },
    { value: 'least_used', label: t(locale, 'dashboard.strategy.leastUsed') },
  ];

  return (
    <div className="dashboard-simplified">
      {/* 简化的头部区域 */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-info">
            <h1 className="dashboard-title">
              {t(locale, 'dashboard.title')}
              <span className={`status-indicator ${status ? 'online' : 'offline'}`}>
                {status ? t(locale, 'dashboard.running') : '离线'}
              </span>
            </h1>
            <p className="dashboard-subtitle">
              {status ? t(locale, 'dashboard.subtitle') : '后端服务未连接'}
            </p>
          </div>

          <div className="header-actions">
            <button
              onClick={onRefresh}
              className="btn-refresh"
              disabled={loading}
            >
              {loading ? (
                <div className="spinner-small"></div>
              ) : (
                <span>↻</span>
              )}
              {t(locale, 'dashboard.refreshData')}
            </button>
            <button onClick={onCreateChannel} className="btn-primary">
              + {t(locale, 'dashboard.addChannel')}
            </button>
          </div>
        </div>
      </header>

      {/* 核心状态指标 */}
      <section className="metrics-section">
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-value">
              {status?.stats?.totalChannels || status?.totalChannels || 0}
            </div>
            <div className="metric-label">{t(locale, 'dashboard.totalChannels')}</div>
          </div>

          <div className="metric-item">
            <div className="metric-value">
              {status?.stats?.enabledChannels || status?.enabledChannels || 0}
            </div>
            <div className="metric-label">{t(locale, 'dashboard.enabledChannels')}</div>
          </div>

          <div className="metric-item">
            <div className="metric-value">
              {status ? formatUptime(status.uptime) : '0h 0m'}
            </div>
            <div className="metric-label">{t(locale, 'dashboard.uptime')}</div>
          </div>

          <div className="metric-item">
            <div className="metric-value">
              {((status?.loadBalancer?.cacheStats?.utilization || 0) * 100).toFixed(0)}%
            </div>
            <div className="metric-label">缓存利用率</div>
          </div>
        </div>
      </section>

      {/* 主要控制面板 */}
      {status && (
        <main className="control-panel">
          <div className="control-grid">
            {/* 负载均衡器控制 */}
            <div className="control-card">
              <h3 className="control-title">负载均衡</h3>
              <div className="control-content">
                <div className="current-strategy">
                  当前策略：<strong>{status.loadBalancer?.strategy || 'priority'}</strong>
                </div>
                <select
                  value={status.loadBalancer?.strategy || 'priority'}
                  onChange={(e) => onChangeStrategy(e.target.value as LoadBalancerStrategy)}
                  className="strategy-select"
                >
                  {strategies.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 系统概览 */}
            <div className="control-card">
              <h3 className="control-title">系统概览</h3>
              <div className="overview-stats">
                <div className="overview-item">
                  <span>路由规则</span>
                  <strong>{status?.routingRules || status?.stats?.routingRules || 0}</strong>
                </div>
                <div className="overview-item">
                  <span>转换器</span>
                  <strong>{status?.transformers || status?.stats?.transformers || 0}</strong>
                </div>
                <div className="overview-item">
                  <span>API端点</span>
                  <strong>{status?.endpoints ? Object.keys(status.endpoints).length : (status?.apiEndpoints || 0)}</strong>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* 离线状态提示 */}
      {!status && (
        <div className="offline-notice">
          <div className="offline-content">
            <h3>离线模式</h3>
            <p>当前未连接到后端服务，部分功能可能受限</p>
            <button onClick={onRefresh} className="btn-retry" disabled={loading}>
              {loading ? '连接中...' : '重新连接'}
            </button>
          </div>
        </div>
      )}

      {/* API端点列表 - 仅在有数据且需要时显示 */}
      {status?.endpoints && Object.keys(status.endpoints).length > 0 && (
        <section className="api-endpoints">
          <h3 className="section-title">API 端点</h3>
          <div className="endpoints-list">
            {Object.entries(status.endpoints).map(([name, path]) => (
              <div key={name} className="endpoint-item">
                <span className="endpoint-method">GET</span>
                <a
                  href={path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="endpoint-path"
                >
                  {path}
                </a>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}