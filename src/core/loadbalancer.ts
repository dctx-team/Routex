/**
 * Load balancer with 4 strategies
 * 具有 4 种策略的负载均衡器
 */

import type { Channel, LoadBalanceStrategy, LoadBalancerContext } from '../types';
import { ServiceUnavailableError } from '../types';

export class LoadBalancer {
  private roundRobinIndex = 0;
  private sessionMap = new Map<string, string>(); // sessionId -> channelId
  private sessionExpiry = 5 * 60 * 60 * 1000; // 5 hours / 5 小时

  constructor(private strategy: LoadBalanceStrategy = 'priority') {}

  /**
   * Select a channel based on the configured strategy
   * 根据配置的策略选择渠道
   */
  async select(channels: Channel[], context: LoadBalancerContext = {}): Promise<Channel> {
    // Filter enabled channels / 过滤已启用的渠道
    const available = channels.filter((ch) => ch.status === 'enabled');

    if (available.length === 0) {
      throw new ServiceUnavailableError('No available channels');
    }

    // Check session affinity / 检查会话亲和性
    if (context.sessionId) {
      const sessionChannel = this.getSessionChannel(available, context.sessionId);
      if (sessionChannel) {
        return sessionChannel;
      }
    }

    // Select based on strategy / 根据策略选择
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

    // Save session affinity / 保存会话亲和性
    if (context.sessionId) {
      this.setSessionChannel(context.sessionId, selected.id);
    }

    return selected;
  }

  /**
   * Priority strategy: select channel with highest priority
   * 优先级策略：选择优先级最高的渠道
   */
  private selectByPriority(channels: Channel[]): Channel {
    return channels.reduce((highest, current) =>
      current.priority > highest.priority ? current : highest,
    );
  }

  /**
   * Round robin strategy: rotate through channels
   * 轮询策略：轮流使用渠道
   */
  private selectByRoundRobin(channels: Channel[]): Channel {
    const selected = channels[this.roundRobinIndex % channels.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % channels.length;
    return selected;
  }

  /**
   * Weighted strategy: select based on weight
   * 加权策略：根据权重选择
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
   * 最少使用策略：选择请求最少的渠道
   */
  private selectByLeastUsed(channels: Channel[]): Channel {
    return channels.reduce((least, current) =>
      current.requestCount < least.requestCount ? current : least,
    );
  }

  /**
   * Get session channel if it exists and is still valid
   * 获取会话渠道（如果存在且仍然有效）
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
   * 保存会话渠道映射
   */
  private setSessionChannel(sessionId: string, channelId: string) {
    this.sessionMap.set(sessionId, channelId);

    // Auto-expire after 5 hours / 5 小时后自动过期
    setTimeout(() => {
      this.sessionMap.delete(sessionId);
    }, this.sessionExpiry);
  }

  /**
   * Clear expired sessions (optional periodic cleanup)
   * 清除过期会话（可选的定期清理）
   */
  clearExpiredSessions() {
    // Sessions are auto-expired via setTimeout
    // 会话通过 setTimeout 自动过期
  }

  /**
   * Change load balancing strategy
   * 更改负载均衡策略
   */
  setStrategy(strategy: LoadBalanceStrategy) {
    this.strategy = strategy;
  }

  /**
   * Get current strategy
   * 获取当前策略
   */
  getStrategy(): LoadBalanceStrategy {
    return this.strategy;
  }
}
