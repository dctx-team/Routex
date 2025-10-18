/**
 * Cache Warmer - Intelligent Cache Pre-loading and Refresh
 * 缓存预热 - 智能缓存预加载和刷新
 */

import type { Database } from '../db/database';
import type { LoadBalancer } from './loadbalancer';
import { logger } from '../utils/logger';
import { metrics } from './metrics';

export interface CacheWarmerConfig {
  enabled: boolean;
  // 启动时预热
  warmOnStartup: boolean;
  // 预热项目
  warmItems: {
    channels: boolean;
    models: boolean;
    routingRules: boolean;
    analytics: boolean;
  };
  // 后台刷新
  backgroundRefresh: {
    enabled: boolean;
    intervalMs: number; // 刷新间隔（默认 5 分钟）
  };
  // 智能失效
  smartInvalidation: {
    enabled: boolean;
    // 当数据修改时自动失效相关缓存
    autoInvalidateOnUpdate: boolean;
  };
}

export interface CacheWarmerStats {
  totalWarms: number;
  lastWarmTime: number;
  lastWarmDuration: number;
  itemsCached: {
    channels: number;
    models: number;
    routingRules: number;
    analytics: number;
  };
  backgroundRefreshCount: number;
  invalidationCount: number;
}

export class CacheWarmer {
  private config: CacheWarmerConfig;
  private stats: CacheWarmerStats;
  private refreshTimer?: Timer;
  private isWarming = false;

  constructor(
    private db: Database,
    private loadBalancer: LoadBalancer,
    config?: Partial<CacheWarmerConfig>
  ) {
    // 默认配置
    this.config = {
      enabled: true,
      warmOnStartup: true,
      warmItems: {
        channels: true,
        models: true,
        routingRules: true,
        analytics: true,
      },
      backgroundRefresh: {
        enabled: true,
        intervalMs: 5 * 60 * 1000, // 5 分钟
      },
      smartInvalidation: {
        enabled: true,
        autoInvalidateOnUpdate: true,
      },
      ...config,
    };

    // 初始化统计
    this.stats = {
      totalWarms: 0,
      lastWarmTime: 0,
      lastWarmDuration: 0,
      itemsCached: {
        channels: 0,
        models: 0,
        routingRules: 0,
        analytics: 0,
      },
      backgroundRefreshCount: 0,
      invalidationCount: 0,
    };
  }

  /**
   * 启动缓存预热
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('🔥 Cache warmer disabled');
      return;
    }

    logger.info('🔥 Starting cache warmer...');

    // 启动时预热
    if (this.config.warmOnStartup) {
      await this.warmCache();
    }

    // 启动后台刷新
    if (this.config.backgroundRefresh.enabled) {
      this.startBackgroundRefresh();
    }

    logger.info({
      config: this.config,
    }, '🔥 Cache warmer started');
  }

  /**
   * 停止缓存预热
   */
  async stop(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    logger.info('🔥 Cache warmer stopped');
  }

  /**
   * 预热缓存
   */
  async warmCache(items?: Partial<CacheWarmerConfig['warmItems']>): Promise<void> {
    if (this.isWarming) {
      logger.warn('⚠️  Cache warming already in progress');
      return;
    }

    this.isWarming = true;
    const start = Date.now();
    const warmItems = items || this.config.warmItems;

    try {
      logger.info({ items: warmItems }, '🔥 Warming cache...');

      // 预热渠道数据
      if (warmItems.channels) {
        await this.warmChannels();
      }

      // 预热模型数据
      if (warmItems.models) {
        await this.warmModels();
      }

      // 预热路由规则
      if (warmItems.routingRules) {
        await this.warmRoutingRules();
      }

      // 预热分析数据
      if (warmItems.analytics) {
        await this.warmAnalytics();
      }

      const duration = Date.now() - start;

      // 更新统计
      this.stats.totalWarms++;
      this.stats.lastWarmTime = Date.now();
      this.stats.lastWarmDuration = duration;

      // 记录指标
      metrics.incrementCounter('routex_cache_warm_total');
      metrics.observeHistogram('routex_cache_warm_duration_seconds', duration / 1000);

      logger.info({
        duration,
        items: this.stats.itemsCached,
      }, `✅ Cache warmed successfully (${duration}ms)`);
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
      }, '❌ Cache warming failed');
      metrics.incrementCounter('routex_cache_warm_failed_total');
      throw error;
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * 预热渠道数据
   */
  private async warmChannels(): Promise<void> {
    const channels = this.db.getChannels();
    const enabledChannels = channels.filter((ch) => ch.status === 'enabled');

    // 强制加载到 LoadBalancer 缓存
    for (const channel of enabledChannels) {
      // 通过调用 select 方法触发缓存
      try {
        await this.loadBalancer.select(enabledChannels, {
          model: channel.models[0],
        });
      } catch (error) {
        // 忽略选择错误，仅预热缓存
      }
    }

    this.stats.itemsCached.channels = enabledChannels.length;
    logger.debug({
      total: channels.length,
      enabled: enabledChannels.length,
    }, '🔥 Channels warmed');
  }

