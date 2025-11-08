import React from 'react';
import { t } from '../../i18n';

interface LanguageSelectorProps {
  currentLocale: 'en' | 'zh-CN';
  onLocaleChange: (locale: 'en' | 'zh-CN') => void;
}

/**
 * 语言选择器组件
 * 提供中英文切换功能，具有视觉反馈
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLocale,
  onLocaleChange,
}) => {
  return (
    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1 flex items-center gap-1">
      <button
        onClick={() => onLocaleChange('en')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          currentLocale === 'en'
            ? 'bg-white text-primary-600 shadow-sm'
            : 'text-white hover:bg-white/10'
        }`}
        aria-label="切换到英文"
      >
        English
      </button>
      <button
        onClick={() => onLocaleChange('zh-CN')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          currentLocale === 'zh-CN'
            ? 'bg-white text-primary-600 shadow-sm'
            : 'text-white hover:bg-white/10'
        }`}
        aria-label="切换到中文"
      >
        中文
      </button>
    </div>
  );
};