/**
 * 命令面板组件
 * Command Palette Component
 *
 * 提供快速操作和导航功能
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Command } from 'cmdk';
import { useGlobalStore } from '../stores/globalStore';
import './CommandPalette.css';

/**
 * 命令项接口
 */
export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  keywords?: string[];
  category?: string;
  action: () => void;
  shortcut?: string;
}

/**
 * 命令面板属性
 */
export interface CommandPaletteProps {
  /** 是否显示 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 命令列表 */
  commands?: CommandItem[];
}

/**
 * 默认命令列表
 */
const defaultCommands: CommandItem[] = [
  // 导航命令
  {
    id: 'nav-overview',
    label: '概览',
    description: '查看系统概览',
    icon: '🏠',
    category: '导航',
    keywords: ['overview', 'dashboard', 'home'],
    action: () => {
      window.location.hash = '#overview';
    },
    shortcut: 'G O',
  },
  {
    id: 'nav-channels',
    label: '频道管理',
    description: '管理 API 频道',
    icon: '📡',
    category: '导航',
    keywords: ['channels', 'api'],
    action: () => {
      window.location.hash = '#channels';
    },
    shortcut: 'G C',
  },
  {
    id: 'nav-routing',
    label: '路由规则',
    description: '配置智能路由',
    icon: '🛣️',
    category: '导航',
    keywords: ['routing', 'rules'],
    action: () => {
      window.location.hash = '#routing';
    },
    shortcut: 'G R',
  },
  {
    id: 'nav-analytics',
    label: '分析统计',
    description: '查看使用统计',
    icon: '📊',
    category: '导航',
    keywords: ['analytics', 'stats'],
    action: () => {
      window.location.hash = '#analytics';
    },
    shortcut: 'G A',
  },
  {
    id: 'nav-logs',
    label: '请求日志',
    description: '查看请求日志',
    icon: '📜',
    category: '导航',
    keywords: ['logs', 'requests'],
    action: () => {
      window.location.hash = '#logs';
    },
    shortcut: 'G L',
  },
  {
    id: 'nav-settings',
    label: '系统设置',
    description: '配置系统参数',
    icon: '⚙️',
    category: '导航',
    keywords: ['settings', 'config'],
    action: () => {
      window.location.hash = '#settings';
    },
    shortcut: 'G S',
  },

  // 操作命令
  {
    id: 'action-refresh',
    label: '刷新数据',
    description: '重新加载所有数据',
    icon: '🔄',
    category: '操作',
    keywords: ['refresh', 'reload'],
    action: () => {
      window.location.reload();
    },
    shortcut: 'Ctrl+R',
  },
  {
    id: 'action-clear-cache',
    label: '清空缓存',
    description: '清空所有缓存数据',
    icon: '🗑️',
    category: '操作',
    keywords: ['cache', 'clear'],
    action: () => {
      if (confirm('确定要清空所有缓存吗？')) {
        // 清空缓存逻辑
        console.log('清空缓存');
      }
    },
  },

  // 主题命令
  {
    id: 'theme-light',
    label: '明亮主题',
    description: '切换到明亮主题',
    icon: '☀️',
    category: '主题',
    keywords: ['theme', 'light'],
    action: () => {
      // 切换主题逻辑
      console.log('切换到明亮主题');
    },
  },
  {
    id: 'theme-dark',
    label: '暗黑主题',
    description: '切换到暗黑主题',
    icon: '🌙',
    category: '主题',
    keywords: ['theme', 'dark'],
    action: () => {
      // 切换主题逻辑
      console.log('切换到暗黑主题');
    },
  },

  // 语言命令
  {
    id: 'lang-en',
    label: 'English',
    description: '切换到英文',
    icon: '🇺🇸',
    category: '语言',
    keywords: ['language', 'english', 'en'],
    action: () => {
      // 切换语言逻辑
      console.log('切换到英文');
    },
  },
  {
    id: 'lang-zh',
    label: '中文',
    description: '切换到中文',
    icon: '🇨🇳',
    category: '语言',
    keywords: ['language', 'chinese', 'zh'],
    action: () => {
      // 切换语言逻辑
      console.log('切换到中文');
    },
  },

  // 帮助命令
  {
    id: 'help-docs',
    label: '查看文档',
    description: '打开帮助文档',
    icon: '📖',
    category: '帮助',
    keywords: ['help', 'docs', 'documentation'],
    action: () => {
      window.open('https://github.com/dctx-team/Routex', '_blank');
    },
    shortcut: '?',
  },
  {
    id: 'help-shortcuts',
    label: '快捷键列表',
    description: '查看所有快捷键',
    icon: '⌨️',
    category: '帮助',
    keywords: ['shortcuts', 'keyboard'],
    action: () => {
      // 显示快捷键列表
      console.log('显示快捷键列表');
    },
  },
];

/**
 * 命令面板组件
 */
export function CommandPalette({
  open,
  onClose,
  commands = defaultCommands,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 按类别分组命令
  const categories = useMemo(() => {
    const cats = new Map<string, CommandItem[]>();

    commands.forEach((cmd) => {
      const category = cmd.category || '其他';
      if (!cats.has(category)) {
        cats.set(category, []);
      }
      cats.get(category)!.push(cmd);
    });

    return cats;
  }, [commands]);

  // 处理命令选择
  const handleSelect = (commandId: string) => {
    const command = commands.find((cmd) => cmd.id === commandId);
    if (command) {
      command.action();
      onClose();
      setSearch('');
    }
  };

  // ESC 关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette-container" onClick={(e) => e.stopPropagation()}>
        <Command label="Command Menu" shouldFilter={true}>
          <div className="command-palette-header">
            <span className="command-palette-icon">⌘</span>
            <Command.Input
              placeholder="输入命令或搜索..."
              value={search}
              onValueChange={setSearch}
              className="command-palette-input"
              autoFocus
            />
          </div>

          <Command.List className="command-palette-list">
            <Command.Empty className="command-palette-empty">
              没有找到相关命令
            </Command.Empty>

            {Array.from(categories).map(([category, items]) => (
              <Command.Group key={category} heading={category} className="command-palette-group">
                {items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.description} ${item.keywords?.join(' ')}`}
                    onSelect={() => handleSelect(item.id)}
                    className="command-palette-item"
                  >
                    <span className="command-item-icon">{item.icon}</span>
                    <div className="command-item-content">
                      <div className="command-item-label">{item.label}</div>
                      {item.description && (
                        <div className="command-item-description">{item.description}</div>
                      )}
                    </div>
                    {item.shortcut && (
                      <div className="command-item-shortcut">{item.shortcut}</div>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

/**
 * 命令面板触发按钮
 */
export function CommandPaletteTrigger() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useGlobalStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K 或 Cmd+K 打开命令面板
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setCommandPaletteOpen]);

  return (
    <>
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="command-palette-trigger"
        title="打开命令面板 (Ctrl+K)"
      >
        <span className="mr-2">⌘</span>
        <span>命令面板</span>
        <kbd className="ml-2 text-xs">⌘K</kbd>
      </button>

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}
