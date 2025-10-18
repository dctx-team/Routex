/**
 * Load balancer with 4 strategies
 *  4
 */

import type { Channel, LoadBalanceStrategy, LoadBalancerContext } from '../types';
import { ServiceUnavailableError } from '../types';
import { LRUCache } from '../utils/lru-cache';
import { logger, logLoadBalancer } from '../utils/logger';

interface SessionCacheEntry {
  channelId: string;
  timestamp: number;
}

export class LoadBalancer {
  private roundRobinIndex = 0;
  private sessionCache: LRUCache<string, SessionCacheEntry>;
  private sessionExpiry = 5 * 60 * 60 * 1000; //// 5 hours / 5
  private cleanupInterval: Timer | null = null;

  constructor(private strategy: LoadBalanceStrategy = 'priority') {
    // Initialize LRU cache with TTL support
    this.sessionCache = new LRUCache({
      maxSize: 10000,
      ttl: this.sessionExpiry,
      onEvict: (sessionId, entry) => {
        logger.debug({
          sessionId,
          channelId: entry.channelId,
        }, `🗑️  Evicted session ${sessionId}`);
      }
    });

    // Start periodic cleanup of expired sessions
    this.startCleanup();
  }

  /**
   * Select a channel based on the configured strategy
 *
   */
  async select(channels: Channel[], context: LoadBalancerContext = {}): Promise<Channel> {
    //// Filter enabled channels
    const available = channels.filter((ch) => ch.status === 'enabled');

    if (available.length === 0) {
      throw new ServiceUnavailableError('No available channels');
    }

    //// Check session affinity
    if (context.sessionId) {
      const sessionChannel = this.getSessionChannel(available, context.sessionId);
      if (sessionChannel) {
        logLoadBalancer(this.strategy, sessionChannel.name, {
          reason: 'session_affinity',
          sessionId: context.sessionId,
        });
        return sessionChannel;
      }
    }

    //// Select based on strategy
    let selected: Channel;

    switch (this.strategy) {
      case 'priority':
        selected = this.selectByPriority(available);
        break;
      case 'round_robin':
        selected = this.selectByRoundRobin(available);
        break;
      case 'weighted':
        selected = this.selectByWeight(available);
        break;
      case 'least_used':
        selected = this.selectByLeastUsed(available);
        break;
      default:
        selected = this.selectByPriority(available);
    }

    //// Save session affinity
    if (context.sessionId) {
      this.setSessionChannel(context.sessionId, selected.id);
    }

    logLoadBalancer(this.strategy, selected.name, {
      availableChannels: available.length,
      model: context.model,
    });

    return selected;
  }

  /**
   * Priority strategy: select channel with highest priority (lowest number)
   * 优先级策略：选择优先级最高的渠道（数值越小优先级越高）
   */
  private selectByPriority(channels: Channel[]): Channel {
    return channels.reduce((highest, current) =>
      current.priority < highest.priority ? current : highest,
    );
  }

  /**
   * Round robin strategy: rotate through channels
 *
   */
  private selectByRoundRobin(channels: Channel[]): Channel {
    const selected = channels[this.roundRobinIndex % channels.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % channels.length;
    return selected;
  }

  /**
   * Weighted strategy: select based on weight using binary search
   * 加权策略: 使用二分查找优化，O(log n) 复杂度
   *
   * Algorithm:
   * 1. Build cumulative weight array [w1, w1+w2, w1+w2+w3, ...]
   * 2. Generate random number in [0, totalWeight)
   * 3. Binary search for the first cumulative weight >= random
   */
  private selectByWeight(channels: Channel[]): Channel {
    if (channels.length === 1) {
      return channels[0];
    }

    // Build cumulative weight array
    const cumulativeWeights: number[] = [];
    let sum = 0;

    for (const channel of channels) {
      sum += channel.weight;
      cumulativeWeights.push(sum);
    }

    const totalWeight = sum;

    // Handle edge case: all weights are 0
    if (totalWeight === 0) {
      return channels[Math.floor(Math.random() * channels.length)];
    }

    // Generate random value
    const random = Math.random() * totalWeight;

    // Binary search for the target channel
    let left = 0;
    let right = cumulativeWeights.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);

      if (cumulativeWeights[mid] < random) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return channels[left];
  }

  /**
   * Least used strategy: select channel with fewest requests
 *
   */
  private selectByLeastUsed(channels: Channel[]): Channel {
    return channels.reduce((least, current) =>
      current.requestCount < least.requestCount ? current : least,
    );
  }

  /**
   * Get session channel if it exists and is still valid
 *
   */
  private getSessionChannel(channels: Channel[], sessionId: string): Channel | null {
    // LRU cache automatically handles TTL expiration
    const entry = this.sessionCache.get(sessionId);
    if (!entry) return null;

    const channel = channels.find((ch) => ch.id === entry.channelId);
    if (!channel || channel.status !== 'enabled') {
      this.sessionCache.delete(sessionId);
      return null;
    }

    return channel;
  }

  /**
   * Save session channel mapping
 *
   */
  private setSessionChannel(sessionId: string, channelId: string) {
    // LRU cache automatically handles eviction when full
    this.sessionCache.set(sessionId, {
      channelId,
      timestamp: Date.now(),
    });
  }

  /**
   * Start periodic cleanup of expired sessions
   */
  private startCleanup() {
    // Run cleanup every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.clearExpiredSessions();
    }, 10 * 60 * 1000);
  }

  /**
   * Clear expired sessions (periodic cleanup)
 *
   */
  clearExpiredSessions() {
    // LRU cache's prune() method removes all expired entries
    const removedCount = this.sessionCache.prune();

    if (removedCount > 0) {
      logger.info({
        removedCount,
        cacheStats: this.getCacheStats(),
      }, `🧹 Cleared ${removedCount} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.sessionCache.stats();
  }

  /**
   * Clear all session cache (for cache warming)
   */
  clearCache() {
    this.sessionCache.clear();
    logger.debug('🗑️  Session cache cleared');
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.sessionCache.clear();
  }

  /**
   * Change load balancing strategy
 *
   */
  setStrategy(strategy: LoadBalanceStrategy) {
    this.strategy = strategy;
  }

  /**
   * Get current strategy
 *
   */
  getStrategy(): LoadBalanceStrategy {
    return this.strategy;
  }
}
