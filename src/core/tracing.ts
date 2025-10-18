/**
 * Request Tracing - Distributed Tracing Support
 *
 */

import { logger } from '../utils/logger';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  timestamp: number;
  duration?: number;
  status?: 'pending' | 'success' | 'error';
  metadata?: Record<string, any>;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error';
  tags: Record<string, string | number | boolean>;
  logs: Array<{ timestamp: number; message: string; level: string }>;
}

export class RequestTracer {
  private spans = new Map<string, Span>;
  private maxSpans = 10000; // Keep last 10k spans in memory

  /**
   * Generate a unique trace ID
   */
  generateTraceId: string {
    return `trace-${Date.now}-${Math.random.toString(36).substring(2, 15)}`;
  }

  /**
   * Generate a unique span ID
   */
  generateSpanId: string {
    return `span-${Math.random.toString(36).substring(2, 15)}`;
  }

  /**
   * Start a new span
   */
  startSpan(
    name: string,
    traceId?: string,
    parentSpanId?: string,
    tags?: Record<string, string | number | boolean>
  ): Span {
    const spanId = this.generateSpanId;
    const span: Span = {
      traceId: traceId || this.generateTraceId,
      spanId,
      parentSpanId,
      name,
      startTime: Date.now,
      status: 'pending',
      tags: tags || {},
      logs: ,
    };

    this.spans.set(spanId, span);

    // Prevent memory leak by limiting span count
    if (this.spans.size > this.maxSpans) {
      const oldestSpanId = Array.from(this.spans.keys)[0];
      this.spans.delete(oldestSpanId);
    }

    logger.debug({
      traceId: span.traceId,
      spanId: span.spanId,
      name: span.name,
    }, '🔍 Span started');

    return span;
  }

  /**
   * End a span
   */
  endSpan(
    spanId: string,
    status: 'success' | 'error' = 'success',
    tags?: Record<string, string | number | boolean>
  ): Span | null {
    const span = this.spans.get(spanId);
    if (!span) {
      logger.warn({ spanId }, '⚠️  Span not found');
      return null;
    }

    span.endTime = Date.now;
    span.duration = span.endTime - span.startTime;
    span.status = status;

    if (tags) {
      Object.assign(span.tags, tags);
    }

    logger.debug({
      traceId: span.traceId,
      spanId: span.spanId,
      name: span.name,
      duration: span.duration,
      status: span.status,
    }, `✅ Span ended (${span.duration}ms)`);

    return span;
  }

  /**
   * Add a log to a span
   */
  addLog(spanId: string, message: string, level: string = 'info'): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.logs.push({
      timestamp: Date.now,
      message,
      level,
    });
  }

  /**
   * Add tags to a span
   */
  addTags(spanId: string, tags: Record<string, string | number | boolean>): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    Object.assign(span.tags, tags);
  }

  /**
   * Get a span by ID
   */
  getSpan(spanId: string): Span | undefined {
    return this.spans.get(spanId);
  }

  /**
   * Get all spans for a trace
   */
  getTraceSpans(traceId: string): Span {
    return Array.from(this.spans.values).filter(
      (span) => span.traceId === traceId
    );
  }

  /**
   * Get trace context from headers
   */
  extractTraceContext(headers: Headers): TraceContext | null {
    // Support multiple tracing formats
    const traceId =
      headers.get('x-trace-id') ||
      headers.get('x-request-id') ||
      headers.get('traceparent')?.split('-')[1]; // W3C Trace Context

    const spanId = headers.get('x-span-id') || this.generateSpanId;
    const parentSpanId = headers.get('x-parent-span-id');

    if (!traceId) return null;

    return {
      traceId,
      spanId,
      parentSpanId,
      timestamp: Date.now,
      status: 'pending',
    };
  }

  /**
   * Inject trace context into headers
   */
  injectTraceContext(headers: Headers, context: TraceContext): void {
    headers.set('x-trace-id', context.traceId);
    headers.set('x-span-id', context.spanId);

    if (context.parentSpanId) {
      headers.set('x-parent-span-id', context.parentSpanId);
    }

    // W3C Trace Context format
    const traceparent = `00-${context.traceId}-${context.spanId}-01`;
    headers.set('traceparent', traceparent);
  }

  /**
   * Get statistics
   */
  getStats {
    const spans = Array.from(this.spans.values);
    const completedSpans = spans.filter((s) => s.status !== 'pending');
    const successSpans = spans.filter((s) => s.status === 'success');
    const errorSpans = spans.filter((s) => s.status === 'error');

    const avgDuration =
      completedSpans.length > 0
        ? completedSpans.reduce((sum, s) => sum + (s.duration || 0), 0)
          completedSpans.length
        : 0;

    return {
      totalSpans: this.spans.size,
      completed: completedSpans.length,
      success: successSpans.length,
      error: errorSpans.length,
      averageDuration: Math.round(avgDuration),
      maxSpans: this.maxSpans,
    };
  }

  /**
   * Clear old spans (older than specified time)
   */
  clearOldSpans(olderThanMs: number = 3600000): number {
    const cutoffTime = Date.now - olderThanMs;
    let removedCount = 0;

    for (const [spanId, span] of this.spans.entries) {
      if (span.startTime < cutoffTime) {
        this.spans.delete(spanId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info({
        removedCount,
        remainingSpans: this.spans.size,
      }, `🧹 Cleared ${removedCount} old spans`);
    }

    return removedCount;
  }

  /**
   * Clear all spans
   */
  clear: void {
    this.spans.clear;
    logger.info('🧹 Cleared all spans');
  }
}

// Global tracer instance
export const tracer = new RequestTracer;
