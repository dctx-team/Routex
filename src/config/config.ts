/**
 * Configuration management with smart defaults
 * 具有智能默认值的配置管理
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { Config, LoadBalanceStrategy } from '../types';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Config;

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
   * Load configuration with smart defaults
   * 加载具有智能默认值的配置
   */
  private loadConfig(): Config {
    const env = this.detectEnvironment();
    const dataDir = this.ensureDataDirectory();

    return {
      server: {
        port: Number(process.env.PORT) || 8080,
        host: env === 'local' ? 'localhost' : '0.0.0.0',
        cors: {
          enabled: true,
          origins: ['*'],
        },
      },
      database: {
        path: join(dataDir, 'routex.db'),
        autoMigration: true,
      },
      strategy: (process.env.LOAD_BALANCE_STRATEGY as LoadBalanceStrategy) || 'priority',
      dashboard: {
        enabled: true,
        password: process.env.DASHBOARD_PASSWORD,
      },
      firstRun: !existsSync(join(dataDir, 'routex.db')),
    };
  }

  /**
   * Detect deployment environment
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
   * Ensure data directory exists
   * 确保数据目录存在
   */
  private ensureDataDirectory(): string {
    const env = this.detectEnvironment();

    let dataDir: string;

    if (env === 'local') {
      dataDir = join(process.cwd(), 'data');
    } else {
      // Use persistent volume path for cloud platforms / 为云平台使用持久卷路径
      dataDir = process.env.DATA_DIR || '/data';
    }

    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    return dataDir;
  }

  /**
   * Get configuration
   * 获取配置
   */
  getConfig(): Config {
    return this.config;
  }

  /**
   * Update configuration
   * 更新配置
   */
  updateConfig(updates: Partial<Config>) {
    this.config = {
      ...this.config,
      ...updates,
    };
  }

  /**
   * Check if this is first run
   * 检查是否为首次运行
   */
  isFirstRun(): boolean {
    return this.config.firstRun;
  }

  /**
   * Mark first run as complete
   * 标记首次运行完成
   */
  markFirstRunComplete() {
    this.config.firstRun = false;
  }
}
