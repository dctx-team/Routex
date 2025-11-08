/**
 *  AI 
 */

import type { Channel, ParsedRequest, ProxyResponse, RequestLog } from '../types';
import type { AIRequestBody, AIResponseBody } from '../types/api-body';
import { isAIRequestBody, isAIResponseBody } from '../types/api-body';
import { Database } from '../db/database';
import { LoadBalancer } from './loadbalancer';
import type { SmartRouter } from './routing/smart-router';
import type { TransformerManager } from '../transformers';
import { TeeStream } from './tee-stream';
import { metrics } from './metrics';
import { tracer } from './tracing';
import {
  NoAvailableChannelError,
  ChannelError,
  RoutexError
} from './errors';
import { logger, logError, logTransformer } from '../utils/logger';
import { getProvider } from '../providers';
import { RetryStrategy, HTTPError } from './retry-strategy';

export class ProxyEngine {
  private circuitBreaker = new Map<string, { failures: number; lastFailure: number }>;
  private circuitBreakerThreshold = 5;
  private circuitBreakerTimeout = 60000; // 1 
  private teeStream?: TeeStream;
  private retryStrategy: RetryStrategy;

  constructor(
    private db: Database,
    private loadBalancer: LoadBalancer,
    private smartRouter?: SmartRouter,
    private transformerManager?: TransformerManager,
  ) {
    // 
    this.retryStrategy = new RetryStrategy;

    //  Tee Stream
    const destinations = this.db.getEnabledTeeDestinations;
    if (destinations.length > 0) {
      this.teeStream = new TeeStream(destinations);
    }
  }

