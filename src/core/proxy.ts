/**
 * Proxy engine for forwarding requests to AI providers
 */

import type { Channel, ParsedRequest, ProxyResponse, RequestLog } from '../types';
import { Database } from '../db/database';
import { LoadBalancer } from './loadbalancer';
import type { SmartRouter } from './routing/smart-router';
import type { TransformerManager } from '../transformers';
import {
  NoAvailableChannelError,
  CircuitBreakerError,
  ChannelError,
  TransformerError,
  RoutexError
} from './errors';

export class ProxyEngine {
  private circuitBreaker = new Map<string, { failures: number; lastFailure: number }>();
  private maxRetries = 3;
  private circuitBreakerThreshold = 5;
  private circuitBreakerTimeout = 60000; //// 1 minute / 1

  constructor(
    private db: Database,
    private loadBalancer: LoadBalancer,
    private smartRouter?: SmartRouter,
    private transformerManager?: TransformerManager,
  ) {}

  /**
   * Handle incoming proxy request
 *
   */
  async handle(req: Request): Promise<Response> {
    const start = Date.now();

    try {
      //// Parse request
      const parsed = await this.parseRequest(req);

      //// Get available channels
      const channels = this.db.getEnabledChannels();

      //// Filter out channels in circuit breaker state
      const available = channels.filter((ch) => !this.isCircuitOpen(ch.id));

      if (available.length === 0) {
        throw new NoAvailableChannelError();
      }

      //// Try SmartRouter first if available / SmartRouter
      let channel: Channel;
      let routedModel: string | undefined;
      let matchedRuleName: string | undefined;

      if (this.smartRouter && parsed.body) {
        try {
          const routerContext = {
            model: parsed.model || '',
            messages: (parsed.body as any).messages || [],
            system: (parsed.body as any).system,
            tools: (parsed.body as any).tools,
            metadata: {
              sessionId: req.headers.get('x-session-id') || undefined,
            },
          };

          const routeResult = await this.smartRouter.findMatchingChannel(routerContext, available);

          if (routeResult) {
            channel = routeResult.channel;
            routedModel = routeResult.model;
            matchedRuleName = routeResult.rule?.name;
            console.log(`🧠 SmartRouter matched rule: ${matchedRuleName} → ${channel.name}`);
          } else {
            //// Fallback to LoadBalancer / LoadBalancer
            const sessionId = req.headers.get('x-session-id') || undefined;
            channel = await this.loadBalancer.select(available, {
              sessionId,
              model: parsed.model,
            });
            console.log(`⚖️  LoadBalancer selected: ${channel.name}`);
          }
        } catch (error) {
          console.error('SmartRouter error, falling back to LoadBalancer:', error);
          const sessionId = req.headers.get('x-session-id') || undefined;
          channel = await this.loadBalancer.select(available, {
            sessionId,
            model: parsed.model,
          });
        }
      } else {
        //// No SmartRouter, use LoadBalancer / SmartRouterLoadBalancer
        const sessionId = req.headers.get('x-session-id') || undefined;
        channel = await this.loadBalancer.select(available, {
          sessionId,
          model: parsed.model,
        });
      }

      //// Override model if routed model is specified
      if (routedModel && parsed.body) {
        (parsed.body as any).model = routedModel;
      }

      //// Forward request with retries
      const response = await this.forwardWithRetries(channel, parsed, available);

      //// Log request
      const latency = Date.now() - start;
      this.logRequest(channel, parsed, response, latency, true);

      //// Increment usage
      this.db.incrementChannelUsage(channel.id, true);

      //// Reset circuit breaker on success
      this.resetCircuitBreaker(channel);

      //// Add routing info to response headers
      const responseHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Channel-Id': channel.id,
        'X-Channel-Name': channel.name,
        'X-Latency-Ms': latency.toString(),
      };

      if (matchedRuleName) {
        responseHeaders['X-Routing-Rule'] = matchedRuleName;
      }

      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (error) {
      const latency = Date.now() - start;
      console.error('Proxy error:', error);

      // If it's already a RoutexError, rethrow it
      if (error instanceof RoutexError) {
        throw error;
      }

      // Wrap unknown errors
      throw new ChannelError(
        error instanceof Error ? error.message : 'Unknown proxy error',
        { latency }
      );
    }
  }

