import React from 'react';
import type { SystemStatus } from '../types';

interface HeaderProps {
  status: SystemStatus | null;
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
}

export function Header({ status, onRefresh, loading, error }: HeaderProps) {
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* 左侧：状态信息 */}
        <div className="flex items-center space-x-6">
          {/* 系统状态 */}
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              status ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm font-medium text-gray-900">
              {status ? '系统正常运行' : '离线模式'}
            </span>
          </div>

          {/* 运行时间 */}
          {status && (
            <div className="text-sm text-gray-500">
              运行时间: {formatUptime(status.uptime)}
            </div>
          )}

          {/* 版本信息 */}
          {status && (
            <div className="text-sm text-gray-500">
              版本: {status.version}
            </div>
          )}
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center space-x-3">
          {/* 错误提示 */}
          {error && (
            <div className="flex items-center space-x-2 text-sm text-red-600">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* 刷新按钮 */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                <span>刷新中...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>刷新</span>
              </>
            )}
          </button>

          {/* 快捷操作 */}
          <div className="flex items-center space-x-1 px-3 py-2 bg-gray-100 rounded-lg">
            <kbd className="text-xs text-gray-600">Ctrl</kbd>
            <span className="text-xs text-gray-500">+</span>
            <kbd className="text-xs text-gray-600">K</kbd>
          </div>
        </div>
      </div>

      {/* 进度条（加载时显示） */}
      {loading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-200">
          <div className="h-full bg-blue-600 animate-pulse" />
        </div>
      )}
    </header>
  );
}