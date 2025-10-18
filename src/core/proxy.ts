/**
 * Proxy engine for forwarding requests to AI providers
 */

import type { Channel, ParsedRequest, ProxyResponse, RequestLog } from '../types';
import { Database } from '../db/database';
import { LoadBalancer } from './loadbalancer';
import type { SmartRouter } from './routing/smart-router';
import type { TransformerManager } from '../transformers';
import { TeeStream } from './tee-stream';
import { metrics } from './metrics';
import { tracer } from './tracing';
import {
  NoAvailableChannelError,
  CircuitBreakerError,
  ChannelError,
  TransformerError,
  RoutexError
} from './errors';
import { logger, logError, logTransformer } from '../utils/logger';
import { getProvider } from '../providers';

export class ProxyEngine {
  private circuitBreaker = new Map<string, { failures: number; lastFailure: number }>;
  private maxRetries = 3;
  private circuitBreakerThreshold = 5;
  private circuitBreakerTimeout = 60000; //// 1 minute / 1
  private teeStream?: TeeStream;

  constructor(
    private db: Database,
    private loadBalancer: LoadBalancer,
    private smartRouter?: SmartRouter,
    private transformerManager?: TransformerManager,
  ) {
    // Initialize Tee Stream with enabled destinations
    const destinations = this.db.getEnabledTeeDestinations;
    if (destinations.length > 0) {
      this.teeStream = new TeeStream(destinations);
    }
  }

