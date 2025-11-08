/**
 * Select 选择器组件
 * 统一的下拉选择样式
 */

import React, { type SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  fullWidth?: boolean;
  options: Array<{ value: string | number; label: string }>;
}

export function Select({
  label,
  error,
  helpText,
  fullWidth = false,
  options,
  className = '',
  ...props
}: SelectProps): JSX.Element {
  // 基础样式
  const baseClasses = 'px-4 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white';

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

      {/* 选择器 */}
      <select className={combinedClasses} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

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
