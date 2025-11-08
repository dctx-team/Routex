/**
 * 快捷键系统
 * Keyboard Shortcuts System
 *
 * 提供全局快捷键管理和处理
 */

import { useEffect, useCallback, useRef } from 'react';

/**
 * 快捷键配置
 */
export interface ShortcutConfig {
  /** 快捷键组合，如 'ctrl+k', 'cmd+shift+p' */
  keys: string;
  /** 快捷键描述 */
  description: string;
  /** 触发回调 */
  handler: (event: KeyboardEvent) => void;
  /** 是否启用 */
  enabled?: boolean;
  /** 是否阻止默认行为 */
  preventDefault?: boolean;
  /** 作用域（可选，用于在特定场景下启用） */
  scope?: string;
}

/**
 * 快捷键注册表
 */
class ShortcutRegistry {
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private listeners: Set<(event: KeyboardEvent) => void> = new Set();

  /**
   * 注册快捷键
   */
  register(id: string, config: ShortcutConfig) {
    this.shortcuts.set(id, config);
  }

  /**
   * 注销快捷键
   */
  unregister(id: string) {
    this.shortcuts.delete(id);
  }

  /**
   * 获取所有快捷键
   */
  getAll(): Map<string, ShortcutConfig> {
    return new Map(this.shortcuts);
  }

  /**
   * 处理键盘事件
   */
  handleKeyDown(event: KeyboardEvent) {
    const pressedKeys = this.getPressed Keys(event);

    this.shortcuts.forEach((config, id) => {
      if (!config.enabled && config.enabled !== undefined) {
        return;
      }

      const targetKeys = this.normalizeKeys(config.keys);

      if (this.matchKeys(pressedKeys, targetKeys)) {
        if (config.preventDefault) {
          event.preventDefault();
        }
        config.handler(event);
      }
    });

    // 通知所有监听器
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * 添加全局监听器
   */
  addListener(listener: (event: KeyboardEvent) => void) {
    this.listeners.add(listener);
  }

  /**
   * 移除监听器
   */
  removeListener(listener: (event: KeyboardEvent) => void) {
    this.listeners.delete(listener);
  }

  /**
   * 获取当前按下的键组合
   */
  private getPressedKeys(event: KeyboardEvent): string {
    const keys: string[] = [];

    if (event.ctrlKey) keys.push('ctrl');
    if (event.metaKey) keys.push('cmd');
    if (event.altKey) keys.push('alt');
    if (event.shiftKey) keys.push('shift');

    const key = event.key.toLowerCase();
    if (!['control', 'meta', 'alt', 'shift'].includes(key)) {
      keys.push(key);
    }

    return keys.join('+');
  }

  /**
   * 标准化快捷键字符串
   */
  private normalizeKeys(keys: string): string {
    return keys
      .toLowerCase()
      .split('+')
      .map((k) => k.trim())
      .sort()
      .join('+');
  }

  /**
   * 匹配快捷键
   */
  private matchKeys(pressed: string, target: string): boolean {
    const pressedParts = pressed.split('+').sort();
    const targetParts = target.split('+').sort();

    if (pressedParts.length !== targetParts.length) {
      return false;
    }

    return pressedParts.every((key, index) => key === targetParts[index]);
  }
}

/**
 * 全局快捷键注册表实例
 */
export const shortcutRegistry = new ShortcutRegistry();

/**
 * 初始化全局快捷键监听
 */
export function initializeShortcuts() {
  const handleKeyDown = (event: KeyboardEvent) => {
    shortcutRegistry.handleKeyDown(event);
  };

  document.addEventListener('keydown', handleKeyDown);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * 使用快捷键 Hook
 *
 * @example
 * ```tsx
 * useShortcut({
 *   keys: 'ctrl+k',
 *   description: '打开命令面板',
 *   handler: () => setCommandPaletteOpen(true),
 *   preventDefault: true,
 * });
 * ```
 */
export function useShortcut(config: ShortcutConfig) {
  const id = useRef(`shortcut-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    shortcutRegistry.register(id.current, config);

    return () => {
      shortcutRegistry.unregister(id.current);
    };
  }, [config.keys, config.enabled, config.preventDefault]);

  // 更新处理器（使用最新的引用）
  useEffect(() => {
    const currentConfig = shortcutRegistry.getAll().get(id.current);
    if (currentConfig) {
      currentConfig.handler = config.handler;
    }
  }, [config.handler]);
}

/**
 * 使用多个快捷键 Hook
 */
export function useShortcuts(configs: Record<string, Omit<ShortcutConfig, 'keys'>>) {
  useEffect(() => {
    const ids: string[] = [];

    Object.entries(configs).forEach(([keys, config]) => {
      const id = `shortcut-${Math.random().toString(36).slice(2)}`;
      ids.push(id);
      shortcutRegistry.register(id, { ...config, keys });
    });

    return () => {
      ids.forEach((id) => shortcutRegistry.unregister(id));
    };
  }, [configs]);
}

/**
 * 默认快捷键配置
 */
export const defaultShortcuts = {
  // 命令面板
  'ctrl+k': {
    description: '打开命令面板',
    handler: () => {
      // 将在组件中实现
    },
    preventDefault: true,
  },

  // 导航
  'g o': {
    description: '跳转到概览',
    handler: () => {
      window.location.hash = '#overview';
    },
  },
  'g c': {
    description: '跳转到频道',
    handler: () => {
      window.location.hash = '#channels';
    },
  },
  'g r': {
    description: '跳转到路由',
    handler: () => {
      window.location.hash = '#routing';
    },
  },
  'g a': {
    description: '跳转到分析',
    handler: () => {
      window.location.hash = '#analytics';
    },
  },
  'g l': {
    description: '跳转到日志',
    handler: () => {
      window.location.hash = '#logs';
    },
  },
  'g s': {
    description: '跳转到设置',
    handler: () => {
      window.location.hash = '#settings';
    },
  },

  // 刷新
  'r r': {
    description: '刷新页面',
    handler: () => {
      window.location.reload();
    },
  },

  // 帮助
  '?': {
    description: '显示帮助',
    handler: () => {
      // 将在组件中实现
    },
  },
};

/**
 * 快捷键帮助弹窗组件
 */
export function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const shortcuts = Array.from(shortcutRegistry.getAll().entries());

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  // 按类别分组
  const categories = {
    导航: shortcuts.filter(([keys]) => keys.startsWith('g ')),
    操作: shortcuts.filter(([keys]) => !keys.startsWith('g ') && keys.length > 1),
    其他: shortcuts.filter(([keys]) => keys.length === 1),
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              ⌨️ 快捷键列表
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {Object.entries(categories).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map(([keys, config]) => (
                  <div
                    key={keys}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <span className="text-gray-700 dark:text-gray-300">{config.description}</span>
                    <kbd className="px-3 py-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded font-mono text-sm text-gray-700 dark:text-gray-300">
                      {keys.toUpperCase()}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
