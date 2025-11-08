import React from 'react';
import type { Tab } from '../../types';
import { t } from '../../i18n';

interface NavigationProps {
  tabs: { id: Tab; label: string; icon: string }[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

/**
 * 导航标签组件
 * 响应式设计，支持水平滚动
 */
export const Navigation: React.FC<NavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  return (
    <nav className="card mb-6 p-0 overflow-hidden" role="navigation">
      <div className="flex overflow-x-auto scrollbar-thin" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`${tab.id}-panel`}
          >
            <span className="mr-2" aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
};