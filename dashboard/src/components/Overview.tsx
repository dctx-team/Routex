import React from 'react';
import type { SystemStatus, LoadBalancerStrategy } from '../types';

interface OverviewProps {
  status: SystemStatus | null;
  onRefresh: () => void;
  onCreateChannel: () => void;
  onChangeStrategy: (strategy: LoadBalancerStrategy) => void;
  loading: boolean;
}

export function Overview({ status, onRefresh, onCreateChannel, onChangeStrategy, loading }: OverviewProps) {
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const strategies: { value: LoadBalancerStrategy; label: string }[] = [
    { value: 'priority', label: '优先级' },
    { value: 'round_robin', label: '轮询' },
    { value: 'weighted', label: '加权' },
    { value: 'least_used', label: '最少使用' },
  ];

  return (
    <div className="space-y-6">
      {/* 快速操作区域 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">系统概览</h1>
            <p className="text-blue-100">
              {status ? '系统运行正常' : '离线模式 - 请检查后端服务'}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onCreateChannel}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              + 添加渠道
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-400 transition-colors disabled:opacity-50"
            >
              {loading ? '刷新中...' : '刷新数据'}
            </button>
          </div>
        </div>
      </div>

      {/* 关键指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="总渠道数"
          value={status?.totalChannels || 0}
          icon="📡"
          color="blue"
        />
        <MetricCard
          title="活跃渠道"
          value={status?.enabledChannels || 0}
          icon="✅"
          color="green"
        />
        <MetricCard
          title="运行时间"
          value={status ? formatUptime(status.uptime) : '0h 0m 0s'}
          icon="⏱️"
          color="purple"
        />
        <MetricCard
          title="缓存使用率"
          value={`${((status?.loadBalancer?.cacheStats?.utilization || 0) * 100).toFixed(1)}%`}
          icon="💾"
          color="orange"
        />
      </div>

      {/* 详细信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 负载均衡器设置 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">负载均衡器</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                当前策略
              </label>
              <select
                value={status?.loadBalancer?.strategy || 'priority'}
                onChange={(e) => onChangeStrategy(e.target.value as LoadBalancerStrategy)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {strategies.map((strategy) => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">缓存大小:</span>
                <span className="ml-2 font-medium">
                  {status?.loadBalancer?.cacheStats?.size || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-500">最大容量:</span>
                <span className="ml-2 font-medium">
                  {status?.loadBalancer?.cacheStats?.maxCapacity || 1000}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 系统统计 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">系统统计</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">路由规则</span>
              <span className="font-semibold text-gray-900">
                {status?.routingRules || 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">转换器</span>
              <span className="font-semibold text-gray-900">
                {status?.transformers || 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">API 端点</span>
              <span className="font-semibold text-gray-900">
                {status?.endpoints ? Object.keys(status.endpoints).length : 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 离线提示 */}
      {!status && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">🔌</span>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                离线模式
              </h3>
              <p className="text-yellow-700 mb-4">
                当前未连接到后端服务。请检查服务状态或尝试重新连接。
              </p>
              <button
                onClick={onRefresh}
                disabled={loading}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 disabled:opacity-50"
              >
                {loading ? '连接中...' : '重新连接'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <div className={`bg-white rounded-lg border ${colorClasses[color].split(' ')[2]} p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}