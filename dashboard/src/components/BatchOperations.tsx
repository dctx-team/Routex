/**
 * 批量操作组件
 * Batch Operations Components
 *
 * 批量管理频道、路由规则和配置
 */

import React, { useState } from 'react';

/**
 * 批量操作类型
 */
export type BatchOperation =
  | 'enable'
  | 'disable'
  | 'delete'
  | 'update'
  | 'test'
  | 'export';

/**
 * 批量选择器组件
 */
export function BatchSelector<T extends { id?: string; name?: string }>({
  items,
  selectedItems,
  onSelectionChange,
  renderItem,
  keyField = 'id',
}: {
  items: T[];
  selectedItems: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  renderItem: (item: T) => React.ReactNode;
  keyField?: keyof T;
}) {
  const allSelected = items.length > 0 && selectedItems.size === items.length;
  const someSelected = selectedItems.size > 0 && selectedItems.size < items.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(items.map((item) => String(item[keyField]))));
    }
  };

  const handleSelectItem = (key: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(key)) {
      newSelection.delete(key);
    } else {
      newSelection.add(key);
    }
    onSelectionChange(newSelection);
  };

  return (
    <div className="space-y-2">
      {/* 全选控制 */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(input) => {
            if (input) {
              input.indeterminate = someSelected;
            }
          }}
          onChange={handleSelectAll}
          className="w-5 h-5 rounded border-gray-300 dark:border-slate-600"
        />
        <span className="font-medium text-gray-900 dark:text-white">
          {selectedItems.size > 0
            ? `已选择 ${selectedItems.size} / ${items.length} 项`
            : '全选'}
        </span>
      </div>

      {/* 项目列表 */}
      <div className="space-y-2">
        {items.map((item) => {
          const key = String(item[keyField]);
          const isSelected = selectedItems.has(key);

          return (
            <div
              key={key}
              className={`flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
              onClick={() => handleSelectItem(key)}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleSelectItem(key)}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 rounded border-gray-300 dark:border-slate-600"
              />
              <div className="flex-1">{renderItem(item)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 批量操作工具栏
 */
export function BatchActionBar({
  selectedCount,
  operations,
  onOperation,
  onClearSelection,
}: {
  selectedCount: number;
  operations: {
    type: BatchOperation;
    label: string;
    icon: string;
    color?: string;
    confirmMessage?: string;
  }[];
  onOperation: (type: BatchOperation) => void;
  onClearSelection: () => void;
}) {
  if (selectedCount === 0) {
    return null;
  }

  const handleOperation = (op: typeof operations[0]) => {
    if (op.confirmMessage) {
      if (!confirm(op.confirmMessage)) {
        return;
      }
    }
    onOperation(op.type);
  };

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-gray-200 dark:border-slate-600 p-4 z-50 animate-slide-up">
      <div className="flex items-center gap-4">
        <span className="font-medium text-gray-900 dark:text-white">
          已选择 {selectedCount} 项
        </span>
        <div className="flex items-center gap-2">
          {operations.map((op) => (
            <button
              key={op.type}
              onClick={() => handleOperation(op)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                op.color || 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <span>{op.icon}</span>
              <span className="text-sm font-medium">{op.label}</span>
            </button>
          ))}
          <button
            onClick={onClearSelection}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            取消选择
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 批量操作进度组件
 */
export function BatchProgress({
  total,
  completed,
  failed,
  current,
  onClose,
}: {
  total: number;
  completed: number;
  failed: number;
  current?: string;
  onClose?: () => void;
}) {
  const progress = total > 0 ? (completed + failed) / total : 0;
  const isComplete = completed + failed >= total;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {isComplete ? '批量操作完成' : '批量操作进行中...'}
        </h3>

        {/* 进度条 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>
              进度: {completed + failed} / {total}
            </span>
            <span>{((progress || 0) * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {completed}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">成功</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {failed}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">失败</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {total - completed - failed}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">待处理</div>
          </div>
        </div>

        {/* 当前项 */}
        {current && !isComplete && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              正在处理:
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {current}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        {isComplete && onClose && (
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            关闭
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 批量编辑表单
 */
export function BatchEditForm<T>({
  fields,
  onSubmit,
  onCancel,
}: {
  fields: {
    name: keyof T;
    label: string;
    type: 'text' | 'number' | 'select' | 'checkbox';
    options?: { value: any; label: string }[];
    placeholder?: string;
  }[];
  onSubmit: (updates: Partial<T>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Partial<T>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleFieldChange = (name: keyof T, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        批量编辑
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        以下更改将应用到所有选中的项目
      </p>

      {fields.map((field) => (
        <div key={String(field.name)}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {field.label}
          </label>
          {field.type === 'select' ? (
            <select
              value={String(formData[field.name] || '')}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="">-- 不修改 --</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : field.type === 'checkbox' ? (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(formData[field.name])}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                className="rounded border-gray-300 dark:border-slate-600"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {field.placeholder}
              </span>
            </label>
          ) : (
            <input
              type={field.type}
              value={String(formData[field.name] || '')}
              onChange={(e) =>
                handleFieldChange(
                  field.name,
                  field.type === 'number' ? Number(e.target.value) : e.target.value
                )
              }
              placeholder={field.placeholder}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          )}
        </div>
      ))}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          应用更改
        </button>
      </div>
    </form>
  );
}

/**
 * 批量操作结果组件
 */
export function BatchResult({
  results,
  onClose,
  onRetryFailed,
}: {
  results: {
    id: string;
    name: string;
    success: boolean;
    error?: string;
  }[];
  onClose: () => void;
  onRetryFailed?: () => void;
}) {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        操作结果
      </h3>

      {/* 统计 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
            {successful.length}
          </div>
          <div className="text-sm text-green-700 dark:text-green-300">成功</div>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
            {failed.length}
          </div>
          <div className="text-sm text-red-700 dark:text-red-300">失败</div>
        </div>
      </div>

      {/* 失败列表 */}
      {failed.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 dark:text-white">失败项目:</h4>
          {failed.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
            >
              <div className="font-medium text-red-900 dark:text-red-100">
                {item.name}
              </div>
              {item.error && (
                <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {item.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
        {failed.length > 0 && onRetryFailed && (
          <button
            onClick={onRetryFailed}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            重试失败项
          </button>
        )}
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
