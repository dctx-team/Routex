/**
 * 
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { Config, LoadBalanceStrategy } from '../types';
import { logger } from '../utils/logger';

/**
 * 
 */
export class ConfigValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Config;
  private configFilePath?: string;

  private constructor {
    this.config = this.loadConfig;
  }

  static getInstance: ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager;
    }
    return ConfigManager.instance;
  }

  /**
   * 
   *  >  > 
   */
  private loadConfig: Config {
    const env = this.detectEnvironment;
    const dataDir = this.ensureDataDirectory;

    // 
    let fileConfig: Partial<Config> = {};
    const configPath = this.findConfigFile;

    if (configPath) {
      try {
        fileConfig = this.loadConfigFile(configPath);
        this.configFilePath = configPath;
        logger.info({ configPath }, '📄 Loaded configuration from file');
      } catch (error) {
        logger.warn({
          configPath,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, '⚠️  Failed to load config file, using defaults');
      }
    }

    //  >  > 
    const config: Config = {
      server: {
        port: fileConfig.server?.port ?? Number(process.env.PORT) || 3000,
        host: fileConfig.server?.host ?? (env === 'local' ? 'localhost' : '0.0.0.0'),
        cors: {
          enabled: fileConfig.server?.cors?.enabled ?? true,
          origins: fileConfig.server?.cors?.origins ??
            (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(o => o.trim) : ['*']),
        },
      },
      database: {
        path: fileConfig.database?.path ?? join(dataDir, 'routex.db'),
        autoMigration: fileConfig.database?.autoMigration ?? true,
      },
      strategy: fileConfig.strategy ?? (process.env.LOAD_BALANCE_STRATEGY as LoadBalanceStrategy) ?? 'priority',
      dashboard: {
        enabled: fileConfig.dashboard?.enabled ?? true,
        password: fileConfig.dashboard?.password ?? process.env.DASHBOARD_PASSWORD,
      },
      i18n: {
        locale: fileConfig.i18n?.locale ?? (process.env.LOCALE as 'en' | 'zh-CN') ?? 'en',
        fallback: fileConfig.i18n?.fallback ?? 'en',
      },
      firstRun: !existsSync(join(dataDir, 'routex.db')),
    };

    // 
    this.validateConfig(config);

    return config;
  }

  /**
   * 
   */
  private findConfigFile: string | null {
    const locations = [
      process.env.CONFIG_FILE, // 
      join(process.cwd, 'routex.config.json'),
      join(process.cwd, 'config', 'routex.json'),
      join(process.cwd, '.routex', 'config.json'),
    ];

    for (const location of locations) {
      if (location && existsSync(location)) {
        return location;
      }
    }

    return null;
  }

  /**
   *  JSON 
   */
  private loadConfigFile(path: string): Partial<Config> {
    try {
      const content = readFileSync(path, 'utf-8');
      const config = JSON.parse(content);
      return config;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ConfigValidationError(`Invalid JSON in config file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 
   */
  private validateConfig(config: Config): void {
    // 
    if (config.server.port < 1 || config.server.port > 65535) {
      throw new ConfigValidationError(
        `Invalid server port: ${config.server.port}. Must be between 1 and 65535`,
        'server.port'
      );
    }

    // 
    const validStrategies: LoadBalanceStrategy = ['priority', 'round_robin', 'weighted', 'least_used'];
    if (!validStrategies.includes(config.strategy)) {
      throw new ConfigValidationError(
        `Invalid load balance strategy: ${config.strategy}. Must be one of: ${validStrategies.join(', ')}`,
        'strategy'
      );
    }

    // 
    const validLocales = ['en', 'zh-CN'];
    if (!validLocales.includes(config.i18n.locale)) {
      throw new ConfigValidationError(
        `Invalid locale: ${config.i18n.locale}. Must be one of: ${validLocales.join(', ')}`,
        'i18n.locale'
      );
    }

    //  CORS 
    if (!Array.isArray(config.server.cors.origins)) {
      throw new ConfigValidationError(
        'CORS origins must be an array',
        'server.cors.origins'
      );
    }

    logger.debug('✅ Configuration validated successfully');
  }

  /**
   * 
   */
  private detectEnvironment: 'local' | 'claw' | 'railway' | 'fly' | 'render' {
    if (process.env.CLAW_RUNTIME) return 'claw';
    if (process.env.RAILWAY_ENVIRONMENT) return 'railway';
    if (process.env.FLY_APP_NAME) return 'fly';
    if (process.env.RENDER) return 'render';
    return 'local';
  }

  /**
   * 
   */
  private ensureDataDirectory: string {
    const env = this.detectEnvironment;

    let dataDir: string;

    if (env === 'local') {
      dataDir = join(process.cwd, 'data');
    } else {
      // 
      dataDir = process.env.DATA_DIR || '/data';
    }

    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    return dataDir;
  }

  /**
   * 
   */
  getConfig: Config {
    return this.config;
  }

  /**
   * 
   * 
   */
  updateConfig(updates: Partial<Config>) {
    const newConfig = {
      ...this.config,
      ...updates,
      server: updates.server ? { ...this.config.server, ...updates.server } : this.config.server,
      database: updates.database ? { ...this.config.database, ...updates.database } : this.config.database,
      dashboard: updates.dashboard ? { ...this.config.dashboard, ...updates.dashboard } : this.config.dashboard,
      i18n: updates.i18n ? { ...this.config.i18n, ...updates.i18n } : this.config.i18n,
    };

    // 
    this.validateConfig(newConfig);

    this.config = newConfig;
    logger.info({ updates: Object.keys(updates) }, '⚙️  Configuration updated');
  }

  /**
   * 
   * 
   */
  reloadConfig: void {
    try {
      const newConfig = this.loadConfig;
      this.config = newConfig;
      logger.info('🔄 Configuration reloaded successfully');
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
      }, '❌ Failed to reload configuration');
      throw error;
    }
  }

  /**
   * 
   */
  saveConfig(path?: string): void {
    const savePath = path || this.configFilePath || join(process.cwd, 'routex.config.json');

    try {
      const configData = JSON.stringify(this.config, null, 2);
      writeFileSync(savePath, configData, 'utf-8');
      this.configFilePath = savePath;
      logger.info({ path: savePath }, '💾 Configuration saved to file');
    } catch (error) {
      logger.error({
        path: savePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, '❌ Failed to save configuration');
      throw error;
    }
  }

  /**
   *  JSON 
   */
  exportConfig: string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 
   */
  getConfigFilePath: string | undefined {
    return this.configFilePath;
  }

  /**
   * 
   */
  isFirstRun: boolean {
    return this.config.firstRun;
  }

  /**
   * 
   */
  markFirstRunComplete {
    this.config.firstRun = false;
  }
}
