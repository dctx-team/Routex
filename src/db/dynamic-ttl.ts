/**
 *  TTL 
 *  TTL
 */

import { logger } from '../utils/logger';

/**
 * 
 */
export type CacheType = 'channels' | 'singleChannel' | 'routingRules' | 'enabledChannels';

/**
 * TTL 
 */
export interface TTLConfig {
  minTTL: number;           //  TTL
  maxTTL: number;           //  TTL
  defaultTTL: number;       //  TTL
  adjustmentInterval: number; // 
  targetHitRate: number;    // 0-1
  hitRateWindow: number;    // 
}

/**
 * 
 */
interface CacheStats {
  hits: number;
  misses: number;
  accesses: number;       // 
  lastAdjustment: number;   // 
  currentTTL: number;       //  TTL
}

/**
 * 
 */
const DEFAULT_CONFIG: TTLConfig = {
  minTTL: 5000,             // 5 
  maxTTL: 300000,           // 5 
  defaultTTL: 30000,        // 30 
  adjustmentInterval: 60000, // 1 
  targetHitRate: 0.85,      // 85% 
  hitRateWindow: 100,       //  100 
};

/**
 *  TTL 
 */
export class DynamicTTLManager {
  private config: TTLConfig;
  private stats = new Map<CacheType, CacheStats>;
  private adjustmentTimer?: Timer;

  constructor(config?: Partial<TTLConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // 
    this.loadFromEnv;

    logger.debug({
      config: this.config,
    }, '⏱️  Dynamic TTL manager initialized');
  }

  /**
   * 
   */
  private loadFromEnv {
    if (process.env.TTL_MIN) {
      this.config.minTTL = Number(process.env.TTL_MIN);
    }
    if (process.env.TTL_MAX) {
      this.config.maxTTL = Number(process.env.TTL_MAX);
    }
    if (process.env.TTL_DEFAULT) {
      this.config.defaultTTL = Number(process.env.TTL_DEFAULT);
    }
    if (process.env.TTL_TARGET_HIT_RATE) {
      this.config.targetHitRate = Number(process.env.TTL_TARGET_HIT_RATE);
    }
  }

  /**
   * 
   */
  start {
    if (this.adjustmentTimer) {
      return;
    }

    this.adjustmentTimer = setInterval( => {
      this.adjustAllTTLs;
    }, this.config.adjustmentInterval);

    logger.info({
      interval: this.config.adjustmentInterval,
    }, '⏱️  Dynamic TTL adjustment started');
  }

  /**
   * 
   */
  stop {
    if (this.adjustmentTimer) {
      clearInterval(this.adjustmentTimer);
      this.adjustmentTimer = undefined;
    }
    logger.info('⏱️  Dynamic TTL adjustment stopped');
  }

  /**
   *  TTL
   */
  getTTL(cacheType: CacheType): number {
    const stats = this.getOrCreateStats(cacheType);
    return stats.currentTTL;
  }

  /**
   * 
   */
  recordHit(cacheType: CacheType) {
    const stats = this.getOrCreateStats(cacheType);
    stats.hits++;
    this.recordAccess(stats);
  }

  /**
   * 
   */
  recordMiss(cacheType: CacheType) {
    const stats = this.getOrCreateStats(cacheType);
    stats.misses++;
    this.recordAccess(stats);
  }

  /**
   * 
   */
  private recordAccess(stats: CacheStats) {
    stats.accesses.push(Date.now);

    // 
    if (stats.accesses.length > this.config.hitRateWindow) {
      stats.accesses.shift;
    }
  }

  /**
   * 
   */
  private getOrCreateStats(cacheType: CacheType): CacheStats {
    let stats = this.stats.get(cacheType);
    if (!stats) {
      stats = {
        hits: 0,
        misses: 0,
        accesses: ,
        lastAdjustment: Date.now,
        currentTTL: this.config.defaultTTL,
      };
      this.stats.set(cacheType, stats);
    }
    return stats;
  }

  /**
   * 
   */
  private calculateHitRate(stats: CacheStats): number {
    const total = stats.hits + stats.misses;
    if (total === 0) return 1.0; //  100%
    return stats.hits / total;
  }

  /**
   * 
   */
  private calculateAccessFrequency(stats: CacheStats): number {
    if (stats.accesses.length < 2) return 0;

    const now = Date.now;
    const oldestAccess = stats.accesses[0];
    const duration = (now - oldestAccess) / 1000; // 

    if (duration === 0) return 0;

    return stats.accesses.length / duration;
  }

