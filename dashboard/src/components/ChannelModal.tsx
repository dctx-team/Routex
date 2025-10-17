import React, { useState, useEffect } from 'react';
import type { Channel } from '../types';

interface ChannelModalProps {
  channel: Channel | null;
  onClose: () => void;
  onSave: (channel: Channel) => void;
}

export function ChannelModal({ channel, onClose, onSave }: ChannelModalProps) {
  const [formData, setFormData] = useState<Channel>({
    name: '',
    type: 'anthropic',
    baseURL: 'https://api.anthropic.com',
    apiKey: '',
    models: [],
    priority: 1,
    weight: 1,
    status: 'enabled',
  });

  useEffect(() => {
    if (channel) {
      setFormData(channel);
    }
  }, [channel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleModelsChange = (value: string) => {
    const models = value.split('\n').filter(m => m.trim()).map(m => m.trim());
    setFormData({ ...formData, models: models.length > 0 ? models : undefined });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideIn">
        <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">
              {channel ? '编辑渠道' : '添加渠道'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                渠道名称 *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="例如: Claude-Pro-1"
                disabled={!!channel}
              />
              <p className="text-xs text-gray-500 mt-1">为渠道指定一个唯一的名称</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API 类型 *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Channel['type'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="google">Google</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base URL *
              </label>
              <input
                type="url"
                required
                value={formData.baseURL}
                onChange={(e) => setFormData({ ...formData, baseURL: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://api.anthropic.com"
              />
              <p className="text-xs text-gray-500 mt-1">API 服务的基础 URL</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key *
              </label>
              <input
                type="password"
                required
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="sk-..."
              />
              <p className="text-xs text-gray-500 mt-1">API 密钥（将安全存储）</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                支持的模型
              </label>
              <textarea
                value={(formData.models || []).join('\n')}
                onChange={(e) => handleModelsChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[100px]"
                placeholder="每行一个模型，例如:&#10;claude-sonnet-4-5-20250929&#10;claude-opus-4-1-20250805"
              />
              <p className="text-xs text-gray-500 mt-1">留空表示支持所有模型</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  优先级
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">数字越小优先级越高 (1-100)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  权重
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">用于加权随机策略 (0-100)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Channel['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="enabled">启用</option>
                <option value="disabled">禁用</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-gray-200">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              取消
            </button>
            <button type="submit" className="btn btn-success">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
