/**
 * 环境变量插值工具
 * 支持 $VAR_NAME 和 ${VAR_NAME} 两种语法
 * 灵感来源: claude-code-router 和 cce-master
 */

/**
 * 递归替换对象中的环境变量引用
 * @param obj 需要处理的对象
 * @returns 替换后的对象
 */
export function interpolateEnvVars<T>(obj: T): T {
  if (typeof obj === 'string') {
    return interpolateString(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => interpolateEnvVars(item)) as T;
  }

  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateEnvVars(value);
    }
    return result as T;
  }

  return obj;
}

/**
 * 替换字符串中的环境变量
 * 支持两种语法:
 * - $VAR_NAME
 * - ${VAR_NAME}
 */
function interpolateString(str: string): string {
  // 替换 ${VAR_NAME} 格式
  let result = str.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (_, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      console.warn(`[环境变量插值] 警告: 环境变量 ${varName} 未定义,保留原样`);
      return `\${${varName}}`;
    }
    return value;
  });

  // 替换 $VAR_NAME 格式 (不在大括号中)
  result = result.replace(/\$([A-Z_][A-Z0-9_]*)(?![}\w])/g, (_, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      console.warn(`[环境变量插值] 警告: 环境变量 ${varName} 未定义,保留原样`);
      return `$${varName}`;
    }
    return value;
  });

  return result;
}

/**
 * 验证配置中引用的环境变量是否都已定义
 * @param obj 需要验证的配置对象
 * @returns 缺失的环境变量列表
 */
export function validateEnvVars(obj: unknown): string[] {
  const missing = new Set<string>();

  function check(value: unknown): void {
    if (typeof value === 'string') {
      // 检查 ${VAR_NAME}
      const bracketMatches = value.matchAll(/\$\{([A-Z_][A-Z0-9_]*)\}/g);
      for (const match of bracketMatches) {
        if (process.env[match[1]] === undefined) {
          missing.add(match[1]);
        }
      }

      // 检查 $VAR_NAME
      const simpleMatches = value.matchAll(/\$([A-Z_][A-Z0-9_]*)(?![}\w])/g);
      for (const match of simpleMatches) {
        if (process.env[match[1]] === undefined) {
          missing.add(match[1]);
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach(check);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(check);
    }
  }

  check(obj);
  return Array.from(missing).sort();
}

/**
 * 提取配置中所有引用的环境变量名称
 * @param obj 配置对象
 * @returns 环境变量名称列表
 */
export function extractEnvVars(obj: unknown): string[] {
  const vars = new Set<string>();

  function extract(value: unknown): void {
    if (typeof value === 'string') {
      // 提取 ${VAR_NAME}
      const bracketMatches = value.matchAll(/\$\{([A-Z_][A-Z0-9_]*)\}/g);
      for (const match of bracketMatches) {
        vars.add(match[1]);
      }

      // 提取 $VAR_NAME
      const simpleMatches = value.matchAll(/\$([A-Z_][A-Z0-9_]*)(?![}\w])/g);
      for (const match of simpleMatches) {
        vars.add(match[1]);
      }
    } else if (Array.isArray(value)) {
      value.forEach(extract);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(extract);
    }
  }

  extract(obj);
  return Array.from(vars).sort();
}

/**
 * 创建环境变量示例文件内容
 * @param configObj 配置对象
 * @returns .env 文件内容
 */
export function generateEnvExample(configObj: unknown): string {
  const vars = extractEnvVars(configObj);
  if (vars.length === 0) {
    return '# 当前配置未使用环境变量\n';
  }

  const lines = [
    '# Routex 环境变量配置',
    '# 复制此文件为 .env 并填写实际值',
    '',
  ];

  for (const varName of vars) {
    lines.push(`# ${varName}=${varName}_VALUE`);
    lines.push(`${varName}=`);
    lines.push('');
  }

  return lines.join('\n');
}
