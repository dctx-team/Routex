/**
 * Load balancer with 4 strategies
 *  4
 */

import type { Channel, LoadBalanceStrategy, LoadBalancerContext } from '../types';
import { ServiceUnavailableError } from '../types';

export class LoadBalancer {
  private roundRobinIndex = 0;
  private sessionMap = new Map<string, string>(); // sessionId -> channelId
  private sessionExpiry = 5 * 60 * 60 * 1000; //// 5 hours / 5

  constructor(private strategy: LoadBalanceStrategy = 'priority') {}

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
    const channelId = this.sessionMap.get(sessionId);
    if (!channelId) return null;

    const channel = channels.find((ch) => ch.id === channelId);
    if (!channel || channel.status !== 'enabled') {
      this.sessionMap.delete(sessionId);
      return null;
    }

    return channel;
  }

  /**
   * Save session channel mapping
 *
   */
  private setSessionChannel(sessionId: string, channelId: string) {
    this.sessionMap.set(sessionId, channelId);

    //// Auto-expire after 5 hours / 5
    setTimeout(() => {
      this.sessionMap.delete(sessionId);
    }, this.sessionExpiry);
  }

  /**
   * Clear expired sessions (optional periodic cleanup)
 *
   */
  clearExpiredSessions() {
    // Sessions are auto-expired via setTimeout
    ////  setTimeout
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
