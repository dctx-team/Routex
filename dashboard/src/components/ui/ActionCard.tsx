import React from 'react';

interface ActionCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions: React.ReactNode;
  variant?: 'default' | 'compact' | 'highlight';
  disabled?: boolean;
}

/**
 * 操作卡片组件
 *
 * 用于包含操作按钮和简要信息的卡片容器
 * 通常用于设置面板、控制面板等场景
 */
export function ActionCard({
  title,
  description,
  icon,
  actions,
  variant = 'default',
  disabled = false
}: ActionCardProps) {
  const getClasses = () => {
    const baseClasses = 'action-card border rounded-lg transition-all duration-200';

    const variantClasses = {
      default: 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm',
      compact: 'bg-gray-50 border-gray-200 hover:bg-white hover:shadow-sm',
      highlight: 'bg-blue-50 border-blue-200 hover:border-blue-300 hover:shadow-sm'
    };

    const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

    return `${baseClasses} ${variantClasses[variant]} ${disabledClasses}`;
  };

  return (
    <div className={getClasses()}>
      <div className="action-card-content">
        {/* 头部区域 */}
        <div className="action-card-header">
          {icon && <div className="action-card-icon">{icon}</div>}
          <div className="action-card-title-section">
            <h3 className="action-card-title">{title}</h3>
            {description && (
              <p className="action-card-description">{description}</p>
            )}
          </div>
        </div>

        {/* 操作区域 */}
        <div className="action-card-actions">
          {actions}
        </div>
      </div>
    </div>
  );
}