import React from 'react';
import type { SystemStatus, LoadBalancerStrategy } from '../types';

interface DashboardProps {
  status: SystemStatus;
  onRefresh: () => void;
  onCreateChannel: () => void;
  onChangeStrategy: (strategy: LoadBalancerStrategy) => void;
}

export function Dashboard({ status, onRefresh, onCreateChannel, onChangeStrategy }: DashboardProps) {
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const strategies: { value: LoadBalancerStrategy; label: string }[] = [
    { value: 'priority', label: '优先级策略 (Priority)' },
    { value: 'round_robin', label: '轮询策略 (Round Robin)' },
    { value: 'weighted', label: '加权随机 (Weighted)' },
    { value: 'least_used', label: '最少使用 (Least Used)' },
  ];

  return (
    <div className="space-y-6 mb-8">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🎯 Routex Dashboard
              <span className="ml-3 inline-block px-3 py-1 bg-green-500 text-white text-sm rounded-full">
                运行中
              </span>
            </h1>
            <p className="text-gray-600">Next-generation AI API Router and Load Balancer</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onRefresh} className="btn btn-primary">
              🔄 刷新数据
            </button>
            <button onClick={onCreateChannel} className="btn btn-success">
              ➕ 添加渠道
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card from-blue-500 to-blue-600">
          <div>
            <p className="text-blue-100 text-sm">版本</p>
            <p className="text-2xl font-bold">{status.version}</p>
          </div>
          <div className="text-4xl">📊</div>
        </div>

        <div className="stat-card from-green-500 to-green-600">
          <div>
            <p className="text-green-100 text-sm">运行时间</p>
            <p className="text-xl font-bold">{formatUptime(status.uptime)}</p>
          </div>
          <div className="text-4xl">⏱️</div>
        </div>

        <div className="stat-card from-purple-500 to-purple-600">
          <div>
            <p className="text-purple-100 text-sm">总渠道数</p>
            <p className="text-2xl font-bold">{status.stats.totalChannels}</p>
          </div>
          <div className="text-4xl">📡</div>
        </div>

        <div className="stat-card from-pink-500 to-pink-600">
          <div>
            <p className="text-pink-100 text-sm">启用渠道</p>
            <p className="text-2xl font-bold">{status.stats.enabledChannels}</p>
          </div>
          <div className="text-4xl">✅</div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Load Balancer */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
            ⚖️ 负载均衡
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">当前策略</span>
              <span className="font-semibold text-gray-800">{status.loadBalancer.strategy}</span>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">切换策略</label>
              <select
                value={status.loadBalancer.strategy}
                onChange={(e) => onChangeStrategy(e.target.value as LoadBalancerStrategy)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {strategies.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Cache Stats */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
            💾 缓存统计
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">缓存大小</span>
              <span className="font-semibold text-gray-800">{status.loadBalancer.cacheStats.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">最大容量</span>
              <span className="font-semibold text-gray-800">{status.loadBalancer.cacheStats.maxSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">利用率</span>
              <span className="font-semibold text-gray-800">
                {status.loadBalancer.cacheStats.utilizationPercent.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${status.loadBalancer.cacheStats.utilizationPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* System Stats */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
            📈 系统统计
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">路由规则</span>
              <span className="font-semibold text-gray-800">{status.stats.routingRules}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Transformers</span>
              <span className="font-semibold text-gray-800">{status.stats.transformers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">API 端点</span>
              <span className="font-semibold text-gray-800">{Object.keys(status.endpoints).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* API Endpoints */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
          🛣️ API 端点
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(status.endpoints).map(([name, path]) => (
            <div
              key={name}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="px-2 py-1 bg-primary-500 text-white text-xs font-semibold rounded">
                GET
              </span>
              <a
                href={path}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 font-mono text-sm truncate"
              >
                {path}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
