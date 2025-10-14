/**
 * Proxy engine for forwarding requests to AI providers
 * 用于将请求转发到 AI 提供商的代理引擎
 */

import type { Channel, ParsedRequest, ProxyResponse, RequestLog } from '../types';
import { Database } from '../db/database';
import { LoadBalancer } from './loadbalancer';

export class ProxyEngine {
  private circuitBreaker = new Map<string, { failures: number; lastFailure: number }>();
  private maxRetries = 3;
  private circuitBreakerThreshold = 5;
  private circuitBreakerTimeout = 60000; // 1 minute / 1 分钟

  constructor(
    private db: Database,
    private loadBalancer: LoadBalancer,
  ) {}

  /**
   * Handle incoming proxy request
   * 处理传入的代理请求
   */
  async handle(req: Request): Promise<Response> {
    const start = Date.now();

    try {
      // Parse request / 解析请求
      const parsed = await this.parseRequest(req);

      // Get available channels / 获取可用渠道
      const channels = this.db.getEnabledChannels();

      // Filter out channels in circuit breaker state / 过滤掉处于熔断状态的渠道
      const available = channels.filter((ch) => !this.isCircuitOpen(ch.id));

      if (available.length === 0) {
        return new Response('No available channels', { status: 503 });
      }

      // Select channel / 选择渠道
      const sessionId = req.headers.get('x-session-id') || undefined;
      const channel = await this.loadBalancer.select(available, {
        sessionId,
        model: parsed.model,
      });

      // Forward request with retries / 转发请求（带重试）
      const response = await this.forwardWithRetries(channel, parsed, available);

      // Log request / 记录请求
      const latency = Date.now() - start;
      this.logRequest(channel, parsed, response, latency, true);

      // Increment usage / 增加使用次数
      this.db.incrementChannelUsage(channel.id, true);

      // Reset circuit breaker on success / 成功时重置熔断器
      this.resetCircuitBreaker(channel.id);

      return this.createResponse(response);
    } catch (error) {
      const latency = Date.now() - start;
      console.error('Proxy error:', error);

      return new Response(
        JSON.stringify({
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            type: 'proxy_error',
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  }

  /**
   * Forward request with automatic retries
   * 转发请求（自动重试）
   */
  private async forwardWithRetries(
    channel: Channel,
    request: ParsedRequest,
    availableChannels: Channel[],
  ): Promise<ProxyResponse> {
    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts < this.maxRetries) {
      try {
        return await this.forward(channel, request);
      } catch (error) {
        lastError = error as Error;
        attempts++;

        // Record failure / 记录失败
        this.recordFailure(channel.id);

        // If circuit breaker is open, try another channel / 如果熔断器打开，尝试另一个渠道
        if (this.isCircuitOpen(channel.id) && availableChannels.length > 1) {
          const otherChannels = availableChannels.filter((ch) => ch.id !== channel.id);
          if (otherChannels.length > 0) {
            channel = await this.loadBalancer.select(otherChannels, {});
            console.log(`Retrying with different channel: ${channel.name}`);
          }
        }

        // Wait before retry / 重试前等待
        if (attempts < this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Forward request to channel
   * 将请求转发到渠道
   */
  private async forward(channel: Channel, request: ParsedRequest): Promise<ProxyResponse> {
    const start = Date.now();

    // Build URL / 构建 URL
    const baseUrl = channel.baseUrl || this.getDefaultBaseUrl(channel.type);
    const url = `${baseUrl}${request.path}`;

    // Prepare headers / 准备请求头
    const headers = this.prepareHeaders(channel, request);

    // Make request / 发起请求
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
    });

    const latency = Date.now() - start;

    // Parse response / 解析响应
    const responseBody = await response.json();

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
      channelId: channel.id,
      latency,
    };
  }

  /**
   * Parse incoming request
   * 解析传入的请求
   */
  private async parseRequest(req: Request): Promise<ParsedRequest> {
    const url = new URL(req.url);
    const headers: Record<string, string> = {};

    // Copy relevant headers / 复制相关请求头
    for (const [key, value] of req.headers.entries()) {
      if (!key.startsWith('x-') && key !== 'host') {
        headers[key] = value;
      }
    }

    // Parse body / 解析请求体
    let body: unknown = null;
    let model: string | undefined;

    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        body = await req.json();
        if (body && typeof body === 'object' && 'model' in body) {
          model = (body as any).model;
        }
      } catch {
        // Ignore parse errors / 忽略解析错误
      }
    }

    return {
      method: req.method,
      path: url.pathname,
      headers,
      body,
      model,
    };
  }

  /**
   * Prepare headers for forwarding
   * 准备转发的请求头
   */
  private prepareHeaders(channel: Channel, request: ParsedRequest): HeadersInit {
    const headers: Record<string, string> = {
      ...request.headers,
      'Content-Type': 'application/json',
    };

    // Add authentication / 添加认证
    if (channel.type === 'anthropic') {
      headers['x-api-key'] = channel.apiKey || '';
      headers['anthropic-version'] = '2023-06-01';
    } else if (channel.type === 'openai') {
      headers['Authorization'] = `Bearer ${channel.apiKey}`;
    } else if (channel.apiKey) {
      headers['Authorization'] = `Bearer ${channel.apiKey}`;
    }

    return headers;
  }

  /**
   * Get default base URL for channel type
   * 获取渠道类型的默认基础 URL
   */
  private getDefaultBaseUrl(type: string): string {
    switch (type) {
      case 'anthropic':
        return 'https://api.anthropic.com';
      case 'openai':
        return 'https://api.openai.com';
      case 'google':
        return 'https://generativelanguage.googleapis.com';
      default:
        return 'https://api.anthropic.com';
    }
  }

  /**
   * Create response from proxy response
   * 从代理响应创建响应
   */
  private createResponse(proxyResponse: ProxyResponse): Response {
    return new Response(JSON.stringify(proxyResponse.body), {
      status: proxyResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'X-Channel-Id': proxyResponse.channelId,
        'X-Latency-Ms': proxyResponse.latency.toString(),
      },
    });
  }

  /**
   * Log request to database
   * 将请求记录到数据库
   */
  private logRequest(
    channel: Channel,
    request: ParsedRequest,
    response: ProxyResponse,
    latency: number,
    success: boolean,
  ) {
    // Extract token usage from response / 从响应中提取 token 使用情况
    const body = response.body as any;
    const usage = body?.usage || {};

    const log: Omit<RequestLog, 'id'> = {
      channelId: channel.id,
      model: request.model || 'unknown',
      method: request.method,
      path: request.path,
      statusCode: response.status,
      latency,
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      cachedTokens: usage.cache_read_input_tokens || 0,
      success,
      error: success ? undefined : body?.error?.message,
      timestamp: Date.now(),
    };

    this.db.logRequest(log);
  }

  // ============================================================================
  // Circuit Breaker / 熔断器
  // ============================================================================

  /**
   * Record channel failure
   * 记录渠道失败
   */
  private recordFailure(channelId: string) {
    const state = this.circuitBreaker.get(channelId) || { failures: 0, lastFailure: 0 };
    state.failures++;
    state.lastFailure = Date.now();
    this.circuitBreaker.set(channelId, state);

    // Mark channel as rate limited if threshold exceeded
    // 如果超过阈值，将渠道标记为速率受限
    if (state.failures >= this.circuitBreakerThreshold) {
      this.db.updateChannel(channelId, { status: 'rate_limited' });
      console.log(`Circuit breaker opened for channel ${channelId}`);
    }
  }

  /**
   * Check if circuit breaker is open
   * 检查熔断器是否打开
   */
  private isCircuitOpen(channelId: string): boolean {
    const state = this.circuitBreaker.get(channelId);
    if (!state || state.failures < this.circuitBreakerThreshold) {
      return false;
    }

    // Auto-reset after timeout / 超时后自动重置
    if (Date.now() - state.lastFailure > this.circuitBreakerTimeout) {
      this.resetCircuitBreaker(channelId);
      return false;
    }

    return true;
  }

  /**
   * Reset circuit breaker
   * 重置熔断器
   */
  private resetCircuitBreaker(channelId: string) {
    this.circuitBreaker.delete(channelId);

    // Re-enable channel if it was rate limited / 如果渠道被限速，重新启用
    const channel = this.db.getChannel(channelId);
    if (channel && channel.status === 'rate_limited') {
      this.db.updateChannel(channelId, { status: 'enabled' });
      console.log(`Circuit breaker reset for channel ${channelId}`);
    }
  }
}
