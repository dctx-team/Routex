/**
 * 错误边界组件
 * 捕获组件树中的 JavaScript 错误,记录错误并显示友好的降级 UI
 */

import React, { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 错误边界组件
 *
 * 使用示例:
 * <ErrorBoundary>
 *   <SomeComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 更新 state 以便下次渲染显示降级 UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误信息
    console.error('ErrorBoundary 捕获到错误:', error, errorInfo);

    // 更新 state
    this.setState({
      error,
      errorInfo,
    });

    // 调用自定义错误处理器
    this.props.onError?.(error, errorInfo);

    // TODO: 将错误发送到错误报告服务
    // 例如: Sentry, LogRocket, etc.
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 如果提供了自定义降级 UI,使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认降级 UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">😵</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                哎呀,出错了!
              </h1>
              <p className="text-gray-600">
                应用程序遇到了一个意外错误。请尝试刷新页面。
              </p>
            </div>

            {/* 错误详情(仅开发环境) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900 mb-2">
                  查看错误详情
                </summary>
                <div className="bg-gray-100 rounded-lg p-4 overflow-auto max-h-96">
                  <div className="mb-4">
                    <h3 className="font-semibold text-red-600 mb-2">
                      {this.state.error.name}: {this.state.error.message}
                    </h3>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">
                        组件栈:
                      </h3>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                重试
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                刷新页面
              </button>
              <a
                href="/"
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors inline-block"
              >
                返回首页
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * React Query 错误边界
 * 专门处理 React Query 相关错误
 */
interface QueryErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

export function QueryErrorBoundary({ children, onReset }: QueryErrorBoundaryProps): JSX.Element {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              数据加载失败
            </h3>
            <p className="text-gray-600 mb-4">
              无法加载数据,请检查网络连接或稍后重试。
            </p>
            <button
              onClick={onReset}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              重新加载
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
