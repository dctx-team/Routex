/**
 * Tee Stream system for replicating requests/responses to multiple destinations
 */

import type {
  TeeDestination,
  TeePayload,
  Channel,
  ParsedRequest,
  ProxyResponse,
} from '../types';
import { logger, logError } from '../utils/logger';
import { getProvider } from '../providers';
import { metrics } from './metrics';
import * as fs from 'fs';
import * as path from 'path';

export class TeeStream {
  private destinations: TeeDestination[] = [];
  private queue: Array<{ destination: TeeDestination; payload: TeePayload }> = [];
  private processing = false;
  private batchSize = 10;
  private flushInterval = 1000; // 1 second
  private timer?: ReturnType<typeof setInterval>;

  constructor(destinations: TeeDestination[] = []) {
    this.destinations = destinations.filter(d => d.enabled);
    this.startBackgroundProcessing();

    logger.info({
      count: this.destinations.length,
      destinations: this.destinations.map(d => ({ name: d.name, type: d.type })),
    }, `📤 Tee Stream initialized with ${this.destinations.length} destinations`);
  }

  /**
   * Add or update destinations
   */
  setDestinations(destinations: TeeDestination[]) {
    this.destinations = destinations.filter(d => d.enabled);
    logger.info({
      count: this.destinations.length,
    }, `📤 Tee Stream destinations updated: ${this.destinations.length} active`);
  }

