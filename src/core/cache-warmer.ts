/**
 * Cache Warmer - Intelligent Cache Pre-loading and Refresh
 *
 */

import type { Database } from '../db/database';
import type { LoadBalancer } from './loadbalancer';
import { logger } from '../utils/logger';
import { metrics } from './metrics';

export interface CacheWarmerConfig {
  enabled: boolean;
  // 
  warmOnStartup: boolean;
  // 
  warmItems: {
    channels: boolean;
    models: boolean;
    routingRules: boolean;
    analytics: boolean;
  };
  // 
  backgroundRefresh: {
    enabled: boolean;
    intervalMs: number; //  5 
  };
  // 
  smartInvalidation: {
    enabled: boolean;
    // 
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
    // 
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
        intervalMs: 5 * 60 * 1000, // 5 
      },
      smartInvalidation: {
        enabled: true,
        autoInvalidateOnUpdate: true,
      },
      ...config,
    };

    // 
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
   * 
   */
  async start: Promise<void> {
    if (!this.config.enabled) {
      logger.info('🔥 Cache warmer disabled');
      return;
    }

    logger.info('🔥 Starting cache warmer...');

    // 
    if (this.config.warmOnStartup) {
      await this.warmCache;
    }

    // 
    if (this.config.backgroundRefresh.enabled) {
      this.startBackgroundRefresh;
    }

    logger.info({
      config: this.config,
    }, '🔥 Cache warmer started');
  }

  /**
   * 
   */
  async stop: Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    logger.info('🔥 Cache warmer stopped');
  }

  /**
   * 
   */
  async warmCache(items?: Partial<CacheWarmerConfig['warmItems']>): Promise<void> {
    if (this.isWarming) {
      logger.warn('⚠️  Cache warming already in progress');
      return;
    }

    this.isWarming = true;
    const start = Date.now;
    const warmItems = items || this.config.warmItems;

    try {
      logger.info({ items: warmItems }, '🔥 Warming cache...');

      // 
      if (warmItems.channels) {
        await this.warmChannels;
      }

      // 
      if (warmItems.models) {
        await this.warmModels;
      }

      // 
      if (warmItems.routingRules) {
        await this.warmRoutingRules;
      }

      // 
      if (warmItems.analytics) {
        await this.warmAnalytics;
      }

      const duration = Date.now - start;

      // 
      this.stats.totalWarms++;
      this.stats.lastWarmTime = Date.now;
      this.stats.lastWarmDuration = duration;

      // 
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
   * 
   */
  private async warmChannels: Promise<void> {
    const channels = this.db.getChannels;
    const enabledChannels = channels.filter((ch) => ch.status === 'enabled');

    //  LoadBalancer 
    for (const channel of enabledChannels) {
      //  select 
      try {
        await this.loadBalancer.select(enabledChannels, {
          model: channel.models[0],
        });
      } catch (error) {
        // 
      }
    }

    this.stats.itemsCached.channels = enabledChannels.length;
    logger.debug({
      total: channels.length,
      enabled: enabledChannels.length,
    }, '🔥 Channels warmed');
  }

  /**
   * 
   */
  private async warmModels: Promise<void> {
    const channels = this.db.getChannels;
    const models = new Set<string>;

    // 
    for (const channel of channels) {
      for (const model of channel.models) {
        models.add(model);
      }
    }

    this.stats.itemsCached.models = models.size;
    logger.debug({
      count: models.size,
      models: Array.from(models).slice(0, 10), //  10 
    }, '🔥 Models warmed');
  }

  /**
   * 
   */
  private async warmRoutingRules: Promise<void> {
    const rules = this.db.getEnabledRoutingRules;

    // 
    for (const rule of rules) {
      //  getEnabledRoutingRules 
      // 
    }

    this.stats.itemsCached.routingRules = rules.length;
    logger.debug({
      count: rules.length,
    }, '🔥 Routing rules warmed');
  }

  /**
   * 
   */
  private async warmAnalytics: Promise<void> {
    // 
    const analytics = this.db.getAnalytics;

    this.stats.itemsCached.analytics = 1; // 
    logger.debug({
      requests: analytics.totalRequests,
      tokens: analytics.totalInputTokens + analytics.totalOutputTokens,
    }, '🔥 Analytics warmed');
  }

  /**
   * 
   */
  private startBackgroundRefresh: void {
    const interval = this.config.backgroundRefresh.intervalMs;

    this.refreshTimer = setInterval( => {
      this.warmCache.then( => {
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
   * 
   */
  invalidateCache(type?: 'channels' | 'models' | 'routingRules' | 'analytics'): void {
    if (!this.config.smartInvalidation.enabled) {
      return;
    }

    logger.info({ type: type || 'all' }, '🗑️  Invalidating cache...');

    if (!type || type === 'channels') {
      //  LoadBalancer 
      this.loadBalancer.clearCache;
    }

    // 
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
   * 
   */
  async invalidateAndWarm(type?: 'channels' | 'models' | 'routingRules' | 'analytics'): Promise<void> {
    this.invalidateCache(type);

    // 
    if (type) {
      await this.warmCache({ [type]: true });
    } else {
      await this.warmCache;
    }
  }

  /**
   * 
   */
  getStats: CacheWarmerStats {
    return { ...this.stats };
  }

  /**
   * 
   */
  getConfig: CacheWarmerConfig {
    return { ...this.config };
  }

  /**
   * 
   */
  updateConfig(config: Partial<CacheWarmerConfig>): void {
    const oldEnabled = this.config.enabled;
    const oldRefreshEnabled = this.config.backgroundRefresh.enabled;

    this.config = { ...this.config, ...config };

    // 
    if (config.enabled !== undefined && config.enabled !== oldEnabled) {
      if (config.enabled) {
        this.start.catch((error) => {
          logger.error({
            error: error instanceof Error ? error.message : 'Unknown error',
          }, '❌ Failed to start cache warmer');
        });
      } else {
        this.stop.catch((error) => {
          logger.error({
            error: error instanceof Error ? error.message : 'Unknown error',
          }, '❌ Failed to stop cache warmer');
        });
      }
    }

    // 
    if (
      config.backgroundRefresh?.enabled !== undefined &&
      config.backgroundRefresh.enabled !== oldRefreshEnabled
    ) {
      if (config.backgroundRefresh.enabled) {
        this.startBackgroundRefresh;
      } else if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = undefined;
      }
    }

    logger.info({ config: this.config }, '🔧 Cache warmer config updated');
  }

  /**
   * 
   */
  resetStats: void {
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
