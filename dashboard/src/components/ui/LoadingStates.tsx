import React from 'react';
import { LoadingSpinner } from './Skeleton';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * 全屏加载组件
 */
export const FullPageLoader: React.FC<LoadingSpinnerProps> = ({
  message = '加载中...',
  size = 'medium'
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center">
        <LoadingSpinner size={size} />
        <span className="ml-3 text-white text-xl">{message}</span>
      </div>
    </div>
  );
};

interface ErrorFallbackProps {
  error: string;
  onRetry?: () => void;
  retryText?: string;
}

/**
 * 错误回退组件
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  retryText = '重试'
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-red-500 text-white rounded-lg p-6 max-w-md">
        <h2 className="text-xl font-bold mb-2">加载失败</h2>
        <p className="mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn btn-secondary"
          >
            {retryText}
          </button>
        )}
      </div>
    </div>
  );
};