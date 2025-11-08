/**
 * Input 输入框组件
 * 统一的输入框样式
 */

import React, { type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  fullWidth?: boolean;
}

export function Input({
  label,
  error,
  helpText,
  fullWidth = false,
  className = '',
  ...props
}: InputProps): JSX.Element {
  // 基础样式
  const baseClasses = 'px-4 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed';

  // 状态样式
  const stateClasses = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:border-primary-500';

  // 宽度样式
  const widthClasses = fullWidth ? 'w-full' : '';

  // 合并类名
  const combinedClasses = `${baseClasses} ${stateClasses} ${widthClasses} ${className}`;

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {/* 标签 */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* 输入框 */}
      <input className={combinedClasses} {...props} />

      {/* 错误信息 */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* 帮助文本 */}
      {!error && helpText && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
}
