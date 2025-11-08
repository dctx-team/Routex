import React from 'react';

interface MetricCardProps {
  value: string | number;
  label: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'highlight' | 'warning';
}

/**
 * 指标卡片组件
 *
 * 用于展示单一指标的简洁卡片
 * 支持趋势显示、图标和不同尺寸
 */
export function MetricCard({
  value,
  label,
  trend,
  icon,
  size = 'medium',
  variant = 'default'
}: MetricCardProps) {
  const getClasses = () => {
    const sizeClasses = {
      small: 'p-4',
      medium: 'p-6',
      large: 'p-8'
    };

    const variantClasses = {
      default: 'bg-white border-gray-200',
      highlight: 'bg-blue-50 border-blue-200',
      warning: 'bg-amber-50 border-amber-200'
    };

    return `metric-card ${sizeClasses[size]} ${variantClasses[variant]}`;
  };

  const getTrendIcon = () => {
    if (!trend) return null;

    const directionIcons = {
      up: '↗',
      down: '↘',
      neutral: '→'
    };

    const directionColors = {
      up: 'text-green-600',
      down: 'text-red-600',
      neutral: 'text-gray-600'
    };

    return (
      <span className={`trend-indicator ${directionColors[trend.direction]}`}>
        {directionIcons[trend.direction]} {Math.abs(trend.value)}%
      </span>
    );
  };

  const getValueSize = () => {
    const sizes = {
      small: 'text-2xl',
      medium: 'text-3xl',
      large: 'text-4xl'
    };
    return sizes[size];
  };

  return (
    <div className={getClasses()}>
      <div className="metric-content">
        <div className="metric-header">
          {icon && <div className="metric-icon">{icon}</div>}
          {trend && <div className="metric-trend">{getTrendIcon()}</div>}
        </div>

        <div className={`metric-value ${getValueSize()}`}>
          {value}
        </div>

        <div className="metric-label">
          {label}
        </div>
      </div>
    </div>
  );
}