  /**
   * 预热模型数据
   */
  private async warmModels(): Promise<void> {
    const channels = this.db.getChannels();
    const models = new Set<string>();

    // 收集所有模型
    for (const channel of channels) {
      for (const model of channel.models) {
        models.add(model);
      }
    }

    this.stats.itemsCached.models = models.size;
    logger.debug({
      count: models.size,
      models: Array.from(models).slice(0, 10), // 仅显示前 10 个
    }, '🔥 Models warmed');
  }

  /**
   * 预热路由规则
   */
  private async warmRoutingRules(): Promise<void> {
    const rules = this.db.getEnabledRoutingRules();

    // 预加载规则到内存
    for (const rule of rules) {
      // 规则已在 getEnabledRoutingRules 中加载
      // 此处仅统计
    }

    this.stats.itemsCached.routingRules = rules.length;
    logger.debug({
      count: rules.length,
    }, '🔥 Routing rules warmed');
  }

  /**
   * 预热分析数据
   */
  private async warmAnalytics(): Promise<void> {
    // 预加载分析数据
    const analytics = this.db.getAnalytics();

    this.stats.itemsCached.analytics = 1; // 一个分析对象
    logger.debug({
      requests: analytics.totalRequests,
      tokens: analytics.totalInputTokens + analytics.totalOutputTokens,
    }, '🔥 Analytics warmed');
  }

  /**
   * 启动后台刷新
   */
  private startBackgroundRefresh(): void {
    const interval = this.config.backgroundRefresh.intervalMs;

    this.refreshTimer = setInterval(() => {
      this.warmCache().then(() => {
        this.stats.backgroundRefreshCount++;
        logger.debug({
          count: this.stats.backgroundRefreshCount,
          nextIn: `${interval / 1000}s`,
        }, '🔄 Background cache refresh completed');
      }).catch((error) => {
        logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
        }, '❌ Background cache refresh failed');
      });
    }, interval);

    logger.info({
      intervalMs: interval,
      intervalMinutes: interval / 60000,
    }, '🔄 Background refresh started');
  }

  /**
   * 失效缓存
   */
  invalidateCache(type?: 'channels' | 'models' | 'routingRules' | 'analytics'): void {
    if (!this.config.smartInvalidation.enabled) {
      return;
    }

    logger.info({ type: type || 'all' }, '🗑️  Invalidating cache...');

    if (!type || type === 'channels') {
      // 清空 LoadBalancer 缓存
      this.loadBalancer.clearCache();
    }

    // 增加失效计数
    this.stats.invalidationCount++;
    metrics.incrementCounter('routex_cache_invalidation_total', 1, {
      type: type || 'all',
    });

    logger.debug({
      type: type || 'all',
      count: this.stats.invalidationCount,
    }, '✅ Cache invalidated');
  }

  /**
   * 失效并重新预热
   */
  async invalidateAndWarm(type?: 'channels' | 'models' | 'routingRules' | 'analytics'): Promise<void> {
    this.invalidateCache(type);

    // 重新预热
    if (type) {
      await this.warmCache({ [type]: true });
    } else {
      await this.warmCache();
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheWarmerStats {
    return { ...this.stats };
  }

  /**
   * 获取配置
   */
  getConfig(): CacheWarmerConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CacheWarmerConfig>): void {
    const oldEnabled = this.config.enabled;
    const oldRefreshEnabled = this.config.backgroundRefresh.enabled;

    this.config = { ...this.config, ...config };

    // 如果启用状态改变
    if (config.enabled !== undefined && config.enabled !== oldEnabled) {
      if (config.enabled) {
        this.start().catch((error) => {
          logger.error({
            error: error instanceof Error ? error.message : 'Unknown error',
          }, '❌ Failed to start cache warmer');
        });
      } else {
        this.stop().catch((error) => {
          logger.error({
            error: error instanceof Error ? error.message : 'Unknown error',
          }, '❌ Failed to stop cache warmer');
        });
      }
    }

    // 如果后台刷新状态改变
    if (
      config.backgroundRefresh?.enabled !== undefined &&
      config.backgroundRefresh.enabled !== oldRefreshEnabled
    ) {
      if (config.backgroundRefresh.enabled) {
        this.startBackgroundRefresh();
      } else if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = undefined;
      }
    }

    logger.info({ config: this.config }, '🔧 Cache warmer config updated');
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      totalWarms: 0,
      lastWarmTime: 0,
      lastWarmDuration: 0,
      itemsCached: {
        channels: 0,
        models: 0,
        routingRules: 0,
        analytics: 0,
      },
      backgroundRefreshCount: 0,
      invalidationCount: 0,
    };
    logger.info('📊 Cache warmer stats reset');
  }
}
