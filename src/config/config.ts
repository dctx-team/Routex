/**
 * 配置管理（具有智能默认值）
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { Config, LoadBalanceStrategy } from '../types';
import { logger } from '../utils/logger';

/**
 * 配置验证错误
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

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 加载配置（具有智能默认值）
   * 优先级：配置文件 > 环境变量 > 默认值
   */
  private loadConfig(): Config {
    const env = this.detectEnvironment();
    const dataDir = this.ensureDataDirectory();

    // 首先尝试从配置文件加载
    let fileConfig: Partial<Config> = {};
    const configPath = this.findConfigFile();

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

    // 按优先级构建配置：文件 > 环境变量 > 默认值
    const config: Config = {
      server: {
        port: fileConfig.server?.port ?? (Number(process.env.PORT) || 3000),
        host: fileConfig.server?.host ?? (env === 'local' ? 'localhost' : '0.0.0.0'),
        cors: {
          enabled: fileConfig.server?.cors?.enabled ?? true,
          origins: fileConfig.server?.cors?.origins ??
            (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()) : ['*']),
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

    // 验证配置
    this.validateConfig(config);

    return config;
  }

  /**
   * 在标准位置查找配置文件
   */
  private findConfigFile(): string | null {
    const locations = [
      process.env.CONFIG_FILE, // 来自环境变量的显式路径
      join(process.cwd(), 'routex.config.json'),
      join(process.cwd(), 'config', 'routex.json'),
      join(process.cwd(), '.routex', 'config.json'),
    ];

    for (const location of locations) {
      if (location && existsSync(location)) {
        return location;
      }
    }

    return null;
  }

  /**
   * 从 JSON 文件加载配置
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
   * 验证配置
   */
  private validateConfig(config: Config): void {
    // 验证服务器端口
    if (config.server.port < 1 || config.server.port > 65535) {
      throw new ConfigValidationError(
        `Invalid server port: ${config.server.port}. Must be between 1 and 65535`,
        'server.port'
      );
    }

    // 验证策略
    const validStrategies: LoadBalanceStrategy[] = ['priority', 'round_robin', 'weighted', 'least_used'];
    if (!validStrategies.includes(config.strategy)) {
      throw new ConfigValidationError(
        `Invalid load balance strategy: ${config.strategy}. Must be one of: ${validStrategies.join(', ')}`,
        'strategy'
      );
    }

    // 验证国际化语言环境
    const validLocales = ['en', 'zh-CN'];
    if (!validLocales.includes(config.i18n.locale)) {
      throw new ConfigValidationError(
        `Invalid locale: ${config.i18n.locale}. Must be one of: ${validLocales.join(', ')}`,
        'i18n.locale'
      );
    }

    // 验证 CORS 源
    if (config.server.cors && !Array.isArray(config.server.cors.origins)) {
      throw new ConfigValidationError(
        'CORS origins must be an array',
        'server.cors.origins'
      );
    }

    logger.debug('✅ Configuration validated successfully');
  }

  /**
   * 检测部署环境
   */
  private detectEnvironment(): 'local' | 'claw' | 'railway' | 'fly' | 'render' {
    if (process.env.CLAW_RUNTIME) return 'claw';
    if (process.env.RAILWAY_ENVIRONMENT) return 'railway';
    if (process.env.FLY_APP_NAME) return 'fly';
    if (process.env.RENDER) return 'render';
    return 'local';
  }

  /**
   * 确保数据目录存在
   */
  private ensureDataDirectory(): string {
    const env = this.detectEnvironment();

    let dataDir: string;

    if (env === 'local') {
      dataDir = join(process.cwd(), 'data');
    } else {
      // 使用云平台的持久卷路径
      dataDir = process.env.DATA_DIR || '/data';
    }

    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    return dataDir;
  }

  /**
   * 获取配置
   */
  getConfig(): Config {
    return this.config;
  }

  /**
   * 运行时更新配置
   * 应用前验证更新
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

    // 应用前验证
    this.validateConfig(newConfig);

    this.config = newConfig;
    logger.info({ updates: Object.keys(updates) }, '⚙️  Configuration updated');
  }

  /**
   * 从文件重新加载配置
   * 用于热重载配置更改
   */
  reloadConfig(): void {
    try {
      const newConfig = this.loadConfig();
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
   * 将当前配置保存到文件
   */
  saveConfig(path?: string): void {
    const savePath = path || this.configFilePath || join(process.cwd(), 'routex.config.json');

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
   * 将配置导出为 JSON 字符串
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 获取配置文件路径
   */
  getConfigFilePath(): string | undefined {
    return this.configFilePath;
  }

  /**
   * 检查是否为首次运行
   */
  isFirstRun(): boolean {
    return this.config.firstRun;
  }

  /**
   * 标记首次运行为完成
   */
  markFirstRunComplete() {
    this.config.firstRun = false;
  }
}
