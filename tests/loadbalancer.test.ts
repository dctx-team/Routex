/**
 * Load Balancer Tests
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { LoadBalancer } from '../src/core/loadbalancer';
import type { Channel } from '../src/types';

describe('LoadBalancer', () => {
  let channels: Channel[];

  beforeEach(() => {
    channels = [
      {
        id: '1',
        name: 'channel-1',
        type: 'anthropic',
        models: ['claude-3-opus'],
        priority: 1,
        weight: 10,
        status: 'enabled',
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        consecutiveFailures: 0,
        lastFailureTime: null,
        circuitBreakerUntil: null,
        rateLimitedUntil: null,
        lastUsedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '2',
        name: 'channel-2',
        type: 'openai',
        models: ['gpt-4'],
        priority: 2,
        weight: 5,
        status: 'enabled',
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        consecutiveFailures: 0,
        lastFailureTime: null,
        circuitBreakerUntil: null,
        rateLimitedUntil: null,
        lastUsedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '3',
        name: 'channel-3',
        type: 'anthropic',
        models: ['claude-3-sonnet'],
        priority: 3,
        weight: 3,
        status: 'enabled',
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        consecutiveFailures: 0,
        lastFailureTime: null,
        circuitBreakerUntil: null,
        rateLimitedUntil: null,
        lastUsedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
  });

  describe('Priority Strategy', () => {
    test('should select highest priority channel', async () => {
      const lb = new LoadBalancer('priority');
      const selected = await lb.select(channels);
      expect(selected?.priority).toBe(1);
      expect(selected?.name).toBe('channel-1');
    });

    test('should skip disabled channels', async () => {
      channels[0].status = 'disabled';
      const lb = new LoadBalancer('priority');
      const selected = await lb.select(channels);
      expect(selected?.priority).toBe(2);
      expect(selected?.name).toBe('channel-2');
    });

    test('should skip circuit breaker channels', async () => {
      channels[0].status = 'circuit_breaker';
      channels[0].circuitBreakerUntil = Date.now() + 60000;
      const lb = new LoadBalancer('priority');
      const selected = await lb.select(channels);
      expect(selected?.name).toBe('channel-2');
    });
  });

  describe('Round Robin Strategy', () => {
    test('should rotate through channels', async () => {
      const lb = new LoadBalancer('round_robin');

      const first = await lb.select(channels);
      const second = await lb.select(channels);
      const third = await lb.select(channels);
      const fourth = await lb.select(channels);

      expect(first?.name).toBe('channel-1');
      expect(second?.name).toBe('channel-2');
      expect(third?.name).toBe('channel-3');
      expect(fourth?.name).toBe('channel-1'); // Wraps around
    });

    test('should skip unavailable channels', async () => {
      channels[1].status = 'disabled';
      const lb = new LoadBalancer('round_robin');

      const first = await lb.select(channels);
      const second = await lb.select(channels);

      expect(first?.name).toBe('channel-1');
      expect(second?.name).toBe('channel-3');
    });
  });

  describe('Weighted Strategy', () => {
    test('should respect weight distribution', async () => {
      const lb = new LoadBalancer('weighted');
      const selections = new Map<string, number>();

      // Run many selections to test distribution
      for (let i = 0; i < 1000; i++) {
        const selected = await lb.select(channels);
        if (selected) {
          selections.set(selected.name, (selections.get(selected.name) || 0) + 1);
        }
      }

      // Channel 1 (weight 10) should be selected more than Channel 3 (weight 3)
      const c1Count = selections.get('channel-1') || 0;
      const c3Count = selections.get('channel-3') || 0;
      expect(c1Count).toBeGreaterThan(c3Count);
    });

    test('should handle zero weight', async () => {
      channels[0].weight = 0;
      const lb = new LoadBalancer('weighted');
      const selected = await lb.select(channels);

      // Should still work with other channels
      expect(selected).toBeTruthy();
      expect(selected?.name).not.toBe('channel-1');
    });
  });

  describe('Least Used Strategy', () => {
    test('should select channel with lowest request count', async () => {
      channels[0].requestCount = 100;
      channels[1].requestCount = 50;
      channels[2].requestCount = 75;

      const lb = new LoadBalancer('least_used');
      const selected = await lb.select(channels);

      expect(selected?.name).toBe('channel-2');
      expect(selected?.requestCount).toBe(50);
    });

    test('should prefer unused channels', async () => {
      channels[0].requestCount = 10;
      channels[1].requestCount = 0;
      channels[2].requestCount = 5;

      const lb = new LoadBalancer('least_used');
      const selected = await lb.select(channels);

      expect(selected?.name).toBe('channel-2');
      expect(selected?.requestCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should throw error for empty channel list', async () => {
      const lb = new LoadBalancer('priority');
      await expect(lb.select([])).rejects.toThrow('No available channels');
    });

    test('should throw error when all channels disabled', async () => {
      channels.forEach(ch => ch.status = 'disabled');
      const lb = new LoadBalancer('priority');
      await expect(lb.select(channels)).rejects.toThrow('No available channels');
    });

    test('should handle strategy change', async () => {
      const lb = new LoadBalancer('priority');
      lb.setStrategy('round_robin');

      const first = await lb.select(channels);
      const second = await lb.select(channels);

      expect(first?.name).not.toBe(second?.name);
    });
  });

  describe('Circuit Breaker', () => {
    test('should skip channels in circuit breaker state', async () => {
      const now = Date.now();
      channels[0].status = 'circuit_breaker';
      channels[0].circuitBreakerUntil = now + 30000; // 30s from now

      const lb = new LoadBalancer('priority');
      const selected = await lb.select(channels);

      expect(selected?.name).toBe('channel-2');
    });

    test('should allow expired circuit breaker', async () => {
      const now = Date.now();
      channels[0].status = 'enabled'; // Change to enabled since expired circuit breaker should be allowed
      channels[0].circuitBreakerUntil = now - 1000; // Expired

      const lb = new LoadBalancer('priority');
      const selected = await lb.select(channels);

      // Should select channel-1 since it's highest priority and enabled
      expect(selected?.name).toBe('channel-1');
    });
  });
});
