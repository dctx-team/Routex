import React from 'react';
import { useStatus } from '../../store/app-store';

/**
 * 应用程序底部组件
 * 显示版本信息和相关链接
 * 自动从全局状态获取版本信息
 */
export const Footer: React.FC = () => {
  const status = useStatus();
  const version = status?.version || '';
  const repositoryUrl = 'https://github.com/dctx-team/Routex';

  return (
    <footer className="text-center text-white mt-12 pb-4">
      <p className="text-sm">
        Routex {version} © 2025 |{' '}
        <a
          href={repositoryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary-200 transition-colors"
          aria-label="访问 GitHub 仓库"
        >
          GitHub
        </a>
      </p>
    </footer>
  );
};