  /**
   *  TTL
   */
  adjustTTL(cacheType: CacheType): number {
    const stats = this.getOrCreateStats(cacheType);
    const now = Date.now;

    // 
    if (now - stats.lastAdjustment < this.config.adjustmentInterval) {
      return stats.currentTTL;
    }

    const hitRate = this.calculateHitRate(stats);
    const accessFrequency = this.calculateAccessFrequency(stats);
    const oldTTL = stats.currentTTL;

    let newTTL = oldTTL;

    //  1: 
    if (hitRate < this.config.targetHitRate) {
      //  TTL
      const increase = Math.ceil(oldTTL * 0.2); //  20%
      newTTL = Math.min(oldTTL + increase, this.config.maxTTL);

      logger.debug({
        cacheType,
        hitRate: (hitRate * 100).toFixed(2) + '%',
        targetRate: (this.config.targetHitRate * 100).toFixed(2) + '%',
        oldTTL,
        newTTL,
        reason: 'low_hit_rate',
      }, `⬆️  Increasing TTL for ${cacheType}`);
    } else if (hitRate > this.config.targetHitRate + 0.1) {
      //  TTL
      const decrease = Math.ceil(oldTTL * 0.1); //  10%
      newTTL = Math.max(oldTTL - decrease, this.config.minTTL);

      logger.debug({
        cacheType,
        hitRate: (hitRate * 100).toFixed(2) + '%',
        targetRate: (this.config.targetHitRate * 100).toFixed(2) + '%',
        oldTTL,
        newTTL,
        reason: 'high_hit_rate',
      }, `⬇️  Decreasing TTL for ${cacheType}`);
    }

    //  2: 
    if (accessFrequency > 10) {
      //  TTL 
      const decrease = Math.ceil(newTTL * 0.1);
      newTTL = Math.max(newTTL - decrease, this.config.minTTL);

      logger.debug({
        cacheType,
        accessFrequency: accessFrequency.toFixed(2) + '/s',
        oldTTL,
        newTTL,
        reason: 'high_frequency',
      }, `⬇️  Decreasing TTL for high-frequency cache ${cacheType}`);
    } else if (accessFrequency < 0.1) {
      //  TTL 
      const increase = Math.ceil(newTTL * 0.2);
      newTTL = Math.min(newTTL + increase, this.config.maxTTL);

      logger.debug({
        cacheType,
        accessFrequency: accessFrequency.toFixed(2) + '/s',
        oldTTL,
        newTTL,
        reason: 'low_frequency',
      }, `⬆️  Increasing TTL for low-frequency cache ${cacheType}`);
    }

    // 
    stats.currentTTL = newTTL;
    stats.lastAdjustment = now;

    //  TTL 
    if (Math.abs(newTTL - oldTTL) > oldTTL * 0.1) {
      logger.info({
        cacheType,
        oldTTL,
        newTTL,
        change: ((newTTL - oldTTL) / oldTTL * 100).toFixed(2) + '%',
        hitRate: (hitRate * 100).toFixed(2) + '%',
        accessFrequency: accessFrequency.toFixed(2) + '/s',
      }, `⏱️  TTL adjusted for ${cacheType}`);
    }

    return newTTL;
  }

  /**
   *  TTL
   */
  private adjustAllTTLs {
    for (const cacheType of this.stats.keys) {
      try {
        this.adjustTTL(cacheType);
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
          cacheType,
        }, `❌ Failed to adjust TTL for ${cacheType}`);
      }
    }
  }

  /**
   * 
   */
  getStats: Record<CacheType, {
    hits: number;
    misses: number;
    hitRate: string;
    accessFrequency: string;
    currentTTL: number;
  }> {
    const result: Partial<Record<CacheType, {
      hits: number;
      misses: number;
      hitRate: string;
      accessFrequency: string;
      currentTTL: number;
    }>> = {};

    for (const [cacheType, stats] of this.stats.entries) {
      const hitRate = this.calculateHitRate(stats);
      const accessFrequency = this.calculateAccessFrequency(stats);

      result[cacheType] = {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: (hitRate * 100).toFixed(2) + '%',
        accessFrequency: accessFrequency.toFixed(2) + '/s',
        currentTTL: stats.currentTTL,
      };
    }

    return result as Record<CacheType, {
      hits: number;
      misses: number;
      hitRate: string;
      accessFrequency: string;
      currentTTL: number;
    }>;
  }

  /**
   * 
   */
  resetStats(cacheType?: CacheType) {
    if (cacheType) {
      this.stats.delete(cacheType);
      logger.info({ cacheType }, `📊 Reset stats for ${cacheType}`);
    } else {
      this.stats.clear;
      logger.info('📊 Reset all cache stats');
    }
  }

  /**
   *  TTL
   */
  setTTL(cacheType: CacheType, ttl: number) {
    const stats = this.getOrCreateStats(cacheType);
    const clampedTTL = Math.max(
      this.config.minTTL,
      Math.min(ttl, this.config.maxTTL)
    );

    stats.currentTTL = clampedTTL;

    logger.info({
      cacheType,
      ttl: clampedTTL,
    }, `⏱️  Manually set TTL for ${cacheType}`);
  }

  /**
   * 
   */
  getConfig: TTLConfig {
    return { ...this.config };
  }

  /**
   * 
   */
  updateConfig(config: Partial<TTLConfig>) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };

    // 
    if (config.adjustmentInterval && config.adjustmentInterval !== oldConfig.adjustmentInterval) {
      this.stop;
      this.start;
    }

    logger.info({
      oldConfig,
      newConfig: this.config,
    }, '⏱️  TTL config updated');
  }
}