  /**
   * 
   */
  async handle(req: Request): Promise<Response> {
    const start = Date.now;

    // 
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
      // 
      const parseSpan = tracer.startSpan('proxy.parseRequest', rootSpan.traceId, rootSpan.spanId);
      const parsed = await this.parseRequest(req);
      tracer.endSpan(parseSpan.spanId, 'success');

      // 
      const channels = this.db.getEnabledChannels;

      // 
      const available = channels.filter((ch) => !this.isCircuitOpen(ch.id));

      if (available.length === 0) {
        tracer.addLog(rootSpan.spanId, 'No available channels', 'error');
        throw new NoAvailableChannelError;
      }

      //  SmartRouter
      let channel: Channel;
      let routedModel: string | undefined;
      let matchedRuleName: string | undefined;

      const routingSpan = tracer.startSpan('proxy.routing', rootSpan.traceId, rootSpan.spanId);

      if (this.smartRouter && parsed.body) {
        try {
          // Type-safe access to request body properties
          const body = parsed.body as AIRequestBody;

          const routerContext = {
            model: parsed.model || '',
            messages: body.messages || ,
            system: body.system,
            tools: body.tools,
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
            //  LoadBalancer
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
        //  SmartRouter LoadBalancer
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

      // 
      if (routedModel && parsed.body && isAIRequestBody(parsed.body)) {
        parsed.body.model = routedModel;
      }

      // 
      const forwardSpan = tracer.startSpan('proxy.forward', rootSpan.traceId, rootSpan.spanId, {
        channel: channel.name,
        model: parsed.model || 'unknown',
      });
      const response = await this.forwardWithRetries(channel, parsed, available);
      tracer.endSpan(forwardSpan.spanId, 'success', {
        status: response.status.toString,
        latency: response.latency,
      });

      // 
      const latency = Date.now - start;
      this.logRequest(channel, parsed, response, latency, true, rootSpan.traceId);

      // 
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

      //  Tee
      if (this.teeStream) {
        this.teeStream.tee(channel, parsed, response, true).catch(error => {
          logError(error as Error, { component: 'TeeStream', operation: 'tee' });
        });
      }

      // 
      this.db.incrementChannelUsage(channel.id, true);

      // 
      this.resetCircuitBreaker(channel.id);

      // 
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

      // 
      metrics.incrementCounter('routex_requests_total');
      metrics.incrementCounter('routex_requests_failed_total');
      metrics.observeHistogram('routex_request_duration_seconds', latency / 1000, {
        status: 'failed'
      });

      //  RoutexError
      if (error instanceof RoutexError) {
        throw error;
      }

      // 
      throw new ChannelError(
        error instanceof Error ? error.message : 'Unknown proxy error',
        { latency }
      );
    }
  }

  /**
   *  Tee Stream 
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
      //  tee stream
      this.teeStream.shutdown.catch(error => {
        logError(error as Error, { component: 'TeeStream', operation: 'shutdown' });
      });
      this.teeStream = undefined;
    }
  }

  /**
   * 
   */
  async shutdown {
    if (this.teeStream) {
      await this.teeStream.shutdown;
    }
    logger.info('🛑 Proxy engine shutdown complete');
  }

  /**
   *  + 
   */
  private async forwardWithRetries(
    channel: Channel,
    request: ParsedRequest,
    availableChannels: Channel,
  ): Promise<ProxyResponse> {
    let lastError: Error | null = null;
    let attempt = 0;
    const maxRetries = this.retryStrategy.getMaxRetries;

    while (attempt < maxRetries) {
      attempt++;

      try {
        return await this.forward(channel, request);
      } catch (error) {
        lastError = error as Error;

        // 
        if (!this.retryStrategy.isRetriable(lastError)) {
          logger.warn({
            error: lastError.message,
            attempt,
            channel: channel.name,
          }, '❌ Error is not retriable, aborting retry');
          throw lastError;
        }

        // 
        this.recordFailure(channel.id);

        // 
        if (this.isCircuitOpen(channel.id) && availableChannels.length > 1) {
          const otherChannels = availableChannels.filter((ch) => ch.id !== channel.id);
          if (otherChannels.length > 0) {
            const previousChannelId = channel.id;
            channel = await this.loadBalancer.select(otherChannels, {});
            logger.warn({
              attempt,
              previousChannel: previousChannelId,
              newChannel: channel.name,
              circuitOpen: true,
            }, `⚠️  Retrying with different channel: ${channel.name}`);
          }
        }

        //  + 
        if (attempt < maxRetries) {
          const delay = this.retryStrategy.calculateDelay(attempt);
          this.retryStrategy.logRetry(attempt, delay, lastError, {
            channel: channel.name,
            channelId: channel.id,
          });

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // 
    this.retryStrategy.logRetryExhausted(attempt, lastError!, {
      channel: channel.name,
      channelId: channel.id,
    });

    // 
    metrics.incrementCounter('routex_retry_exhausted_total', 1, {
      channel: channel.name,
    });

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   *  Provider 
   */
  private async forward(channel: Channel, request: ParsedRequest): Promise<ProxyResponse> {
    const start = Date.now;

    // 
    const provider = getProvider(channel);

    // 
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
          //  baseUrl 
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
        // 
      }
    }

    // 
    const modifiedRequest: ParsedRequest = {
      ...request,
      body: transformedRequest,
    };

    // URLheadersbody
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

    // 
    const response = await fetch(providerRequest.url, {
      method: providerRequest.method,
      headers: providerRequest.headers,
      body: providerRequest.body ? JSON.stringify(providerRequest.body) : undefined,
    });

    const latency = Date.now - start;

    //  HTTP  HTTPError 
    if (!response.ok) {
      const responseBody = await response.text;
      throw new HTTPError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        responseBody
      );
    }

    // 
    const providerResponse = await provider.handleResponse(response, channel);
    let responseBody = providerResponse.body;

    // 
    if (this.transformerManager && channel.transformers && responseBody) {
      try {
        const transformerSpecs = channel.transformers.use || ;
        if (transformerSpecs.length > 0) {
          logTransformer('pipeline', 'response', {
            count: transformerSpecs.length,
            channel: channel.name,
          });
          // 
          const reversedSpecs = [...transformerSpecs].reverse;
          responseBody = await this.transformerManager.transformResponse(
            responseBody,
            reversedSpecs
          );
        }
      } catch (error) {
        logError(error as Error, { component: 'ResponseTransformer', channel: channel.name });
        // 
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
   * 
   */
  private async parseRequest(req: Request): Promise<ParsedRequest> {
    const url = new URL(req.url);
    const headers: Record<string, string> = {};

    //  headers headers
    for (const [key, value] of req.headers.entries) {
      if (!key.startsWith('x-') && key !== 'host') {
        headers[key] = value;
      }
    }

    //  POST/PUT  body
    let body: unknown = null;
    let model: string | undefined;

    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        body = await req.json;
        if (body && typeof body === 'object' && 'model' in body) {
          // Type-safe access to model property
          const requestBody = body as AIRequestBody;
          model = requestBody.model;
        }
      } catch (error) {
        //  null body
        logger.debug({
          error: error instanceof Error ? error.message : 'Unknown error',
          method: req.method,
          url: req.url,
          contentType: req.headers.get('content-type'),
        }, '⚠️  Failed to parse request body');
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
   * 
   */
  private logRequest(
    channel: Channel,
    request: ParsedRequest,
    response: ProxyResponse,
    latency: number,
    success: boolean,
    traceId?: string,
  ) {
    //  Provider  token 
    const provider = getProvider(channel);
    const tokenUsage = provider.extractTokenUsage(response.body);

    // Type-safe access to response body
    const body = response.body as AIResponseBody;

    //  token 
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
      traceId,
    };

    this.db.logRequest(log);
  }

  // ============================================================================
  // 
  // ============================================================================

  /**
   * 
   */
  private recordFailure(channelId: string) {
    const state = this.circuitBreaker.get(channelId) || { failures: 0, lastFailure: 0 };
    state.failures++;
    state.lastFailure = Date.now;
    this.circuitBreaker.set(channelId, state);

    // 
    if (state.failures >= this.circuitBreakerThreshold) {
      this.db.updateChannel(channelId, { status: 'rate_limited' });

      // 
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
   * 
   */
  private isCircuitOpen(channelId: string): boolean {
    const state = this.circuitBreaker.get(channelId);
    if (!state || state.failures < this.circuitBreakerThreshold) {
      return false;
    }

    // 
    if (Date.now - state.lastFailure > this.circuitBreakerTimeout) {
      this.resetCircuitBreaker(channelId);
      return false;
    }

    return true;
  }

  /**
   * 
   */
  private resetCircuitBreaker(channelId: string) {
    this.circuitBreaker.delete(channelId);
    this.db.updateChannel(channelId, { status: 'enabled' });
    metrics.setGauge('routex_circuit_breaker_open', 0, { channel: channelId });
    logger.info({ channelId }, `🟢 Circuit breaker reset for channel ${channelId}`);
  }
}
