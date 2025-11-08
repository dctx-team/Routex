import React, { useMemo } from 'react';
import type { Tab } from '../../types';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { Footer } from './Footer';
import { RefreshControl } from '../RefreshControl';
import { Toast } from '../Toast';
import { useActiveTab, useLocale, useToast, useRefreshInterval, useAppActions } from '../../store/app-store';
import { t } from '../../i18n';

interface AppLayoutProps {
  tabs: { id: Tab; label: string; icon: string }[];
  children: React.ReactNode;
}

/**
 * 主应用布局组件
 * 包含头部、导航、刷新控制、主要内容区域和底部
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ tabs, children }) => {
  const activeTab = useActiveTab();
  const locale = useLocale();
  const toast = useToast();
  const refreshInterval = useRefreshInterval();
  const { setActiveTab, setRefreshInterval } = useAppActions();

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 头部区域 */}
        <Header />

        {/* 导航标签 */}
        <Navigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* 刷新间隔控制 */}
        <RefreshControl
          refreshInterval={refreshInterval}
          onIntervalChange={setRefreshInterval}
        />

        {/* 主要内容区域 */}
        <main role="main">
          {children}
        </main>

        {/* 底部信息 */}
        <Footer />

        {/* Toast 提示 */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
          />
        )}
      </div>
    </div>
  );
};