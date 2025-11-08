/**
 * Card 卡片组件
 * 统一的卡片容器样式
 */

import React, { type HTMLAttributes, type ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  padding?: 'none' | 'small' | 'medium' | 'large';
  hoverable?: boolean;
}

export function Card({
  title,
  subtitle,
  actions,
  padding = 'medium',
  hoverable = false,
  className = '',
  children,
  ...props
}: CardProps): JSX.Element {
  // 基础样式
  const baseClasses = 'bg-white/95 backdrop-blur-sm rounded-lg shadow-md';

  // 内边距样式
  const paddingClasses = {
    none: '',
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8',
  };

  // 悬停效果
  const hoverClasses = hoverable ? 'hover:shadow-lg transition-shadow duration-200' : '';

  // 合并类名
  const combinedClasses = `${baseClasses} ${paddingClasses[padding]} ${hoverClasses} ${className}`;

  return (
    <div className={combinedClasses} {...props}>
      {/* 标题栏 */}
      {(title || subtitle || actions) && (
        <div className="mb-4 flex items-start justify-between">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* 内容 */}
      {children}
    </div>
  );
}
