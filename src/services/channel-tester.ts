/**
 * Channel Connection Tester
 * 
 */

import type { Channel } from '../types';

export interface TestResult {
  success: boolean;
  channelName: string;
  latency?: number;
  error?: string;
  details?: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    model?: string;
  };
}

export class ChannelTester {
  /**
   * Test a single channel
   * 
   */
  async testChannel(channel: Channel): Promise<TestResult> {
    const startTime = Date.now;

    try {
      // 
      const testRequest = this.buildTestRequest(channel);

      // 
      const response = await fetch(testRequest.url, {
        method: 'POST',
        headers: testRequest.headers,
        body: JSON.stringify(testRequest.body),
        signal: AbortSignal.timeout(10000), // 10
      });

      const latency = Date.now - startTime;

      // 
      if (!response.ok) {
        const errorText = await response.text.catch( => 'Unable to read error');
        return {
          success: false,
          channelName: channel.name,
          latency,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            headers: this.extractHeaders(response),
          },
        };
      }

      // 
      const contentType = response.headers.get('content-type') || '';
      let responseData: any;

      if (contentType.includes('application/json')) {
        responseData = await response.json;
      } else if (contentType.includes('text/event-stream')) {
        // SSE 
        responseData = { stream: true };
      } else {
        responseData = await response.text;
      }

      return {
        success: true,
        channelName: channel.name,
        latency,
        details: {
          status: response.status,
          statusText: response.statusText,
          headers: this.extractHeaders(response),
          model: this.extractModelFromResponse(responseData),
        },
      };
    } catch (error) {
      const latency = Date.now - startTime;
      return {
        success: false,
        channelName: channel.name,
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test multiple channels in parallel
   * 
   */
  async testChannels(channels: Channel): Promise<TestResult> {
    const promises = channels.map((channel) => this.testChannel(channel));
    return Promise.all(promises);
  }

  /**
   * Build test request based on channel type
   * 
   */
  private buildTestRequest(channel: Channel): {
    url: string;
    headers: Record<string, string>;
    body: any;
  } {
    const baseURL = channel.baseURL || this.getDefaultBaseURL(channel.type);

    if (channel.type === 'anthropic') {
      return {
        url: `${baseURL}/v1/messages`,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': channel.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: {
          model: channel.models?.[0] || 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [
            {
              role: 'user',
              content: 'Hello',
            },
          ],
        },
      };
    } else if (channel.type === 'openai') {
      return {
        url: `${baseURL}/v1/chat/completions`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${channel.apiKey}`,
        },
        body: {
          model: channel.models?.[0] || 'gpt-3.5-turbo',
          max_tokens: 10,
          messages: [
            {
              role: 'user',
              content: 'Hello',
            },
          ],
        },
      };
    } else {
      throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  /**
   * Get default base URL for channel type
   *  Base URL
   */
  private getDefaultBaseURL(type: string): string {
    switch (type) {
      case 'anthropic':
        return 'https://api.anthropic.com';
      case 'openai':
        return 'https://api.openai.com';
      default:
        throw new Error(`Unknown channel type: ${type}`);
    }
  }

  /**
   * Extract relevant headers from response
   * 
   */
  private extractHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    const relevantHeaders = [
      'content-type',
      'x-request-id',
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
    ];

    for (const header of relevantHeaders) {
      const value = response.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    }

    return headers;
  }

  /**
   * Extract model name from response
   * 
   */
  private extractModelFromResponse(data: any): string | undefined {
    if (typeof data === 'object' && data !== null) {
      return data.model || data.id || undefined;
    }
    return undefined;
  }

  /**
   * Quick health check (lightweight test)
   * 
   */
  async quickCheck(channel: Channel): Promise<boolean> {
    try {
      const result = await this.testChannel(channel);
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Batch test with progress callback
   * 
   */
  async testChannelsWithProgress(
    channels: Channel,
    onProgress?: (completed: number, total: number, result: TestResult) => void,
  ): Promise<TestResult> {
    const results: TestResult = ;
    const total = channels.length;

    for (let i = 0; i < channels.length; i++) {
      const result = await this.testChannel(channels[i]);
      results.push(result);

      if (onProgress) {
        onProgress(i + 1, total, result);
      }
    }

    return results;
  }

  /**
   * Get test summary
   * 
   */
  getTestSummary(results: TestResult): {
    total: number;
    passed: number;
    failed: number;
    averageLatency: number;
    successRate: number;
  } {
    const total = results.length;
    const passed = results.filter((r) => r.success).length;
    const failed = total - passed;
    const validLatencies = results.filter((r) => r.latency !== undefined).map((r) => r.latency!);
    const averageLatency =
      validLatencies.length > 0
        ? validLatencies.reduce((sum, lat) => sum + lat, 0) / validLatencies.length
        : 0;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    return {
      total,
      passed,
      failed,
      averageLatency: Math.round(averageLatency),
      successRate: Math.round(successRate * 100) / 100,
    };
  }
}
