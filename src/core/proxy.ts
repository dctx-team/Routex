/**
 * 用于转发请求到 AI 提供商的代理引擎
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
  private circuitBreaker = new Map<string, { failures: number; lastFailure: number }>();
  private circuitBreakerThreshold = 5;
  private circuitBreakerTimeout = 60000; // 1 分钟
  private teeStream?: TeeStream;
  private retryStrategy: RetryStrategy;

  constructor(
    private db: Database,
    private loadBalancer: LoadBalancer,
    private smartRouter?: SmartRouter,
    private transformerManager?: TransformerManager,
  ) {
    // 初始化重试策略
    this.retryStrategy = new RetryStrategy();

    // 使用启用的目标初始化 Tee Stream
    const destinations = this.db.getEnabledTeeDestinations();
    if (destinations.length > 0) {
      this.teeStream = new TeeStream(destinations);
    }
  }

  /**
   * 处理传入的代理请求
   */
  async handle(req: Request): Promise<Response> {
    const start = Date.now();

    // 提取或创建追踪上下文
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
      // 解析请求
      const parseSpan = tracer.startSpan('proxy.parseRequest', rootSpan.traceId, rootSpan.spanId);
      const parsed = await this.parseRequest(req);
      tracer.endSpan(parseSpan.spanId, 'success');

      // 获取可用频道
      const channels = this.db.getEnabledChannels();

      // 过滤掉处于熔断器状态的频道
      const available = channels.filter((ch) => !this.isCircuitOpen(ch.id));

      if (available.length === 0) {
        tracer.addLog(rootSpan.spanId, 'No available channels', 'error');
        throw new NoAvailableChannelError();
      }

      // 如果可用，首先尝试 SmartRouter
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
            messages: body.messages || [],
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
            // 回退到 LoadBalancer
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
        // 没有 SmartRouter，使用 LoadBalancer
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

      // 如果指定了路由模型，则覆盖模型
      if (routedModel && parsed.body && isAIRequestBody(parsed.body)) {
        parsed.body.model = routedModel;
      }

      // 使用重试机制转发请求
      const forwardSpan = tracer.startSpan('proxy.forward', rootSpan.traceId, rootSpan.spanId, {
        channel: channel.name,
        model: parsed.model || 'unknown',
      });
      const response = await this.forwardWithRetries(channel, parsed, available);
      tracer.endSpan(forwardSpan.spanId, 'success', {
        status: response.status.toString(),
        latency: response.latency,
      });

      // 记录请求
      const latency = Date.now() - start;
      this.logRequest(channel, parsed, response, latency, true, rootSpan.traceId);

      // 记录指标
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

      // 如果配置了，则 Tee 请求/响应
      if (this.teeStream) {
        this.teeStream.tee(channel, parsed, response, true).catch(error => {
          logError(error as Error, { component: 'TeeStream', operation: 'tee' });
        });
      }

      // 增加使用计数
      this.db.incrementChannelUsage(channel.id, true);

      // 成功时重置熔断器
      this.resetCircuitBreaker(channel.id);

      // 向响应头添加路由信息
      const responseHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Channel-Id': channel.id,
        'X-Channel-Name': channel.name,
        'X-Latency-Ms': latency.toString(),
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
        status: response.status.toString(),
        latency,
      });

      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (error) {
      const latency = Date.now() - start;
      logError(error as Error, { component: 'ProxyEngine', latency, traceId: rootSpan.traceId });

      tracer.addLog(rootSpan.spanId, `Error: ${(error as Error).message}`, 'error');
      tracer.endSpan(rootSpan.spanId, 'error', { latency });

      // 记录失败指标
      metrics.incrementCounter('routex_requests_total');
      metrics.incrementCounter('routex_requests_failed_total');
      metrics.observeHistogram('routex_request_duration_seconds', latency / 1000, {
        status: 'failed'
      });

      // 如果已经是 RoutexError，则重新抛出
      if (error instanceof RoutexError) {
        throw error;
      }

      // 包装未知错误
      throw new ChannelError(
        error instanceof Error ? error.message : 'Unknown proxy error',
        { latency }
      );
    }
  }

  /**
   * 更新 Tee Stream 目标
   */
  updateTeeDestinations() {
    const destinations = this.db.getEnabledTeeDestinations();
    if (destinations.length > 0) {
      if (this.teeStream) {
        this.teeStream.setDestinations(destinations);
      } else {
        this.teeStream = new TeeStream(destinations);
      }
    } else if (this.teeStream) {
      // 没有目标，关闭 tee stream
      this.teeStream.shutdown().catch(error => {
        logError(error as Error, { component: 'TeeStream', operation: 'shutdown' });
      });
      this.teeStream = undefined;
    }
  }

  /**
   * 关闭代理引擎并清理资源
   */
  async shutdown() {
    if (this.teeStream) {
      await this.teeStream.shutdown();
    }
    logger.info('🛑 Proxy engine shutdown complete');
  }

  /**
   * 使用自动重试机制转发请求（优化版：指数退避 + 抖动）
   */
  private async forwardWithRetries(
    channel: Channel,
    request: ParsedRequest,
    availableChannels: Channel[],
  ): Promise<ProxyResponse> {
    let lastError: Error | null = null;
    let attempt = 0;
    const maxRetries = this.retryStrategy.getMaxRetries();

    while (attempt < maxRetries) {
      attempt++;

      try {
        return await this.forward(channel, request);
      } catch (error) {
        lastError = error as Error;

        // 判断是否可重试
        if (!this.retryStrategy.isRetriable(lastError)) {
          logger.warn({
            error: lastError.message,
            attempt,
            channel: channel.name,
          }, '❌ Error is not retriable, aborting retry');
          throw lastError;
        }

        // 记录失败
        this.recordFailure(channel.id);

        // 如果熔断器开启，尝试另一个频道
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

        // 如果还有重试次数，使用指数退避 + 抖动
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

    // 重试耗尽
    this.retryStrategy.logRetryExhausted(attempt, lastError!, {
      channel: channel.name,
      channelId: channel.id,
    });

    // 记录重试耗尽指标
    metrics.incrementCounter('routex_retry_exhausted_total', 1, {
      channel: channel.name,
    });

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * 使用 Provider 抽象将请求转发到频道
   */
  private async forward(channel: Channel, request: ParsedRequest): Promise<ProxyResponse> {
    const start = Date.now();

    // 获取此频道的提供商
    const provider = getProvider(channel);

    // 如果配置了，应用转换器
    let transformedRequest = request.body;
    let transformerHeaders: Record<string, string> = {};

    if (this.transformerManager && channel.transformers && transformedRequest) {
      try {
        const transformerSpecs = channel.transformers.use || [];
        if (transformerSpecs.length > 0) {
          logTransformer('pipeline', 'request', {
            count: transformerSpecs.length,
            channel: channel.name,
          });

          const baseUrl = provider.buildRequestUrl(channel, '');
          // 将 baseUrl 作为选项传递给转换器
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
        // 如果转换失败，继续使用原始请求
      }
    }

    // 使用转换后的数据更新请求体
    const modifiedRequest: ParsedRequest = {
      ...request,
      body: transformedRequest,
    };

    // 准备提供商请求（URL、headers、body）
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

    // 发起请求
    const response = await fetch(providerRequest.url, {
      method: providerRequest.method,
      headers: providerRequest.headers,
      body: providerRequest.body ? JSON.stringify(providerRequest.body) : undefined,
    });

    const latency = Date.now() - start;

    // 如果是 HTTP 错误状态码，抛出 HTTPError 以便重试策略判断
    if (!response.ok) {
      const responseBody = await response.text();
      throw new HTTPError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        responseBody
      );
    }

    // 处理提供商响应
    const providerResponse = await provider.handleResponse(response, channel);
    let responseBody = providerResponse.body;

    // 如果配置了，应用反向转换器
    if (this.transformerManager && channel.transformers && responseBody) {
      try {
        const transformerSpecs = channel.transformers.use || [];
        if (transformerSpecs.length > 0) {
          logTransformer('pipeline', 'response', {
            count: transformerSpecs.length,
            channel: channel.name,
          });
          // 为响应反转转换器顺序
          const reversedSpecs = [...transformerSpecs].reverse();
          responseBody = await this.transformerManager.transformResponse(
            responseBody,
            reversedSpecs
          );
        }
      } catch (error) {
        logError(error as Error, { component: 'ResponseTransformer', channel: channel.name });
        // 如果转换失败，继续使用原始响应
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
   * 解析传入请求
   */
  private async parseRequest(req: Request): Promise<ParsedRequest> {
    const url = new URL(req.url);
    const headers: Record<string, string> = {};

    // 复制相关的 headers（排除内部 headers）
    for (const [key, value] of req.headers.entries()) {
      if (!key.startsWith('x-') && key !== 'host') {
        headers[key] = value;
      }
    }

    // 解析 POST/PUT 请求的 body
    let body: unknown = null;
    let model: string | undefined;

    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        body = await req.json();
        if (body && typeof body === 'object' && 'model' in body) {
          // Type-safe access to model property
          const requestBody = body as AIRequestBody;
          model = requestBody.model;
        }
      } catch (error) {
        // 记录解析错误以进行调试，但继续使用 null body
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
   * 记录请求到数据库
   */
  private logRequest(
    channel: Channel,
    request: ParsedRequest,
    response: ProxyResponse,
    latency: number,
    success: boolean,
    traceId?: string,
  ) {
    // 使用 Provider 从响应中提取 token 使用情况
    const provider = getProvider(channel);
    const tokenUsage = provider.extractTokenUsage(response.body);

    // Type-safe access to response body
    const body = response.body as AIResponseBody;

    // 记录 token 指标
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
      timestamp: Date.now(),
      traceId,
    };

    this.db.logRequest(log);
  }

  // ============================================================================
  // 熔断器
  // ============================================================================

  /**
   * 记录频道失败
   */
  private recordFailure(channelId: string) {
    const state = this.circuitBreaker.get(channelId) || { failures: 0, lastFailure: 0 };
    state.failures++;
    state.lastFailure = Date.now();
    this.circuitBreaker.set(channelId, state);

    // 如果超过阈值，将频道标记为速率受限
    if (state.failures >= this.circuitBreakerThreshold) {
      this.db.updateChannel(channelId, { status: 'rate_limited' });

      // 记录熔断器指标
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
   * 检查熔断器是否开启
   */
  private isCircuitOpen(channelId: string): boolean {
    const state = this.circuitBreaker.get(channelId);
    if (!state || state.failures < this.circuitBreakerThreshold) {
      return false;
    }

    // 超时后自动重置
    if (Date.now() - state.lastFailure > this.circuitBreakerTimeout) {
      this.resetCircuitBreaker(channelId);
      return false;
    }

    return true;
  }

  /**
   * 重置熔断器
   */
  private resetCircuitBreaker(channelId: string) {
    this.circuitBreaker.delete(channelId);
    this.db.updateChannel(channelId, { status: 'enabled' });
    metrics.setGauge('routex_circuit_breaker_open', 0, { channel: channelId });
    logger.info({ channelId }, `🟢 Circuit breaker reset for channel ${channelId}`);
  }
}
