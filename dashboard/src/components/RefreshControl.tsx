import React from 'react';
import { useLocale } from '../store/app-store';
import { t } from '../i18n';

interface RefreshControlProps {
  refreshInterval: number;
  onIntervalChange: (interval: number) => void;
}

/**
 * 刷新间隔控制组件
 * 允许用户选择自动刷新的时间间隔
 */
export const RefreshControl: React.FC<RefreshControlProps> = ({
  refreshInterval,
  onIntervalChange,
}) => {
  const locale = useLocale();

  return (
    <div className="flex justify-end mb-4">
      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
        <label
          htmlFor="refresh-interval"
          className="text-sm font-medium text-white"
        >
          {t(locale, 'header.autoRefresh')}
        </label>
        <select
          id="refresh-interval"
          value={refreshInterval}
          onChange={(e) => onIntervalChange(Number(e.target.value))}
          className="border-0 text-sm bg-white/90 rounded px-2 py-1 focus:ring-0 text-gray-800"
          aria-label={t(locale, 'header.autoRefresh')}
        >
          <option value={10000}>10s</option>
          <option value={30000}>30s</option>
          <option value={60000}>1m</option>
          <option value={300000}>5m</option>
          <option value={0}>{t(locale, 'header.off')}</option>
        </select>
      </div>
    </div>
  );
};