import React from 'react';

interface QuickAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  layout?: 'horizontal' | 'vertical' | 'grid';
  size?: 'small' | 'medium' | 'large';
}

/**
 * 快速操作组件
 *
 * 用于展示一组常用操作的按钮集合
 * 支持多种布局方式和尺寸
 */
export function QuickActions({
  actions,
  layout = 'horizontal',
  size = 'medium'
}: QuickActionsProps) {
  const getContainerClasses = () => {
    const layoutClasses = {
      horizontal: 'flex flex-wrap gap-2',
      vertical: 'flex flex-col gap-2',
      grid: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'
    };
    return layoutClasses[layout];
  };

  const getButtonClasses = (variant: string, disabled: boolean) => {
    const sizeClasses = {
      small: 'px-3 py-1.5 text-sm',
      medium: 'px-4 py-2 text-sm',
      large: 'px-6 py-3 text-base'
    };

    const variantClasses = {
      primary: disabled
        ? 'bg-gray-100 text-gray-400 border-gray-200'
        : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700',
      secondary: disabled
        ? 'bg-gray-50 text-gray-400 border-gray-200'
        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400',
      danger: disabled
        ? 'bg-red-50 text-red-400 border-red-200'
        : 'bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700'
    };

    return `inline-flex items-center justify-center gap-2 border rounded-md font-medium transition-colors duration-200 ${sizeClasses[size]} ${variantClasses[variant]}`;
  };

  const renderButton = (action: QuickAction) => (
    <button
      key={action.id}
      onClick={action.onClick}
      disabled={action.disabled || action.loading}
      className={getButtonClasses(action.variant || 'secondary', action.disabled || false)}
    >
      {action.loading ? (
        <div className="loading-spinner w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
      ) : (
        action.icon && <span className="action-icon">{action.icon}</span>
      )}
      <span className="action-label">{action.label}</span>
    </button>
  );

  return (
    <div className="quick-actions">
      <div className={getContainerClasses()}>
        {actions.map(renderButton)}
      </div>
    </div>
  );
}