  /**
   * Forward request with automatic retries
 *
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

        //// Record failure
        this.recordFailure(channel.id);

        //// If circuit breaker is open, try another channel
        if (this.isCircuitOpen(channel.id) && availableChannels.length > 1) {
          const otherChannels = availableChannels.filter((ch) => ch.id !== channel.id);
          if (otherChannels.length > 0) {
            channel = await this.loadBalancer.select(otherChannels, {});
            console.log(`Retrying with different channel: ${channel.name}`);
          }
        }

        //// Wait before retry
        if (attempts < this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Forward request to channel
 *
   */
  private async forward(channel: Channel, request: ParsedRequest): Promise<ProxyResponse> {
    const start = Date.now();

    //// Build URL /  URL
    const baseUrl = channel.baseUrl || this.getDefaultBaseUrl(channel.type);
    const url = `${baseUrl}${request.path}`;

    //// Apply transformers if configured / transformers
    let transformedRequest = request.body;
    let transformerHeaders: Record<string, string> = {};

    if (this.transformerManager && channel.transformers && transformedRequest) {
      try {
        const transformerSpecs = channel.transformers.use || [];
        if (transformerSpecs.length > 0) {
          console.log(`🔄 Applying ${transformerSpecs.length} request transformer(s) for channel ${channel.name}`);

          // Pass baseUrl to transformers as options
          const transformResult = await this.transformerManager.transformRequest(
            transformedRequest,
            transformerSpecs.map(spec =>
              Array.isArray(spec)
                ? [spec[0], { ...spec[1], baseUrl }]
                : [spec, { baseUrl }]
            )
          );

          transformedRequest = transformResult.body;
          if (transformResult.headers) {
            transformerHeaders = transformResult.headers;
            console.log(`🔧 Transformer provided headers:`, Object.keys(transformResult.headers));
          }
        }
      } catch (error) {
        console.error('Request transformer error:', error);
        //// Continue with original request if transformation fails
      }
    }

    //// Prepare headers (merge with transformer headers)
    const headers = this.prepareHeaders(channel, request, transformerHeaders);

    //// Make request
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: transformedRequest ? JSON.stringify(transformedRequest) : undefined,
    });

    const latency = Date.now() - start;

    //// Parse response
    let responseBody = await response.json();

    //// Apply reverse transformers if configured / transformers
    if (this.transformerManager && channel.transformers && responseBody) {
      try {
        const transformerSpecs = channel.transformers.use || [];
        if (transformerSpecs.length > 0) {
          console.log(`🔄 Applying ${transformerSpecs.length} response transformer(s) for channel ${channel.name}`);
          //// Reverse the transformer order for response / transformer
          const reversedSpecs = [...transformerSpecs].reverse();
          responseBody = await this.transformerManager.transformResponse(
            responseBody,
            reversedSpecs
          );
        }
      } catch (error) {
        console.error('Response transformer error:', error);
        //// Continue with original response if transformation fails
      }
    }

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
 *
   */
  private async parseRequest(req: Request): Promise<ParsedRequest> {
    const url = new URL(req.url);
    const headers: Record<string, string> = {};

    //// Copy relevant headers
    for (const [key, value] of req.headers.entries()) {
      if (!key.startsWith('x-') && key !== 'host') {
        headers[key] = value;
      }
    }

    //// Parse body
    let body: unknown = null;
    let model: string | undefined;

    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        body = await req.json();
        if (body && typeof body === 'object' && 'model' in body) {
          model = (body as any).model;
        }
      } catch {
        //// Ignore parse errors
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
 *
   * @param transformerHeaders - Headers provided by transformers (highest priority)
   */
  private prepareHeaders(
    channel: Channel,
    request: ParsedRequest,
    transformerHeaders: Record<string, string> = {}
  ): HeadersInit {
    const headers: Record<string, string> = {
      ...request.headers,
      'Content-Type': 'application/json',
    };

    //// Add authentication
    if (channel.type === 'anthropic') {
      headers['x-api-key'] = channel.apiKey || '';
      headers['anthropic-version'] = '2023-06-01';
    } else if (channel.type === 'openai') {
      headers['Authorization'] = `Bearer ${channel.apiKey}`;
    } else if (channel.apiKey) {
      headers['Authorization'] = `Bearer ${channel.apiKey}`;
    }

    //// Merge transformer headers (they override existing headers)
    Object.assign(headers, transformerHeaders);

    return headers;
  }

  /**
   * Get default base URL for channel type
 *  URL
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
 *
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
 *
   */
  private logRequest(
    channel: Channel,
    request: ParsedRequest,
    response: ProxyResponse,
    latency: number,
    success: boolean,
  ) {
    //// Extract token usage from response /  token
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
  //// Circuit Breaker
  // ============================================================================

  /**
   * Record channel failure
 *
   */
  private recordFailure(channelId: string) {
    const state = this.circuitBreaker.get(channelId) || { failures: 0, lastFailure: 0 };
    state.failures++;
    state.lastFailure = Date.now();
    this.circuitBreaker.set(channelId, state);

    // Mark channel as rate limited if threshold exceeded
    ////
    if (state.failures >= this.circuitBreakerThreshold) {
      this.db.updateChannel(channelId, { status: 'rate_limited' });
      console.log(`Circuit breaker opened for channel ${channelId}`);
    }
  }

  /**
   * Check if circuit breaker is open
 *
   */
  private isCircuitOpen(channelId: string): boolean {
    const state = this.circuitBreaker.get(channelId);
    if (!state || state.failures < this.circuitBreakerThreshold) {
      return false;
    }

    //// Auto-reset after timeout
    if (Date.now() - state.lastFailure > this.circuitBreakerTimeout) {
      this.resetCircuitBreaker(channelId);
      return false;
    }

    return true;
  }

  /**
   * Reset circuit breaker
 *
   */
  private resetCircuitBreaker(channel: Channel) {
    this.circuitBreaker.delete(channel.id);

    //// Re-enable channel if it was rate limited
    if (channel.status === 'rate_limited') {
      this.db.updateChannel(channel.id, { status: 'enabled' });
      console.log(`Circuit breaker reset for channel ${channel.id}`);
    }
  }
}
