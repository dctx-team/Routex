/**
 * 实时图表组件库
 * Real-time Charts Components
 *
 * 使用 Recharts 实现高级数据可视化
 */

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { format } from 'date-fns';

/**
 * 图表主题配置
 */
export const chartTheme = {
  light: {
    grid: '#f3f4f6',
    text: '#6b7280',
    tooltip: {
      background: 'rgba(255, 255, 255, 0.95)',
      border: '#e5e7eb',
      text: '#111827',
    },
  },
  dark: {
    grid: '#374151',
    text: '#9ca3af',
    tooltip: {
      background: 'rgba(30, 41, 59, 0.95)',
      border: '#475569',
      text: '#f1f5f9',
    },
  },
};

/**
 * 颜色方案
 */
export const chartColors = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1',
};

/**
 * 自定义工具提示
 */
function CustomTooltip({ active, payload, label, labelFormatter, valueFormatter }: TooltipProps<any, any> & {
  labelFormatter?: (label: any) => string;
  valueFormatter?: (value: any) => string;
}) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        {labelFormatter ? labelFormatter(label) : label}
      </p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-4 text-xs">
          <span className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">{entry.name}</span>
          </span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {valueFormatter ? valueFormatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * 请求量趋势图
 */
export interface RequestTrendData {
  timestamp: string | number;
  requests: number;
  errors?: number;
  avgLatency?: number;
}

export function RequestTrendChart({
  data,
  height = 300,
  showErrors = true,
  showLatency = false,
}: {
  data: RequestTrendData[];
  height?: number;
  showErrors?: boolean;
  showLatency?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
          </linearGradient>
          {showErrors && (
            <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.error} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartColors.error} stopOpacity={0} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.light.grid} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(value) => format(new Date(value), 'HH:mm')}
          stroke={chartTheme.light.text}
          style={{ fontSize: '12px' }}
        />
        <YAxis stroke={chartTheme.light.text} style={{ fontSize: '12px' }} />
        <Tooltip
          content={
            <CustomTooltip
              labelFormatter={(label) => format(new Date(label), 'yyyy-MM-dd HH:mm:ss')}
            />
          }
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="requests"
          name="请求数"
          stroke={chartColors.primary}
          fill="url(#colorRequests)"
          strokeWidth={2}
        />
        {showErrors && (
          <Area
            type="monotone"
            dataKey="errors"
            name="错误数"
            stroke={chartColors.error}
            fill="url(#colorErrors)"
            strokeWidth={2}
          />
        )}
        {showLatency && (
          <Line
            type="monotone"
            dataKey="avgLatency"
            name="平均延迟 (ms)"
            stroke={chartColors.warning}
            strokeWidth={2}
            dot={false}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * 频道使用分布图
 */
export interface ChannelUsageData {
  name: string;
  value: number;
  percentage?: number;
}

export function ChannelUsageChart({
  data,
  height = 300,
}: {
  data: ChannelUsageData[];
  height?: number;
}) {
  const colors = [
    chartColors.primary,
    chartColors.success,
    chartColors.warning,
    chartColors.error,
    chartColors.purple,
    chartColors.pink,
    chartColors.indigo,
    chartColors.info,
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          content={
            <CustomTooltip
              valueFormatter={(value) => `${value} 次请求`}
            />
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/**
 * 响应时间分布图
 */
export interface LatencyDistributionData {
  range: string;
  count: number;
}

export function LatencyDistributionChart({
  data,
  height = 300,
}: {
  data: LatencyDistributionData[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.light.grid} />
        <XAxis
          dataKey="range"
          stroke={chartTheme.light.text}
          style={{ fontSize: '12px' }}
        />
        <YAxis stroke={chartTheme.light.text} style={{ fontSize: '12px' }} />
        <Tooltip
          content={
            <CustomTooltip
              valueFormatter={(value) => `${value} 次请求`}
            />
          }
        />
        <Bar dataKey="count" name="请求数" fill={chartColors.info} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * 成功率趋势图
 */
export interface SuccessRateData {
  timestamp: string | number;
  successRate: number;
  total: number;
}

export function SuccessRateChart({
  data,
  height = 300,
}: {
  data: SuccessRateData[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.light.grid} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(value) => format(new Date(value), 'HH:mm')}
          stroke={chartTheme.light.text}
          style={{ fontSize: '12px' }}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
          stroke={chartTheme.light.text}
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          content={
            <CustomTooltip
              labelFormatter={(label) => format(new Date(label), 'yyyy-MM-dd HH:mm:ss')}
              valueFormatter={(value) => `${value.toFixed(2)}%`}
            />
          }
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="successRate"
          name="成功率"
          stroke={chartColors.success}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * 多指标对比图
 */
export interface MetricComparisonData {
  timestamp: string | number;
  [key: string]: any;
}

export function MetricComparisonChart({
  data,
  metrics,
  height = 300,
}: {
  data: MetricComparisonData[];
  metrics: { key: string; name: string; color: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.light.grid} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(value) => format(new Date(value), 'HH:mm')}
          stroke={chartTheme.light.text}
          style={{ fontSize: '12px' }}
        />
        <YAxis stroke={chartTheme.light.text} style={{ fontSize: '12px' }} />
        <Tooltip
          content={
            <CustomTooltip
              labelFormatter={(label) => format(new Date(label), 'yyyy-MM-dd HH:mm:ss')}
            />
          }
        />
        <Legend />
        {metrics.map((metric) => (
          <Line
            key={metric.key}
            type="monotone"
            dataKey={metric.key}
            name={metric.name}
            stroke={metric.color}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * 实时统计卡片
 */
export interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel = '与昨天相比',
  icon,
  color = 'primary',
  loading = false,
}: StatCardProps) {
  const colorClasses = {
    primary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-cyan-500',
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
        <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {value}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              <span
                className={`text-sm font-medium ${
                  change > 0
                    ? 'text-green-600 dark:text-green-400'
                    : change < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {change > 0 ? '↑' : change < 0 ? '↓' : '−'} {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {changeLabel}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className={`${colorClasses[color]} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 迷你趋势图卡片
 */
export function MiniTrendCard({
  title,
  value,
  data,
  color = chartColors.primary,
}: {
  title: string;
  value: string | number;
  data: { value: number }[];
  color?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        {title}
      </p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        {value}
      </p>
      <ResponsiveContainer width="100%" height={60}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`mini-gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={`url(#mini-gradient-${title})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
