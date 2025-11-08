import React from 'react';
import { ThemeToggle } from '../ThemeProvider.simple';
import { LanguageSelector } from './LanguageSelector';
import { useLocale, useAppActions } from '../../store/app-store';
import { t } from '../../i18n';

/**
 * 应用程序头部组件
 * 负责显示标题、副标题以及全局控制按钮（主题切换、语言切换）
 * 自动从全局状态获取当前语言设置
 */
export const Header: React.FC = () => {
  const locale = useLocale();
  const { setLocale, showToast } = useAppActions();

  // 处理语言切换
  const handleLocaleChange = async (newLocale: 'en' | 'zh-CN') => {
    // 更新本地状态和存储
    setLocale(newLocale);
    localStorage.setItem('routex-locale', newLocale);

    // 显示提示信息
    showToast(
      `${t(newLocale, 'toast.languageChanged')} ${
        newLocale === 'en'
          ? t(newLocale, 'toast.english')
          : t(newLocale, 'toast.chinese')
      }`
    );

    // 尝试同步到 API（静默失败）
    try {
      const API_BASE = import.meta.env.DEV ? '/api' : window.location.origin + '/api';
      await fetch(`${API_BASE}/i18n/locale`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      });
    } catch (err) {
      console.debug('Could not sync locale to API');
    }
  };

  return (
    <header className="mb-6 flex items-center justify-between">
      <div className="text-white">
        <h1 className="text-3xl font-bold mb-1">
          {t(locale, 'header.title')}
        </h1>
        <p className="text-sm text-white/80">
          {t(locale, 'header.subtitle')}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* 主题切换按钮 */}
        <ThemeToggle />

        {/* 语言选择器 */}
        <LanguageSelector
          currentLocale={locale}
          onLocaleChange={handleLocaleChange}
        />
      </div>
    </header>
  );
};