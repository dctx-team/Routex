/**
 * 动态 TTL 调整策略
 * 根据缓存命中率和访问模式自适应调整 TTL
 */

import { logger } from '../utils/logger';

/**
 * 缓存类型
 */
export type CacheType = 'channels' | 'singleChannel' | 'routingRules' | 'enabledChannels';

/**
 * TTL 配置
 */
export interface TTLConfig {
  minTTL: number;           // 最小 TTL（毫秒）
  maxTTL: number;           // 最大 TTL（毫秒）
  defaultTTL: number;       // 默认 TTL（毫秒）
  adjustmentInterval: number; // 调整间隔（毫秒）
  targetHitRate: number;    // 目标命中率（0-1）
  hitRateWindow: number;    // 命中率统计窗口大小
}

/**
 * 缓存统计信息
 */
interface CacheStats {
  hits: number;
  misses: number;
  accesses: number[];       // 访问时间戳（用于计算访问频率）
  lastAdjustment: number;   // 上次调整时间
  currentTTL: number;       // 当前 TTL
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: TTLConfig = {
  minTTL: 5000,             // 5 秒
  maxTTL: 300000,           // 5 分钟
  defaultTTL: 30000,        // 30 秒
  adjustmentInterval: 60000, // 1 分钟
  targetHitRate: 0.85,      // 85% 目标命中率
  hitRateWindow: 100,       // 统计最近 100 次访问
};

/**
 * 动态 TTL 管理器
 */
export class DynamicTTLManager {
  private config: TTLConfig;
  private stats = new Map<CacheType, CacheStats>();
  private adjustmentTimer?: Timer;

  constructor(config?: Partial<TTLConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // 从环境变量读取配置
    this.loadFromEnv();

    logger.debug({
      config: this.config,
    }, '⏱️  Dynamic TTL manager initialized');
  }

  /**
   * 从环境变量加载配置
   */
  private loadFromEnv() {
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
   * 启动自动调整
   */
  start() {
    if (this.adjustmentTimer) {
      return;
    }

    this.adjustmentTimer = setInterval(() => {
      this.adjustAllTTLs();
    }, this.config.adjustmentInterval);

    logger.info({
      interval: this.config.adjustmentInterval,
    }, '⏱️  Dynamic TTL adjustment started');
  }

  /**
   * 停止自动调整
   */
  stop() {
    if (this.adjustmentTimer) {
      clearInterval(this.adjustmentTimer);
      this.adjustmentTimer = undefined;
    }
    logger.info('⏱️  Dynamic TTL adjustment stopped');
  }

  /**
   * 获取缓存类型的当前 TTL
   */
  getTTL(cacheType: CacheType): number {
    const stats = this.getOrCreateStats(cacheType);
    return stats.currentTTL;
  }

  /**
   * 记录缓存命中
   */
  recordHit(cacheType: CacheType) {
    const stats = this.getOrCreateStats(cacheType);
    stats.hits++;
    this.recordAccess(stats);
  }

  /**
   * 记录缓存未命中
   */
  recordMiss(cacheType: CacheType) {
    const stats = this.getOrCreateStats(cacheType);
    stats.misses++;
    this.recordAccess(stats);
  }

  /**
   * 记录访问
   */
  private recordAccess(stats: CacheStats) {
    stats.accesses.push(Date.now());

    // 保持窗口大小
    if (stats.accesses.length > this.config.hitRateWindow) {
      stats.accesses.shift();
    }
  }

  /**
   * 获取或创建统计信息
   */
  private getOrCreateStats(cacheType: CacheType): CacheStats {
    let stats = this.stats.get(cacheType);
    if (!stats) {
      stats = {
        hits: 0,
        misses: 0,
        accesses: [],
        lastAdjustment: Date.now(),
        currentTTL: this.config.defaultTTL,
      };
      this.stats.set(cacheType, stats);
    }
    return stats;
  }

  /**
   * 计算命中率
   */
  private calculateHitRate(stats: CacheStats): number {
    const total = stats.hits + stats.misses;
    if (total === 0) return 1.0; // 没有访问时假设命中率为 100%
    return stats.hits / total;
  }

  /**
   * 计算访问频率（每秒访问次数）
   */
  private calculateAccessFrequency(stats: CacheStats): number {
    if (stats.accesses.length < 2) return 0;

    const now = Date.now();
    const oldestAccess = stats.accesses[0];
    const duration = (now - oldestAccess) / 1000; // 转换为秒

    if (duration === 0) return 0;

    return stats.accesses.length / duration;
  }

  /**
   * 调整单个缓存类型的 TTL
   */
  adjustTTL(cacheType: CacheType): number {
    const stats = this.getOrCreateStats(cacheType);
    const now = Date.now();

    // 检查是否需要调整
    if (now - stats.lastAdjustment < this.config.adjustmentInterval) {
      return stats.currentTTL;
    }

    const hitRate = this.calculateHitRate(stats);
    const accessFrequency = this.calculateAccessFrequency(stats);
    const oldTTL = stats.currentTTL;

    let newTTL = oldTTL;

    // 策略 1: 根据命中率调整
    if (hitRate < this.config.targetHitRate) {
      // 命中率低，增加 TTL
      const increase = Math.ceil(oldTTL * 0.2); // 增加 20%
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
      // 命中率过高，可能造成数据过期，减少 TTL
      const decrease = Math.ceil(oldTTL * 0.1); // 减少 10%
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

    // 策略 2: 根据访问频率调整
    if (accessFrequency > 10) {
      // 高频访问，减少 TTL 以保持数据新鲜度
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
      // 低频访问，增加 TTL 以减少数据库查询
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

    // 更新统计信息
    stats.currentTTL = newTTL;
    stats.lastAdjustment = now;

    // 如果 TTL 有显著变化，记录日志
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
   * 调整所有缓存类型的 TTL
   */
  private adjustAllTTLs() {
    for (const cacheType of this.stats.keys()) {
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
   * 获取统计信息
   */
  getStats(): Record<CacheType, {
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

    for (const [cacheType, stats] of this.stats.entries()) {
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
   * 重置统计信息
   */
  resetStats(cacheType?: CacheType) {
    if (cacheType) {
      this.stats.delete(cacheType);
      logger.info({ cacheType }, `📊 Reset stats for ${cacheType}`);
    } else {
      this.stats.clear();
      logger.info('📊 Reset all cache stats');
    }
  }

  /**
   * 手动设置 TTL
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
   * 获取配置
   */
  getConfig(): TTLConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<TTLConfig>) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };

    // 重启调整定时器（如果间隔改变）
    if (config.adjustmentInterval && config.adjustmentInterval !== oldConfig.adjustmentInterval) {
      this.stop();
      this.start();
    }

    logger.info({
      oldConfig,
      newConfig: this.config,
    }, '⏱️  TTL config updated');
  }
}
