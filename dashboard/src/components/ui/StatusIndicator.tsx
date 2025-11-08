import React from 'react';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'loading';
  text?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'badge' | 'dot' | 'text';
}

/**
 * 状态指示器组件
 *
 * 用于显示系统、服务或连接状态的通用组件
 * 支持多种显示样式和尺寸
 */
export function StatusIndicator({
  status,
  text,
  size = 'medium',
  variant = 'badge'
}: StatusIndicatorProps) {
  const getStatusClasses = () => {
    const baseClasses = {
      badge: 'inline-flex items-center gap-2 px-3 py-1 rounded-full font-medium',
      dot: 'inline-flex items-center gap-2',
      text: 'inline-flex items-center gap-2'
    };

    const sizeClasses = {
      small: {
        badge: 'text-xs px-2 py-0.5',
        dot: 'text-xs',
        text: 'text-xs'
      },
      medium: {
        badge: 'text-sm px-3 py-1',
        dot: 'text-sm',
        text: 'text-sm'
      },
      large: {
        badge: 'text-base px-4 py-2',
        dot: 'text-base',
        text: 'text-base'
      }
    };

    const statusClasses = {
      online: {
        badge: 'bg-green-100 text-green-800',
        dot: 'text-green-600',
        text: 'text-green-600'
      },
      offline: {
        badge: 'bg-red-100 text-red-800',
        dot: 'text-red-600',
        text: 'text-red-600'
      },
      warning: {
        badge: 'bg-yellow-100 text-yellow-800',
        dot: 'text-yellow-600',
        text: 'text-yellow-600'
      },
      loading: {
        badge: 'bg-blue-100 text-blue-800',
        dot: 'text-blue-600',
        text: 'text-blue-600'
      }
    };

    return `${baseClasses[variant]} ${sizeClasses[size][variant]} ${statusClasses[status][variant]}`;
  };

  const getDotColor = () => {
    const colors = {
      online: 'bg-green-500',
      offline: 'bg-red-500',
      warning: 'bg-yellow-500',
      loading: 'bg-blue-500'
    };
    return colors[status];
  };

  const getStatusText = () => {
    if (text) return text;

    const defaultTexts = {
      online: '在线',
      offline: '离线',
      warning: '警告',
      loading: '加载中'
    };
    return defaultTexts[status];
  };

  const renderIndicator = () => {
    if (variant === 'dot') {
      return (
        <>
          <span className={`status-dot w-2 h-2 rounded-full ${getDotColor()}`}></span>
          <span>{getStatusText()}</span>
        </>
      );
    }

    if (variant === 'text') {
      return (
        <>
          {status === 'loading' && (
            <div className="loading-spinner w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          )}
          <span>{getStatusText()}</span>
        </>
      );
    }

    // badge variant
    return (
      <>
        {status === 'loading' ? (
          <div className="loading-spinner w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <span className={`status-dot w-2 h-2 rounded-full ${getDotColor()}`}></span>
        )}
        <span>{getStatusText()}</span>
      </>
    );
  };

  return (
    <div className={getStatusClasses()}>
      {renderIndicator()}
    </div>
  );
}