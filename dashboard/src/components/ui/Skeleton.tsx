/**
 * 骨架屏组件库
 * 提供各种加载占位符组件,提升加载体验
 */

import React from 'react';

// ==================== 基础骨架屏组件 ====================

/**
 * 基础骨架屏盒子
 */
export function SkeletonBox({
  width,
  height,
  className = '',
}: {
  width?: string | number;
  height?: string | number;
  className?: string;
}): JSX.Element {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`bg-gray-200 rounded animate-pulse ${className}`}
      style={style}
    />
  );
}

/**
 * 骨架屏文本行
 */
export function SkeletonText({
  lines = 1,
  className = '',
}: {
  lines?: number;
  className?: string;
}): JSX.Element {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{ width: i === lines - 1 ? '75%' : '100%' }}
        />
      ))}
    </div>
  );
}

/**
 * 骨架屏圆形(用于头像)
 */
export function SkeletonCircle({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={`bg-gray-200 rounded-full animate-pulse ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// ==================== 复合骨架屏组件 ====================

/**
 * 卡片骨架屏
 */
export function SkeletonCard({
  showImage = false,
  lines = 3,
  className = '',
}: {
  showImage?: boolean;
  lines?: number;
  className?: string;
}): JSX.Element {
  return (
    <div className={`card ${className}`}>
      {showImage && <SkeletonBox height={200} className="mb-4" />}
      <SkeletonText lines={lines} />
    </div>
  );
}

/**
 * 表格骨架屏
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
}: {
  rows?: number;
  columns?: number;
  className?: string;
}): JSX.Element {
  return (
    <div className={`card overflow-hidden ${className}`}>
      {/* 表头 */}
      <div className="grid gap-4 p-4 border-b" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBox key={i} height={16} />
        ))}
      </div>

      {/* 表格行 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4 p-4 border-b border-gray-100"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonBox key={colIndex} height={16} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * 统计卡片骨架屏
 */
export function SkeletonStatCard({
  className = '',
}: {
  className?: string;
}): JSX.Element {
  return (
    <div className={`card ${className}`}>
      <SkeletonText lines={1} className="mb-2" />
      <SkeletonBox height={32} width={120} className="mb-2" />
      <SkeletonText lines={1} />
    </div>
  );
}

/**
 * 列表项骨架屏
 */
export function SkeletonListItem({
  showAvatar = false,
  className = '',
}: {
  showAvatar?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <div className={`flex items-center gap-4 p-4 ${className}`}>
      {showAvatar && <SkeletonCircle size={48} />}
      <div className="flex-1">
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

// ==================== 特定功能骨架屏 ====================

/**
 * Dashboard 骨架屏
 */
export function SkeletonDashboard(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard showImage={true} lines={2} />
        <SkeletonCard showImage={true} lines={2} />
      </div>

      {/* 表格区域 */}
      <SkeletonTable rows={8} columns={5} />
    </div>
  );
}

/**
 * 频道列表骨架屏
 */
export function SkeletonChannelList(): JSX.Element {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <SkeletonBox height={24} width={200} className="mb-3" />
              <SkeletonText lines={2} />
            </div>
            <div className="flex gap-2">
              <SkeletonBox width={80} height={36} />
              <SkeletonBox width={36} height={36} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 日志列表骨架屏
 */
export function SkeletonLogList(): JSX.Element {
  return (
    <div className="card">
      <div className="divide-y">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex items-start gap-4">
              <SkeletonBox width={120} height={16} />
              <div className="flex-1">
                <SkeletonText lines={2} />
              </div>
              <SkeletonBox width={80} height={24} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 图表骨架屏
 */
export function SkeletonChart({
  height = 400,
  className = '',
}: {
  height?: number;
  className?: string;
}): JSX.Element {
  return (
    <div className={`card ${className}`}>
      <SkeletonText lines={1} className="mb-4" />
      <SkeletonBox height={height} />
      <div className="flex justify-center gap-4 mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <SkeletonBox width={12} height={12} className="rounded-full" />
            <SkeletonBox width={60} height={12} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 设置页面骨架屏
 */
export function SkeletonSettings(): JSX.Element {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card">
          <SkeletonBox height={24} width={200} className="mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <SkeletonText lines={2} className="flex-1 max-w-md" />
                <SkeletonBox width={60} height={32} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== 通用加载组件 ====================

/**
 * 加载指示器
 */
export function LoadingSpinner({
  size = 'medium',
  className = '',
}: {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}): JSX.Element {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`spinner ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="加载中"
    />
  );
}

/**
 * 全屏加载
 */
export function FullPageLoader({
  message = '加载中...',
}: {
  message?: string;
}): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        <LoadingSpinner size="large" />
        <span className="ml-3 text-white text-xl mt-4">{message}</span>
      </div>
    </div>
  );
}

/**
 * 内容加载器
 */
export function ContentLoader({
  children,
  isLoading,
  skeleton,
  error,
  onRetry,
}: {
  children: React.ReactNode;
  isLoading: boolean;
  skeleton?: React.ReactNode;
  error?: Error | null;
  onRetry?: () => void;
}): JSX.Element {
  if (error) {
    return (
      <div className="card text-center py-12">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          加载失败
        </h3>
        <p className="text-gray-600 mb-4">{error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn btn-primary"
          >
            重试
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return skeleton || <FullPageLoader />;
  }

  return <>{children}</>;
}
