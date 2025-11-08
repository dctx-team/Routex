/**
 * 配置管理组件
 * Configuration Management Components
 *
 * 配置导入/导出、版本管理、模板功能
 */

import React, { useState } from 'react';
import { format } from 'date-fns';

/**
 * 配置版本接口
 */
export interface ConfigVersion {
  id: string;
  version: string;
  description?: string;
  timestamp: number;
  author?: string;
  data: any;
  tags?: string[];
}

/**
 * 配置模板接口
 */
export interface ConfigTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  data: any;
  preview?: string;
}

/**
 * 配置导出组件
 */
export function ConfigExport({
  config,
  filename = 'routex-config',
}: {
  config: any;
  filename?: string;
}) {
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(config, null, 2);
    downloadFile(dataStr, `${filename}.json`, 'application/json');
  };

  const handleExportYAML = () => {
    // 简单的 JSON 到 YAML 转换
    const yamlStr = jsonToYaml(config);
    downloadFile(yamlStr, `${filename}.yaml`, 'text/yaml');
  };

  const handleExportENV = () => {
    // 转换为环境变量格式
    const envStr = jsonToEnv(config);
    downloadFile(envStr, `${filename}.env`, 'text/plain');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        导出配置
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        选择导出格式下载当前配置
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={handleExportJSON}
          className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
        >
          <div className="text-4xl">📄</div>
          <div className="text-center">
            <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
              JSON 格式
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              标准 JSON 配置文件
            </div>
          </div>
        </button>

        <button
          onClick={handleExportYAML}
          className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
        >
          <div className="text-4xl">📋</div>
          <div className="text-center">
            <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
              YAML 格式
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              人类可读的配置文件
            </div>
          </div>
        </button>

        <button
          onClick={handleExportENV}
          className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
        >
          <div className="text-4xl">🔐</div>
          <div className="text-center">
            <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
              ENV 格式
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              环境变量文件
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

/**
 * 配置导入组件
 */
export function ConfigImport({
  onImport,
  onValidate,
}: {
  onImport: (config: any) => void;
  onValidate?: (config: any) => boolean | Promise<boolean>;
}) {
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setImporting(true);

    try {
      const text = await file.text();
      let config: any;

      // 根据文件类型解析
      if (file.name.endsWith('.json')) {
        config = JSON.parse(text);
      } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
        // 简单的 YAML 解析（生产环境应使用专业库）
        config = yamlToJson(text);
      } else if (file.name.endsWith('.env')) {
        config = envToJson(text);
      } else {
        throw new Error('不支持的文件格式。请使用 .json, .yaml 或 .env 文件');
      }

      // 验证配置
      if (onValidate) {
        const isValid = await onValidate(config);
        if (!isValid) {
          throw new Error('配置验证失败');
        }
      }

      // 导入配置
      onImport(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        导入配置
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        拖放文件或点击选择配置文件（支持 JSON、YAML、ENV 格式）
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-slate-600'
        }`}
      >
        <div className="text-6xl mb-4">📂</div>
        <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {dragging ? '松开以导入文件' : '拖放配置文件到此处'}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          或
        </p>
        <label className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
          <input
            type="file"
            accept=".json,.yaml,.yml,.env"
            onChange={handleFileSelect}
            className="hidden"
            disabled={importing}
          />
          {importing ? '导入中...' : '选择文件'}
        </label>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex gap-2">
            <span className="text-red-500">❌</span>
            <div>
              <p className="font-semibold text-red-800 dark:text-red-200">
                导入失败
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 配置版本历史组件
 */
export function ConfigVersionHistory({
  versions,
  currentVersion,
  onRestore,
  onDelete,
}: {
  versions: ConfigVersion[];
  currentVersion?: string;
  onRestore: (version: ConfigVersion) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        版本历史
      </h3>

      {versions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-gray-500 dark:text-gray-400">暂无历史版本</p>
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map((version) => (
            <div
              key={version.id}
              className={`border rounded-lg p-4 ${
                version.version === currentVersion
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      v{version.version}
                    </h4>
                    {version.version === currentVersion && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                        当前版本
                      </span>
                    )}
                    {version.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {version.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {version.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{format(version.timestamp, 'yyyy-MM-dd HH:mm:ss')}</span>
                    {version.author && <span>作者: {version.author}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {version.version !== currentVersion && (
                    <button
                      onClick={() => onRestore(version)}
                      className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      恢复
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(version.id)}
                    className="text-sm px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 配置模板库组件
 */
export function ConfigTemplateLibrary({
  templates,
  onApply,
  onPreview,
}: {
  templates: ConfigTemplate[];
  onApply: (template: ConfigTemplate) => void;
  onPreview?: (template: ConfigTemplate) => void;
}) {
  const categories = Array.from(new Set(templates.map((t) => t.category)));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        配置模板
      </h3>

      {categories.map((category) => (
        <div key={category} className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {category}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates
              .filter((t) => t.category === category)
              .map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {template.name}
                  </h5>
                  {template.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {template.description}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onApply(template)}
                      className="flex-1 text-sm px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      应用
                    </button>
                    {onPreview && (
                      <button
                        onClick={() => onPreview(template)}
                        className="text-sm px-3 py-2 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        预览
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 工具函数
 */

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function jsonToYaml(obj: any, indent = 0): string {
  const spaces = '  '.repeat(indent);
  let yaml = '';

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      yaml += `${spaces}${key}:\n${jsonToYaml(value, indent + 1)}`;
    } else if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      value.forEach((item) => {
        if (typeof item === 'object') {
          yaml += `${spaces}- \n${jsonToYaml(item, indent + 1)}`;
        } else {
          yaml += `${spaces}- ${item}\n`;
        }
      });
    } else {
      yaml += `${spaces}${key}: ${value}\n`;
    }
  }

  return yaml;
}

function jsonToEnv(obj: any, prefix = ''): string {
  let env = '';

  for (const [key, value] of Object.entries(obj)) {
    const envKey = prefix ? `${prefix}_${key}` : key;
    if (typeof value === 'object' && value !== null) {
      env += jsonToEnv(value, envKey.toUpperCase());
    } else {
      env += `${envKey.toUpperCase()}=${value}\n`;
    }
  }

  return env;
}

function yamlToJson(yaml: string): any {
  // 简化的 YAML 解析（生产环境应使用 js-yaml）
  const lines = yaml.split('\n');
  const result: any = {};
  let currentObj = result;
  const stack: any[] = [result];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const indent = line.search(/\S/);
    const [key, ...valueParts] = trimmed.split(':');
    const value = valueParts.join(':').trim();

    if (value) {
      currentObj[key.trim()] = value;
    }
  });

  return result;
}

function envToJson(env: string): any {
  const result: any = {};

  env.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=');

    if (key && value) {
      result[key.trim()] = value.trim();
    }
  });

  return result;
}