  /**
   * Handle incoming proxy request
   * 
   */
  async handle(req: Request): Promise<Response> {
    const start = Date.now;

    // Extract or create trace context
    const traceContext = tracer.extractTraceContext(req.headers);
    const rootSpan = tracer.startSpan(
      'proxy.handle',
      traceContext?.traceId,
      traceContext?.parentSpanId,
      {
        method: req.method,
        url: req.url,
      }
    );

    try {
      //// Parse request
      const parseSpan = tracer.startSpan('proxy.parseRequest', rootSpan.traceId, rootSpan.spanId);
      const parsed = await this.parseRequest(req);
      tracer.endSpan(parseSpan.spanId, 'success');

      //// Get available channels
      const channels = this.db.getEnabledChannels;

      //// Filter out channels in circuit breaker state
      const available = channels.filter((ch) => !this.isCircuitOpen(ch.id));

      if (available.length === 0) {
        tracer.addLog(rootSpan.spanId, 'No available channels', 'error');
        throw new NoAvailableChannelError;
      }

      //// Try SmartRouter first if available / SmartRouter
      let channel: Channel;
      let routedModel: string | undefined;
      let matchedRuleName: string | undefined;

      const routingSpan = tracer.startSpan('proxy.routing', rootSpan.traceId, rootSpan.spanId);

      if (this.smartRouter && parsed.body) {
        try {
          const routerContext = {
            model: parsed.model || '',
            messages: (parsed.body as any).messages || ,
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
            tracer.addTags(routingSpan.spanId, {
              router: 'SmartRouter',
              rule: matchedRuleName || 'unknown',
              channel: channel.name,
            });
            logger.debug({
              router: 'SmartRouter',
              rule: matchedRuleName,
              channel: channel.name,
              model: routedModel,
            }, `🧠 SmartRouter matched rule: ${matchedRuleName} → ${channel.name}`);
          } else {
            //// Fallback to LoadBalancer / LoadBalancer
            const sessionId = req.headers.get('x-session-id') || undefined;
            channel = await this.loadBalancer.select(available, {
              sessionId,
              model: parsed.model,
            });
            tracer.addTags(routingSpan.spanId, {
              router: 'LoadBalancer',
              channel: channel.name,
            });
            logger.debug({
              router: 'LoadBalancer',
              channel: channel.name,
              sessionId,
            }, `⚖️  LoadBalancer selected: ${channel.name}`);
          }
        } catch (error) {
          logError(error as Error, { component: 'SmartRouter', fallback: 'LoadBalancer' });
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
        tracer.addTags(routingSpan.spanId, {
          router: 'LoadBalancer',
          channel: channel.name,
        });
      }

      tracer.endSpan(routingSpan.spanId, 'success');

      //// Override model if routed model is specified
      if (routedModel && parsed.body) {
        (parsed.body as any).model = routedModel;
      }

      //// Forward request with retries
      const forwardSpan = tracer.startSpan('proxy.forward', rootSpan.traceId, rootSpan.spanId, {
        channel: channel.name,
        model: parsed.model || 'unknown',
      });
      const response = await this.forwardWithRetries(channel, parsed, available);
      tracer.endSpan(forwardSpan.spanId, 'success', {
        status: response.status.toString,
        latency: response.latency,
      });

      //// Log request
      const latency = Date.now - start;
      this.logRequest(channel, parsed, response, latency, true);

      //// Record metrics
      metrics.incrementCounter('routex_requests_total');
      metrics.incrementCounter('routex_requests_success_total');
      metrics.incrementCounter('routex_channel_requests_total', 1, {
        channel: channel.name,
        model: parsed.model || 'unknown'
      });
      metrics.observeHistogram('routex_request_duration_seconds', latency / 1000, {
        channel: channel.name,
        status: 'success'
      });

      //// Tee request/response if configured
      if (this.teeStream) {
        this.teeStream.tee(channel, parsed, response, true).catch(error => {
          logError(error as Error, { component: 'TeeStream', operation: 'tee' });
        });
      }

      //// Increment usage
      this.db.incrementChannelUsage(channel.id, true);

      //// Reset circuit breaker on success
      this.resetCircuitBreaker(channel);

      //// Add routing info to response headers
      const responseHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Channel-Id': channel.id,
        'X-Channel-Name': channel.name,
        'X-Latency-Ms': latency.toString,
        'X-Trace-Id': rootSpan.traceId,
        'X-Span-Id': rootSpan.spanId,
      };

      if (matchedRuleName) {
        responseHeaders['X-Routing-Rule'] = matchedRuleName;
      }

      logger.info({
        channel: channel.name,
        channelId: channel.id,
        model: parsed.model,
        latency,
        status: response.status,
        routingRule: matchedRuleName,
        traceId: rootSpan.traceId,
      }, `✅ Request succeeded: ${channel.name} (${latency}ms)`);

      tracer.endSpan(rootSpan.spanId, 'success', {
        status: response.status.toString,
        latency,
      });

      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (error) {
      const latency = Date.now - start;
      logError(error as Error, { component: 'ProxyEngine', latency, traceId: rootSpan.traceId });

      tracer.addLog(rootSpan.spanId, `Error: ${(error as Error).message}`, 'error');
      tracer.endSpan(rootSpan.spanId, 'error', { latency });

      //// Record failure metrics
      metrics.incrementCounter('routex_requests_total');
      metrics.incrementCounter('routex_requests_failed_total');
      metrics.observeHistogram('routex_request_duration_seconds', latency / 1000, {
        status: 'failed'
      });

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
   * Update Tee Stream destinations
   */
  updateTeeDestinations {
    const destinations = this.db.getEnabledTeeDestinations;
    if (destinations.length > 0) {
      if (this.teeStream) {
        this.teeStream.setDestinations(destinations);
      } else {
        this.teeStream = new TeeStream(destinations);
      }
    } else if (this.teeStream) {
      // No destinations, shutdown tee stream
      this.teeStream.shutdown.catch(error => {
        logError(error as Error, { component: 'TeeStream', operation: 'shutdown' });
      });
      this.teeStream = undefined;
    }
  }

  /**
   * Shutdown proxy engine and cleanup resources
   */
  async shutdown {
    if (this.teeStream) {
      await this.teeStream.shutdown;
    }
    logger.info('🛑 Proxy engine shutdown complete');
  }

  /**
   * Forward request with automatic retries
 *
   */
  private async forwardWithRetries(
    channel: Channel,
    request: ParsedRequest,
    availableChannels: Channel,
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
            logger.warn({
              attempt: attempts,
              previousChannel: channel.id,
              newChannel: channel.name,
            }, `⚠️  Retrying with different channel: ${channel.name}`);
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
   * Forward request to channel using Provider abstraction
 *
   */
  private async forward(channel: Channel, request: ParsedRequest): Promise<ProxyResponse> {
    const start = Date.now;

    // Get provider for this channel
    const provider = getProvider(channel);

    // Apply transformers if configured / transformers
    let transformedRequest = request.body;
    let transformerHeaders: Record<string, string> = {};

    if (this.transformerManager && channel.transformers && transformedRequest) {
      try {
        const transformerSpecs = channel.transformers.use || ;
        if (transformerSpecs.length > 0) {
          logTransformer('pipeline', 'request', {
            count: transformerSpecs.length,
            channel: channel.name,
          });

          const baseUrl = provider.buildRequestUrl(channel, '');
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
            logger.debug({
              headers: Object.keys(transformResult.headers),
            }, '🔧 Transformer provided headers');
          }
        }
      } catch (error) {
        logError(error as Error, { component: 'RequestTransformer', channel: channel.name });
        //// Continue with original request if transformation fails
      }
    }

    // Update request body with transformed data
    const modifiedRequest: ParsedRequest = {
      ...request,
      body: transformedRequest,
    };

    // Prepare provider request (URL, headers, body)
    const providerRequest = await provider.prepareRequest(
      channel,
      modifiedRequest,
      transformerHeaders
    );

    logger.debug({
      provider: provider.name,
      url: providerRequest.url,
      method: providerRequest.method,
    }, `📡 Forwarding to ${provider.name}`);

    //// Make request
    const response = await fetch(providerRequest.url, {
      method: providerRequest.method,
      headers: providerRequest.headers,
      body: providerRequest.body ? JSON.stringify(providerRequest.body) : undefined,
    });

    const latency = Date.now - start;

    //// Handle provider response
    const providerResponse = await provider.handleResponse(response, channel);
    let responseBody = providerResponse.body;

    //// Apply reverse transformers if configured / transformers
    if (this.transformerManager && channel.transformers && responseBody) {
      try {
        const transformerSpecs = channel.transformers.use || ;
        if (transformerSpecs.length > 0) {
          logTransformer('pipeline', 'response', {
            count: transformerSpecs.length,
            channel: channel.name,
          });
          //// Reverse the transformer order for response / transformer
          const reversedSpecs = [...transformerSpecs].reverse;
          responseBody = await this.transformerManager.transformResponse(
            responseBody,
            reversedSpecs
          );
        }
      } catch (error) {
        logError(error as Error, { component: 'ResponseTransformer', channel: channel.name });
        //// Continue with original response if transformation fails
      }
    }

    return {
      status: providerResponse.status,
      headers: providerResponse.headers,
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
    for (const [key, value] of req.headers.entries) {
      if (!key.startsWith('x-') && key !== 'host') {
        headers[key] = value;
      }
    }

    //// Parse body
    let body: unknown = null;
    let model: string | undefined;

    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        body = await req.json;
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
    //// Extract token usage from response using Provider /  token  Provider
    const provider = getProvider(channel);
    const tokenUsage = provider.extractTokenUsage(response.body);
    const body = response.body as any;

    //// Record token metrics
    if (tokenUsage.inputTokens > 0) {
      metrics.incrementCounter('routex_tokens_input_total', tokenUsage.inputTokens);
    }
    if (tokenUsage.outputTokens > 0) {
      metrics.incrementCounter('routex_tokens_output_total', tokenUsage.outputTokens);
    }
    if (tokenUsage.cachedTokens > 0) {
      metrics.incrementCounter('routex_tokens_cached_total', tokenUsage.cachedTokens);
    }

    const log: Omit<RequestLog, 'id'> = {
      channelId: channel.id,
      model: request.model || 'unknown',
      method: request.method,
      path: request.path,
      statusCode: response.status,
      latency,
      inputTokens: tokenUsage.inputTokens,
      outputTokens: tokenUsage.outputTokens,
      cachedTokens: tokenUsage.cachedTokens,
      success,
      error: success ? undefined : body?.error?.message,
      timestamp: Date.now,
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
    state.lastFailure = Date.now;
    this.circuitBreaker.set(channelId, state);

    // Mark channel as rate limited if threshold exceeded
    ////
    if (state.failures >= this.circuitBreakerThreshold) {
      this.db.updateChannel(channelId, { status: 'rate_limited' });

      //// Record circuit breaker metrics
      metrics.incrementCounter('routex_circuit_breaker_open_total', 1, { channel: channelId });
      metrics.setGauge('routex_circuit_breaker_open', 1, { channel: channelId });

      logger.warn({
        channelId,
        failures: state.failures,
        threshold: this.circuitBreakerThreshold,
      }, `🔴 Circuit breaker opened for channel ${channelId}`);
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
    if (Date.now - state.lastFailure > this.circuitBreakerTimeout) {
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

      //// Reset circuit breaker metrics
      metrics.setGauge('routex_circuit_breaker_open', 0, { channel: channel.id });

      logger.info({
        channelId: channel.id,
        channelName: channel.name,
      }, `🟢 Circuit breaker reset for channel ${channel.id}`);
    }
  }
}
