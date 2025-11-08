/**
 * 数据库配置加载器 - 集成环境变量插值
 * 在从数据库加载配置时自动应用环境变量替换
 */

import type { Channel, RoutingRule, TeeDestination } from '../types';
import { interpolateEnvVars, validateEnvVars } from './env-interpolation';
import { logger } from './logger';

/**
 * 处理 Channel 配置的环境变量插值
 */
export function processChannelEnvVars(channel: Channel): Channel {
  try {
    // 对敏感字段进行环境变量插值
    const processed = {
      ...channel,
      apiKey: channel.apiKey ? interpolateEnvVars(channel.apiKey) : channel.apiKey,
      baseUrl: channel.baseUrl ? interpolateEnvVars(channel.baseUrl) : channel.baseUrl,
      refreshToken: channel.refreshToken ? interpolateEnvVars(channel.refreshToken) : channel.refreshToken,
    };

    // 处理 transformers 配置(如果存在)
    if (channel.transformers) {
      processed.transformers = interpolateEnvVars(channel.transformers);
    }

    // 如需额外配置处理，可在此扩展（当前 Channel 类型不包含 config 字段）

    return processed as Channel;
  } catch (error) {
    logger.error({ error, channel: channel.name }, '处理 Channel 环境变量时出错');
    return channel;
  }
}

/**
 * 批量处理 Channels
 */
export function processChannelsEnvVars(channels: Channel[]): Channel[] {
  return channels.map(processChannelEnvVars);
}

/**
 * 处理 RoutingRule 配置的环境变量插值
 */
export function processRoutingRuleEnvVars(rule: RoutingRule): RoutingRule {
  try {
    const processed = {
      ...rule,
      targetChannel: rule.targetChannel ? interpolateEnvVars(rule.targetChannel) : rule.targetChannel,
      targetModel: rule.targetModel ? interpolateEnvVars(rule.targetModel) : rule.targetModel,
    };

    // 处理 condition 中可能包含的环境变量
    if (rule.condition) {
      processed.condition = interpolateEnvVars(rule.condition);
    }

    return processed as RoutingRule;
  } catch (error) {
    logger.error({ error, rule: rule.name }, '处理 RoutingRule 环境变量时出错');
    return rule;
  }
}

/**
 * 批量处理 RoutingRules
 */
export function processRoutingRulesEnvVars(rules: RoutingRule[]): RoutingRule[] {
  return rules.map(processRoutingRuleEnvVars);
}

/**
 * 处理 TeeDestination 配置的环境变量插值
 */
export function processTeeDestinationEnvVars(destination: TeeDestination): TeeDestination {
  try {
    const processed = {
      ...destination,
      url: interpolateEnvVars(destination.url),
    };

    // 处理 headers 中的环境变量
    if (destination.headers) {
      processed.headers = interpolateEnvVars(destination.headers);
    }

    return processed as TeeDestination;
  } catch (error) {
    logger.error({ error, destination: destination.name }, '处理 TeeDestination 环境变量时出错');
    return destination;
  }
}

/**
 * 批量处理 TeeDestinations
 */
export function processTeeDestinationsEnvVars(destinations: TeeDestination[]): TeeDestination[] {
  return destinations.map(processTeeDestinationEnvVars);
}

/**
 * 验证配置对象并报告缺失的环境变量
 */
export function validateConfigEnvVars(config: unknown, configName: string): void {
  const missing = validateEnvVars(config);

  if (missing.length > 0) {
    logger.warn({
      missing,
      hint: '请在 .env 文件中设置这些环境变量,或使用实际值替换配置中的占位符'
    }, `[环境变量验证] ${configName} 配置引用了未定义的环境变量:`);
  }
}

/**
 * 加载 .env 文件(如果存在)
 * Bun 原生支持 .env 文件,但这里提供显式加载和验证
 */
export async function loadEnvFile(path: string = '.env'): Promise<void> {
  try {
    const file = Bun.file(path);
    if (!(await file.exists())) {
    logger.info({ path }, '[环境变量] 未找到 .env 文件,跳过加载');
      return;
    }

    const content = await file.text();
    const lines = content.split('\n');
    let loadedCount = 0;

    for (const line of lines) {
      // 跳过注释和空行
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // 解析 KEY=VALUE 格式
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        // 只设置未定义的环境变量(不覆盖系统环境变量)
        if (process.env[key] === undefined) {
          process.env[key] = value;
          loadedCount++;
        }
      }
    }

    logger.info({ path, loadedCount }, '[环境变量] 已加载环境变量');
  } catch (error) {
    logger.error({ path, error }, '[环境变量] 加载 .env 时出错');
  }
}

/**
 * 生成 .env.example 文件
 * 基于当前数据库配置提取所有使用的环境变量
 */
export function generateEnvExampleFromDb(
  channels: Channel[],
  rules: RoutingRule[],
  destinations: TeeDestination[]
): string {
  const envVars = new Set<string>();

  // 从 Channels 提取
  for (const channel of channels) {
    if (channel.apiKey) {
      extractVarsFromString(channel.apiKey, envVars);
    }
    if (channel.baseUrl) {
      extractVarsFromString(channel.baseUrl, envVars);
    }
    if (channel.refreshToken) {
      extractVarsFromString(channel.refreshToken, envVars);
    }
  }

  // 从 RoutingRules 提取
  for (const rule of rules) {
    if (rule.targetChannel) {
      extractVarsFromString(rule.targetChannel, envVars);
    }
    if (rule.targetModel) {
      extractVarsFromString(rule.targetModel, envVars);
    }
  }

  // 从 TeeDestinations 提取
  for (const dest of destinations) {
    extractVarsFromString(dest.url, envVars);
  }

  if (envVars.size === 0) {
    return '# 当前配置未使用环境变量\n';
  }

  const lines = [
    '# Routex 环境变量配置',
    '# 复制此文件为 .env 并填写实际值',
    '# Bun 会自动加载 .env 文件',
    '',
  ];

  const sorted = Array.from(envVars).sort();
  for (const varName of sorted) {
    lines.push(`# ${varName}=${varName}_VALUE`);
    lines.push(`${varName}=`);
    lines.push('');
  }

  return lines.join('\n');
}

function extractVarsFromString(str: string, vars: Set<string>): void {
  // 提取 ${VAR_NAME}
  const bracketMatches = str.matchAll(/\$\{([A-Z_][A-Z0-9_]*)\}/g);
  for (const match of bracketMatches) {
    vars.add(match[1]);
  }

  // 提取 $VAR_NAME
  const simpleMatches = str.matchAll(/\$([A-Z_][A-Z0-9_]*)(?![}\w])/g);
  for (const match of simpleMatches) {
    vars.add(match[1]);
  }
}