  /**
   * Tee a request/response to all configured destinations
   */
  async tee(
    channel: Channel,
    request: ParsedRequest,
    response: ProxyResponse,
    success: boolean,
    error?: string,
  ): Promise<void> {
    if (this.destinations.length === 0) {
      return;
    }

    // Extract token usage
    const provider = getProvider(channel);
    const tokenUsage = provider.extractTokenUsage(response.body);

    // Build payload
    const payload: TeePayload = {
      id: `tee-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      channel: {
        id: channel.id,
        name: channel.name,
        type: channel.type,
      },
      request: {
        method: request.method,
        path: request.path,
        model: request.model,
        body: request.body,
        headers: request.headers,
      },
      response: {
        status: response.status,
        body: response.body,
        headers: response.headers,
        latency: response.latency,
      },
      tokens: {
        input: tokenUsage.inputTokens,
        output: tokenUsage.outputTokens,
        cached: tokenUsage.cachedTokens,
      },
      success,
      error,
    };

    // Queue payload for each matching destination
    for (const destination of this.destinations) {
      if (this.shouldTee(destination, channel, request, response, success)) {
        this.queue.push({ destination, payload });
      }
    }

    //// Update metrics
    metrics.setGauge('routex_tee_queue_size', this.queue.length);

    logger.debug({
      queueSize: this.queue.length,
      destinations: this.destinations.length,
    }, `📤 Tee queued: ${this.queue.length} items`);
  }

  /**
   * Check if payload should be sent to destination based on filters
   */
  private shouldTee(
    destination: TeeDestination,
    channel: Channel,
    request: ParsedRequest,
    response: ProxyResponse,
    success: boolean,
  ): boolean {
    const filter = destination.filter;
    if (!filter) return true;

    // Sample rate
    if (filter.sampleRate !== undefined && Math.random() > filter.sampleRate) {
      return false;
    }

    // Success/failure filter
    if (filter.successOnly && !success) return false;
    if (filter.failureOnly && success) return false;

    // Channel filter
    if (filter.channels && !filter.channels.includes(channel.id) && !filter.channels.includes(channel.name)) {
      return false;
    }

    // Model filter
    if (filter.models && request.model && !filter.models.includes(request.model)) {
      return false;
    }

    // Status code filter
    if (filter.statusCodes && !filter.statusCodes.includes(response.status)) {
      return false;
    }

    return true;
  }

  /**
   * Start background processing of queued items
   */
  private startBackgroundProcessing() {
    this.timer = setInterval(() => {
      if (!this.processing && this.queue.length > 0) {
        this.processQueue().catch(error => {
          logError(error as Error, { component: 'TeeStream', operation: 'processQueue' });
        });
      }
    }, this.flushInterval);
  }

  /**
   * Process queued items in batches
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    try {
      const batch = this.queue.splice(0, this.batchSize);

      logger.debug({
        batchSize: batch.length,
        remaining: this.queue.length,
      }, `📤 Processing tee batch: ${batch.length} items`);

      // Process all items in parallel
      await Promise.allSettled(
        batch.map(({ destination, payload }) =>
          this.sendToDestination(destination, payload)
        )
      );
    } catch (error) {
      logError(error as Error, { component: 'TeeStream', operation: 'processQueue' });
    } finally {
      this.processing = false;
    }
  }

  /**
   * Send payload to a specific destination
   */
  private async sendToDestination(
    destination: TeeDestination,
    payload: TeePayload,
  ): Promise<void> {
    const maxRetries = destination.retries || 3;
    const timeout = destination.timeout || 5000;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        switch (destination.type) {
          case 'http':
          case 'webhook':
            await this.sendHttp(destination, payload, timeout);
            break;
          case 'file':
            await this.sendFile(destination, payload);
            break;
          case 'custom':
            await this.sendCustom(destination, payload);
            break;
          default:
            throw new Error(`Unknown destination type: ${destination.type}`);
        }

        logger.debug({
          destination: destination.name,
          type: destination.type,
          payloadId: payload.id,
        }, `✅ Tee sent successfully: ${destination.name}`);

        //// Update metrics
        metrics.incrementCounter('routex_tee_sent_total', 1, {
          destination: destination.name,
          type: destination.type
        });

        return;
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          //// Update failure metrics
          metrics.incrementCounter('routex_tee_failed_total', 1, {
            destination: destination.name,
            type: destination.type
          });

          logError(error as Error, {
            component: 'TeeStream',
            destination: destination.name,
            type: destination.type,
            attempts: attempt,
          });
        } else {
          logger.warn({
            destination: destination.name,
            attempt,
            maxRetries,
          }, `⚠️  Tee retry ${attempt}/${maxRetries}: ${destination.name}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
  }

  /**
   * Send to HTTP/Webhook endpoint
   */
  private async sendHttp(
    destination: TeeDestination,
    payload: TeePayload,
    timeout: number,
  ): Promise<void> {
    if (!destination.url) {
      throw new Error('HTTP destination requires url');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(destination.url, {
        method: destination.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...destination.headers,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Send to file
   */
  private async sendFile(
    destination: TeeDestination,
    payload: TeePayload,
  ): Promise<void> {
    if (!destination.filePath) {
      throw new Error('File destination requires filePath');
    }

    const dir = path.dirname(destination.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const line = JSON.stringify(payload) + '\n';
    await fs.promises.appendFile(destination.filePath, line, 'utf8');
  }

  /**
   * Send to custom handler
   */
  private async sendCustom(
    destination: TeeDestination,
    payload: TeePayload,
  ): Promise<void> {
    if (!destination.customHandler) {
      throw new Error('Custom destination requires customHandler');
    }

    try {
      // Dynamic import of custom handler
      const handlerPath = path.resolve(process.cwd(), destination.customHandler);
      const handler = await import(handlerPath);

      if (typeof handler.default !== 'function') {
        throw new Error('Custom handler must export a default function');
      }

      await handler.default(payload);
    } catch (error) {
      throw new Error(`Custom handler error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Flush all pending items immediately
   */
  async flush(): Promise<void> {
    logger.info({
      queueSize: this.queue.length,
    }, '📤 Flushing tee queue...');

    while (this.queue.length > 0) {
      await this.processQueue();
    }
  }

  /**
   * Stop background processing and flush
   */
  async shutdown(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    await this.flush();

    logger.info('📤 Tee Stream shutdown complete');
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      destinations: this.destinations.length,
      queueSize: this.queue.length,
      processing: this.processing,
    };
  }
}
