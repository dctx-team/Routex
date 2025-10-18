/**
 * Configuration management with smart defaults
 *
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
 *
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
      i18n: {
        locale: (process.env.LOCALE as 'en' | 'zh-CN') || 'en',
        fallback: 'en',
      },
      firstRun: !existsSync(join(dataDir, 'routex.db')),
    };
  }

  /**
   * Detect deployment environment
 *
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
 *
   */
  private ensureDataDirectory(): string {
    const env = this.detectEnvironment();

    let dataDir: string;

    if (env === 'local') {
      dataDir = join(process.cwd(), 'data');
    } else {
      //// Use persistent volume path for cloud platforms
      dataDir = process.env.DATA_DIR || '/data';
    }

    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    return dataDir;
  }

  /**
   * Get configuration
 *
   */
  getConfig(): Config {
    return this.config;
  }

  /**
   * Update configuration
 *
   */
  updateConfig(updates: Partial<Config>) {
    this.config = {
      ...this.config,
      ...updates,
    };
  }

  /**
   * Check if this is first run
 *
   */
  isFirstRun(): boolean {
    return this.config.firstRun;
  }

  /**
   * Mark first run as complete
 *
   */
  markFirstRunComplete() {
    this.config.firstRun = false;
  }
}
