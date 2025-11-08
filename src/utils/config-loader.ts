/**
 *
 * 
 */

import type { Channel, RoutingRule, TeeDestination } from '../types';
import { interpolateEnvVars, validateEnvVars } from './env-interpolation';
import { logger } from './logger';

/**
 *  Channel 
 */
export function processChannelEnvVars(channel: Channel): Channel {
  try {
    // 
    const processed = {
      ...channel,
      apiKey: channel.apiKey ? interpolateEnvVars(channel.apiKey) : channel.apiKey,
      baseUrl: channel.baseUrl ? interpolateEnvVars(channel.baseUrl) : channel.baseUrl,
      refreshToken: channel.refreshToken ? interpolateEnvVars(channel.refreshToken) : channel.refreshToken,
    };

    //  transformers 
    if (channel.transformers) {
      processed.transformers = interpolateEnvVars(channel.transformers);
    }

    //  Channel  config 

    return processed as Channel;
  } catch (error) {
    logger.error({ error, channel: channel.name }, ' Channel ');
    return channel;
  }
}

/**
 *  Channels
 */
export function processChannelsEnvVars(channels: Channel): Channel {
  return channels.map(processChannelEnvVars);
}

/**
 *  RoutingRule 
 */
export function processRoutingRuleEnvVars(rule: RoutingRule): RoutingRule {
  try {
    const processed = {
      ...rule,
      targetChannel: rule.targetChannel ? interpolateEnvVars(rule.targetChannel) : rule.targetChannel,
      targetModel: rule.targetModel ? interpolateEnvVars(rule.targetModel) : rule.targetModel,
    };

    //  condition 
    if (rule.condition) {
      processed.condition = interpolateEnvVars(rule.condition);
    }

    return processed as RoutingRule;
  } catch (error) {
    logger.error({ error, rule: rule.name }, ' RoutingRule ');
    return rule;
  }
}

/**
 *  RoutingRules
 */
export function processRoutingRulesEnvVars(rules: RoutingRule): RoutingRule {
  return rules.map(processRoutingRuleEnvVars);
}

/**
 *  TeeDestination 
 */
export function processTeeDestinationEnvVars(destination: TeeDestination): TeeDestination {
  try {
    const processed = {
      ...destination,
      url: interpolateEnvVars(destination.url),
    };

    //  headers 
    if (destination.headers) {
      processed.headers = interpolateEnvVars(destination.headers);
    }

    return processed as TeeDestination;
  } catch (error) {
    logger.error({ error, destination: destination.name }, ' TeeDestination ');
    return destination;
  }
}

/**
 *  TeeDestinations
 */
export function processTeeDestinationsEnvVars(destinations: TeeDestination): TeeDestination {
  return destinations.map(processTeeDestinationEnvVars);
}

/**
 * 
 */
export function validateConfigEnvVars(config: unknown, configName: string): void {
  const missing = validateEnvVars(config);

  if (missing.length > 0) {
    logger.warn({
      missing,
      hint: ' .env ,'
    }, ` ${configName} :`);
  }
}

/**
 *  .env 
 * Bun  .env ,
 */
export async function loadEnvFile(path: string = '.env'): Promise<void> {
  try {
    const file = Bun.file(path);
    if (!(await file.exists)) {
    logger.info({ path }, '  .env ,');
      return;
    }

    const content = await file.text;
    const lines = content.split('\n');
    let loadedCount = 0;

    for (const line of lines) {
      // 
      const trimmed = line.trim;
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      //  KEY=VALUE 
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        // 
        if (process.env[key] === undefined) {
          process.env[key] = value;
          loadedCount++;
        }
      }
    }

    logger.info({ path, loadedCount }, ' ');
  } catch (error) {
    logger.error({ path, error }, '  .env ');
  }
}

/**
 *  .env.example 
 * 
 */
export function generateEnvExampleFromDb(
  channels: Channel,
  rules: RoutingRule,
  destinations: TeeDestination
): string {
  const envVars = new Set<string>;

  //  Channels 
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

  //  RoutingRules 
  for (const rule of rules) {
    if (rule.targetChannel) {
      extractVarsFromString(rule.targetChannel, envVars);
    }
    if (rule.targetModel) {
      extractVarsFromString(rule.targetModel, envVars);
    }
  }

  //  TeeDestinations 
  for (const dest of destinations) {
    extractVarsFromString(dest.url, envVars);
  }

  if (envVars.size === 0) {
    return '# \n';
  }

  const lines = [
    '# Routex ',
    '#  .env ',
    '# Bun  .env ',
    '',
  ];

  const sorted = Array.from(envVars).sort;
  for (const varName of sorted) {
    lines.push(`# ${varName}=${varName}_VALUE`);
    lines.push(`${varName}=`);
    lines.push('');
  }

  return lines.join('\n');
}

function extractVarsFromString(str: string, vars: Set<string>): void {
  //  ${VAR_NAME}
  const bracketMatches = str.matchAll(/\$\{([A-Z_][A-Z0-9_]*)\}/g);
  for (const match of bracketMatches) {
    vars.add(match[1]);
  }

  //  $VAR_NAME
  const simpleMatches = str.matchAll(/\$([A-Z_][A-Z0-9_]*)(?![}\w])/g);
  for (const match of simpleMatches) {
    vars.add(match[1]);
  }
}
