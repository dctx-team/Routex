import React from 'react';
import type { Channel } from '../types';

interface ChannelListProps {
  channels: Channel[];
  onEdit: (channel: Channel) => void;
  onDelete: (name: string) => void;
  onToggle: (channel: Channel) => void;
}

export function ChannelList({ channels, onEdit, onDelete, onToggle }: ChannelListProps) {
  if (channels.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500 text-lg">暂无渠道，点击上方"添加渠道"按钮创建</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-gray-800 mb-6 pb-3 border-b-2 border-gray-200">
        📡 渠道列表
      </h2>
      <div className="space-y-4">
        {channels.map((channel) => (
          <div
            key={channel.name}
            className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
              channel.status === 'enabled'
                ? 'bg-green-50 border-green-500'
                : 'bg-gray-50 border-gray-400 opacity-60'
            }`}
          >
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 text-lg">{channel.name}</h3>
              <div className="text-sm text-gray-600 mt-1 space-x-4">
                <span>类型: {channel.type}</span>
                <span>模型: {channel.models?.join(', ') || '全部'}</span>
                <span>优先级: {channel.priority}</span>
                <span>权重: {channel.weight}</span>
                <span className={channel.status === 'enabled' ? 'text-green-600 font-medium' : 'text-gray-500'}>
                  {channel.status === 'enabled' ? '✓ 启用' : '✗ 禁用'}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onEdit(channel)} className="btn btn-primary text-sm">
                编辑
              </button>
              <button
                onClick={() => onToggle(channel)}
                className={`btn text-sm ${channel.status === 'enabled' ? 'btn-secondary' : 'btn-success'}`}
              >
                {channel.status === 'enabled' ? '禁用' : '启用'}
              </button>
              <button onClick={() => onDelete(channel.name)} className="btn btn-danger text-sm">
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
