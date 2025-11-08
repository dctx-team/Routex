import React, { useState } from 'react';
import type { SystemStatus, Channel } from '../types';

interface MonitoringProps {
  status: SystemStatus | null;
  channels: Channel[];
  onRefresh: () => void;
  loading: boolean;
}

export function Monitoring({ status, channels, onRefresh, loading }: MonitoringProps) {
  const [activeTab, setActiveTab] = useState<'performance' | 'logs' | 'analytics'>('performance');

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">监控分析</h1>
          <p className="text-gray-600 mt-1">
            系统性能监控和日志分析
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '刷新中...' : '刷新数据'}
        </button>
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'performance', label: '性能监控', icon: '📊' },
            { id: 'logs', label: '请求日志', icon: '📜' },
            { id: 'analytics', label: '数据分析', icon: '📈' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 内容区域 */}
      {activeTab === 'performance' && <PerformanceTab status={status} channels={channels} />}
      {activeTab === 'logs' && <LogsTab />}
      {activeTab === 'analytics' && <AnalyticsTab status={status} channels={channels} />}
    </div>
  );
}

function PerformanceTab({ status, channels }: { status: SystemStatus | null; channels: Channel[] }) {
  return (
    <div className="space-y-6">
      {/* 关键指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="活跃渠道"
          value={channels.filter(c => c.status === 'enabled').length}
          total={channels.length}
          icon="📡"
        />
        <MetricCard
          title="缓存使用率"
          value={`${((status?.loadBalancer?.cacheStats?.utilization || 0) * 100).toFixed(1)}%`}
          icon="💾"
        />
        <MetricCard
          title="系统运行时间"
          value={status ? formatUptime(status.uptime) : '0h 0m 0s'}
          icon="⏱️"
        />
        <MetricCard
          title="API 端点"
          value={status?.endpoints ? Object.keys(status.endpoints).length : 0}
          icon="🔌"
        />
      </div>

      {/* 性能图表占位 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">性能趋势</h2>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500">
          <div className="text-center">
            <span className="text-4xl mb-2 block">📈</span>
            <p>性能图表功能开发中...</p>
          </div>
        </div>
      </div>

      {/* 渠道状态 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">渠道状态</h2>
        <div className="space-y-3">
          {channels.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无渠道数据</p>
          ) : (
            channels.map((channel) => (
              <div
                key={channel.name}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    channel.status === 'enabled' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <div>
                    <div className="font-medium text-gray-900">{channel.name}</div>
                    <div className="text-sm text-gray-500">{channel.type}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">优先级</div>
                  <div className="font-medium">{channel.priority || 0}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function LogsTab() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">请求日志</h2>
      <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500">
        <div className="text-center">
          <span className="text-4xl mb-2 block">📜</span>
          <p>日志查看功能开发中...</p>
          <p className="text-sm mt-2">将显示最新的API请求日志</p>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab({ status, channels }: { status: SystemStatus | null; channels: Channel[] }) {
  return (
    <div className="space-y-6">
      {/* 数据统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">使用统计</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">总请求数</span>
              <span className="font-semibold">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">成功率</span>
              <span className="font-semibold">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">平均响应时间</span>
              <span className="font-semibold">--</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">渠道分布</h2>
          <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500">
            <div className="text-center">
              <span className="text-3xl mb-2 block">📊</span>
              <p>分布图表开发中...</p>
            </div>
          </div>
        </div>
      </div>

      {/* 趋势分析 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">趋势分析</h2>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500">
          <div className="text-center">
            <span className="text-4xl mb-2 block">📈</span>
            <p>趋势分析功能开发中...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  total?: number;
  icon: string;
}

function MetricCard({ title, value, total, icon }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {total !== undefined && (
            <p className="text-sm text-gray-500">总计: {total}</p>
          )}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}