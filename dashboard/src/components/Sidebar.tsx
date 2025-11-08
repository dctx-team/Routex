import React from 'react';
import type { View } from '../App.simplified';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const navigationItems = [
  {
    id: 'overview' as View,
    label: '概览',
    icon: '🏠',
    description: '系统状态和快速操作',
  },
  {
    id: 'channels' as View,
    label: '渠道管理',
    icon: '📡',
    description: 'API渠道配置和管理',
  },
  {
    id: 'monitoring' as View,
    label: '监控分析',
    icon: '📊',
    description: '性能监控和日志分析',
  },
  {
    id: 'settings' as View,
    label: '系统设置',
    icon: '⚙️',
    description: '系统配置和高级选项',
  },
];

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Routex Dashboard
        </h2>

        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <div className="flex-1 text-left">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 底部信息 */}
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <div className="mb-2">快速提示</div>
          <ul className="space-y-1">
            <li>• 点击渠道名称查看详情</li>
            <li>• 使用快捷键 Ctrl+K 搜索</li>
            <li>• 双击卡片快速编辑</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}