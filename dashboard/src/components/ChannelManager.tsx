import React, { useState } from 'react';
import type { Channel } from '../types';

interface ChannelManagerProps {
  channels: Channel[];
  onEdit: (channel: Channel) => void;
  onDelete: (name: string) => void;
  onToggle: (channel: Channel) => void;
  onCreate: () => void;
  loading: boolean;
}

export function ChannelManager({ channels, onEdit, onDelete, onToggle, onCreate, loading }: ChannelManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');

  // 过滤渠道
  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         channel.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || channel.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: channels.length,
    enabled: channels.filter(c => c.status === 'enabled').length,
    disabled: channels.filter(c => c.status === 'disabled').length,
  };

  return (
    <div className="space-y-6">
      {/* 头部操作区 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">渠道管理</h1>
          <p className="text-gray-600 mt-1">
            管理和配置 API 渠道
          </p>
        </div>
        <button
          onClick={onCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          + 添加渠道
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="总渠道数" value={stats.total} color="blue" />
        <StatCard title="已启用" value={stats.enabled} color="green" />
        <StatCard title="已禁用" value={stats.disabled} color="gray" />
      </div>

      {/* 过滤和搜索 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索渠道名称或类型..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 状态过滤 */}
          <div className="flex space-x-2">
            {(['all', 'enabled', 'disabled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? '全部' : status === 'enabled' ? '已启用' : '已禁用'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 渠道列表 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p>加载中...</p>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <span className="text-4xl mb-4 block">📡</span>
            <p className="text-lg font-medium mb-2">
              {searchTerm ? '未找到匹配的渠道' : '暂无渠道'}
            </p>
            <p className="text-sm">
              {searchTerm ? '尝试调整搜索条件' : '点击上方按钮添加第一个渠道'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    渠道名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    优先级
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    权重
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredChannels.map((channel) => (
                  <ChannelRow
                    key={channel.name}
                    channel={channel}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggle={onToggle}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

interface ChannelRowProps {
  channel: Channel;
  onEdit: (channel: Channel) => void;
  onDelete: (name: string) => void;
  onToggle: (channel: Channel) => void;
}

function ChannelRow({ channel, onEdit, onDelete, onToggle }: ChannelRowProps) {
  const handleToggle = () => {
    onToggle(channel);
  };

  const handleEdit = () => {
    onEdit(channel);
  };

  const handleDelete = () => {
    onDelete(channel.name);
  };

  const isEnabled = channel.status === 'enabled';

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div>
            <div className="text-sm font-medium text-gray-900">
              {channel.name}
            </div>
            <div className="text-sm text-gray-500">
              {channel.baseURL || '无URL'}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {channel.type}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={handleToggle}
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
            isEnabled
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          <span className={`w-2 h-2 rounded-full mr-1.5 ${
            isEnabled ? 'bg-green-400' : 'bg-gray-400'
          }`} />
          {isEnabled ? '已启用' : '已禁用'}
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {channel.priority || 0}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {channel.weight || 1}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleEdit}
            className="text-blue-600 hover:text-blue-900 font-medium"
          >
            编辑
          </button>
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-900 font-medium"
          >
            删除
          </button>
        </div>
      </td>
    </tr>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  color: 'blue' | 'green' | 'gray';
}

function StatCard({ title, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium">{title}</div>
    </div>
  );
}