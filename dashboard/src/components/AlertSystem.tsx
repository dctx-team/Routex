/**
 * 告警系统组件
 * Alert System Components
 *
 * 实时告警通知和规则配置
 */

import React, { useState, useEffect } from 'react';
import { useGlobalStore } from '../stores/globalStore';

/**
 * 告警级别
 */
export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

/**
 * 告警接口
 */
export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  timestamp: number;
  source?: string;
  acknowledged?: boolean;
  metadata?: Record<string, any>;
}

/**
 * 告警规则接口
 */
export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  level: AlertLevel;
  conditions: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration?: number; // 持续时间（秒）
  };
  actions: {
    notify?: boolean;
    webhook?: string;
    email?: string[];
  };
  cooldown?: number; // 冷却时间（秒）
}

/**
 * 告警级别配置
 */
const alertLevelConfig = {
  info: {
    icon: 'ℹ️',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  warning: {
    icon: '⚠️',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  error: {
    icon: '❌',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    borderColor: 'border-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
  },
  critical: {
    icon: '🚨',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
  },
};

/**
 * 告警卡片组件
 */
export function AlertCard({
  alert,
  onAcknowledge,
  onDismiss,
}: {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
  onDismiss?: (id: string) => void;
}) {
  const config = alertLevelConfig[alert.level];
  const timeAgo = getTimeAgo(alert.timestamp);

  return (
    <div
      className={`rounded-lg border-l-4 ${config.borderColor} ${config.bgColor} p-4 shadow-sm`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                {alert.title}
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                {alert.message}
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>{timeAgo}</span>
                {alert.source && <span>来源: {alert.source}</span>}
                {alert.acknowledged && (
                  <span className="text-green-600 dark:text-green-400">✓ 已确认</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {!alert.acknowledged && onAcknowledge && (
                <button
                  onClick={() => onAcknowledge(alert.id)}
                  className="text-xs px-2 py-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                  title="确认告警"
                >
                  确认
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="关闭"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 告警列表组件
 */
export function AlertList({
  alerts,
  onAcknowledge,
  onDismiss,
  maxHeight = '400px',
}: {
  alerts: Alert[];
  onAcknowledge?: (id: string) => void;
  onDismiss?: (id: string) => void;
  maxHeight?: string;
}) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <p className="text-gray-500 dark:text-gray-400">暂无告警</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" style={{ maxHeight, overflowY: 'auto' }}>
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onAcknowledge={onAcknowledge}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

/**
 * 告警中心徽章
 */
export function AlertBadge({
  count,
  onClick,
}: {
  count: number;
  onClick?: () => void;
}) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
      title={`${count} 个未读告警`}
    >
      <span className="text-xl">🔔</span>
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
        {count > 9 ? '9+' : count}
      </span>
    </button>
  );
}

/**
 * 告警规则编辑器
 */
export function AlertRuleEditor({
  rule,
  onSave,
  onCancel,
}: {
  rule?: AlertRule;
  onSave: (rule: AlertRule) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<AlertRule>(
    rule || {
      id: `rule-${Date.now()}`,
      name: '',
      enabled: true,
      level: 'warning',
      conditions: {
        metric: 'error_rate',
        operator: 'gt',
        threshold: 5,
      },
      actions: {
        notify: true,
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          规则名称
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          描述
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            告警级别
          </label>
          <select
            value={formData.level}
            onChange={(e) =>
              setFormData({ ...formData, level: e.target.value as AlertLevel })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="info">信息</option>
            <option value="warning">警告</option>
            <option value="error">错误</option>
            <option value="critical">严重</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            监控指标
          </label>
          <select
            value={formData.conditions.metric}
            onChange={(e) =>
              setFormData({
                ...formData,
                conditions: { ...formData.conditions, metric: e.target.value },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="error_rate">错误率 (%)</option>
            <option value="response_time">响应时间 (ms)</option>
            <option value="request_count">请求数</option>
            <option value="cpu_usage">CPU 使用率 (%)</option>
            <option value="memory_usage">内存使用率 (%)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            条件
          </label>
          <select
            value={formData.conditions.operator}
            onChange={(e) =>
              setFormData({
                ...formData,
                conditions: {
                  ...formData.conditions,
                  operator: e.target.value as any,
                },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="gt">大于 (&gt;)</option>
            <option value="gte">大于等于 (≥)</option>
            <option value="lt">小于 (&lt;)</option>
            <option value="lte">小于等于 (≤)</option>
            <option value="eq">等于 (=)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            阈值
          </label>
          <input
            type="number"
            value={formData.conditions.threshold}
            onChange={(e) =>
              setFormData({
                ...formData,
                conditions: {
                  ...formData.conditions,
                  threshold: Number(e.target.value),
                },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="enabled"
          checked={formData.enabled}
          onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
          className="rounded border-gray-300 dark:border-slate-600"
        />
        <label htmlFor="enabled" className="text-sm text-gray-700 dark:text-gray-300">
          启用此规则
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="notify"
          checked={formData.actions.notify}
          onChange={(e) =>
            setFormData({
              ...formData,
              actions: { ...formData.actions, notify: e.target.checked },
            })
          }
          className="rounded border-gray-300 dark:border-slate-600"
        />
        <label htmlFor="notify" className="text-sm text-gray-700 dark:text-gray-300">
          发送通知
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          保存规则
        </button>
      </div>
    </form>
  );
}

/**
 * 工具函数：获取相对时间
 */
function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds} 秒前`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
  return `${Math.floor(seconds / 86400)} 天前`;
}
