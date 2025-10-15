/**
 * Load balancer with 4 strategies
 *  4
 */

import type { Channel, LoadBalanceStrategy, LoadBalancerContext } from '../types';
import { ServiceUnavailableError } from '../types';

interface SessionCacheEntry {
  channelId: string;
  timestamp: number;
}

export class LoadBalancer {
  private roundRobinIndex = 0;
  private sessionCache = new Map<string, SessionCacheEntry>(); // sessionId -> {channelId, timestamp}
  private sessionExpiry = 5 * 60 * 60 * 1000; //// 5 hours / 5
  private maxCacheSize = 10000; // Maximum number of sessions to cache
  private cleanupInterval: Timer | null = null;

  constructor(private strategy: LoadBalanceStrategy = 'priority') {
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

    return selected;
  }

  /**
   * Priority strategy: select channel with highest priority
 *
   */
  private selectByPriority(channels: Channel[]): Channel {
    return channels.reduce((highest, current) =>
      current.priority > highest.priority ? current : highest,
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
   * Weighted strategy: select based on weight
 *
   */
  private selectByWeight(channels: Channel[]): Channel {
    const totalWeight = channels.reduce((sum, ch) => sum + ch.weight, 0);
    let random = Math.random() * totalWeight;

    for (const channel of channels) {
      random -= channel.weight;
      if (random <= 0) {
        return channel;
      }
    }

    return channels[channels.length - 1];
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
    const entry = this.sessionCache.get(sessionId);
    if (!entry) return null;

    // Check if session has expired
    if (Date.now() - entry.timestamp > this.sessionExpiry) {
      this.sessionCache.delete(sessionId);
      return null;
    }

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
    // Check cache size and remove oldest entries if needed
    if (this.sessionCache.size >= this.maxCacheSize) {
      this.evictOldestSessions();
    }

    this.sessionCache.set(sessionId, {
      channelId,
      timestamp: Date.now(),
    });
  }

  /**
   * Evict oldest sessions when cache is full
   */
  private evictOldestSessions() {
    const entriesToRemove = Math.floor(this.maxCacheSize * 0.1); // Remove 10% of entries
    const entries = Array.from(this.sessionCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, entriesToRemove);

    for (const [sessionId] of entries) {
      this.sessionCache.delete(sessionId);
    }
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
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, entry] of this.sessionCache.entries()) {
      if (now - entry.timestamp > this.sessionExpiry) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.sessionCache.delete(sessionId);
    }

    if (expiredSessions.length > 0) {
      console.log(`🧹 Cleared ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.sessionCache.size,
      maxSize: this.maxCacheSize,
      utilizationPercent: (this.sessionCache.size / this.maxCacheSize) * 100,
    };
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
