/**
 * Database layer using Bun's native SQLite
 * 使用 Bun 原生 SQLite 的数据库层
 */

import { Database as BunSQLite } from 'bun:sqlite';
import type {
  Channel,
  CreateChannelInput,
  UpdateChannelInput,
  RequestLog,
  Analytics,
} from '../types';

export class Database {
  private db: BunSQLite;
  private requestBuffer: RequestLog[] = [];
  private flushInterval: Timer | null = null;

  constructor(path: string) {
    this.db = new BunSQLite(path);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA synchronous = NORMAL');
    this.migrate();
    this.startBufferFlush();
  }

  /**
   * Run database migrations
   * 运行数据库迁移
   */
  private migrate() {
    const version = this.getVersion();

    if (version < 1) {
      this.migrateV1();
    }
    if (version < 2) {
      this.migrateV2();
    }

    this.setVersion(2);
  }

  private getVersion(): number {
    const result = this.db.query('PRAGMA user_version').get() as { user_version: number };
    return result.user_version;
  }

  private setVersion(version: number) {
    this.db.exec(`PRAGMA user_version = ${version}`);
  }

  private migrateV1() {
    // Channels table / 渠道表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        base_url TEXT,
        api_key TEXT,
        refresh_token TEXT,
        models TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 50,
        weight INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'enabled',
        request_count INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        last_used_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Requests table / 请求表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        model TEXT NOT NULL,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        latency INTEGER NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        cached_tokens INTEGER NOT NULL DEFAULT 0,
        success INTEGER NOT NULL,
        error TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
      )
    `);

    // Indexes / 索引
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_requests_channel_id ON requests(channel_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_channels_status ON channels(status)');
  }

  private migrateV2() {
    // Future migrations / 未来的迁移
    // Add new fields or tables here / 在此添加新字段或表
  }

  // ============================================================================
  // Channel Operations / 渠道操作
  // ============================================================================

  createChannel(input: CreateChannelInput): Channel {
    const id = crypto.randomUUID();
    const now = Date.now();

    const query = this.db.prepare(`
      INSERT INTO channels (
        id, name, type, base_url, api_key, models, priority, weight,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'enabled', ?, ?)
    `);

    query.run(
      id,
      input.name,
      input.type,
      input.baseUrl || null,
      input.apiKey || null,
      JSON.stringify(input.models),
      input.priority || 50,
      input.weight || 1,
      now,
      now,
    );

    return this.getChannel(id)!;
  }

  getChannel(id: string): Channel | null {
    const query = this.db.prepare('SELECT * FROM channels WHERE id = ?');
    const row = query.get(id) as any;
    return row ? this.mapChannelRow(row) : null;
  }

  getChannels(): Channel[] {
    const query = this.db.query('SELECT * FROM channels ORDER BY priority DESC, name ASC');
    const rows = query.all() as any[];
    return rows.map((row) => this.mapChannelRow(row));
  }

  getEnabledChannels(): Channel[] {
    const query = this.db.query(
      "SELECT * FROM channels WHERE status = 'enabled' ORDER BY priority DESC, name ASC",
    );
    const rows = query.all() as any[];
    return rows.map((row) => this.mapChannelRow(row));
  }

  updateChannel(id: string, input: UpdateChannelInput): Channel {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.apiKey !== undefined) {
      updates.push('api_key = ?');
      values.push(input.apiKey);
    }
    if (input.baseUrl !== undefined) {
      updates.push('base_url = ?');
      values.push(input.baseUrl);
    }
    if (input.models !== undefined) {
      updates.push('models = ?');
      values.push(JSON.stringify(input.models));
    }
    if (input.priority !== undefined) {
      updates.push('priority = ?');
      values.push(input.priority);
    }
    if (input.weight !== undefined) {
      updates.push('weight = ?');
      values.push(input.weight);
    }
    if (input.status !== undefined) {
      updates.push('status = ?');
      values.push(input.status);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());

    values.push(id);

    const query = this.db.prepare(`UPDATE channels SET ${updates.join(', ')} WHERE id = ?`);
    query.run(...values);

    return this.getChannel(id)!;
  }

  deleteChannel(id: string): boolean {
    const query = this.db.prepare('DELETE FROM channels WHERE id = ?');
    const result = query.run(id);
    return result.changes > 0;
  }

  incrementChannelUsage(id: string, success: boolean) {
    const query = this.db.prepare(`
      UPDATE channels
      SET request_count = request_count + 1,
          success_count = success_count + ?,
          failure_count = failure_count + ?,
          last_used_at = ?
      WHERE id = ?
    `);
    query.run(success ? 1 : 0, success ? 0 : 1, Date.now(), id);
  }

  // ============================================================================
  // Request Logging / 请求日志
  // ============================================================================

  /**
   * Buffer a request log entry for batch insertion
   * 缓冲请求日志条目以进行批量插入
   */
  logRequest(log: Omit<RequestLog, 'id'>) {
    this.requestBuffer.push({
      id: crypto.randomUUID(),
      ...log,
    });

    // Flush immediately if buffer is full / 如果缓冲区已满，立即刷新
    if (this.requestBuffer.length >= 100) {
      this.flushRequests();
    }
  }

  /**
   * Flush buffered requests to database
   * 将缓冲的请求刷新到数据库
   */
  private flushRequests() {
    if (this.requestBuffer.length === 0) return;

    const query = this.db.prepare(`
      INSERT INTO requests (
        id, channel_id, model, method, path, status_code, latency,
        input_tokens, output_tokens, cached_tokens, success, error, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const log of this.requestBuffer) {
        query.run(
          log.id,
          log.channelId,
          log.model,
          log.method,
          log.path,
          log.statusCode,
          log.latency,
          log.inputTokens,
          log.outputTokens,
          log.cachedTokens,
          log.success ? 1 : 0,
          log.error || null,
          log.timestamp,
        );
      }
    });

    transaction();
    this.requestBuffer = [];
  }

  /**
   * Start periodic buffer flush
   * 启动定期缓冲区刷新
   */
  private startBufferFlush() {
    this.flushInterval = setInterval(() => {
      this.flushRequests();
    }, 100); // Flush every 100ms / 每 100 毫秒刷新一次
  }

  getRequests(limit = 100, offset = 0): RequestLog[] {
    const query = this.db.query(`
      SELECT * FROM requests
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);
    const rows = query.all(limit, offset) as any[];
    return rows.map((row) => this.mapRequestRow(row));
  }

  getRequestsByChannel(channelId: string, limit = 100): RequestLog[] {
    const query = this.db.query(`
      SELECT * FROM requests
      WHERE channel_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = query.all(channelId, limit) as any[];
    return rows.map((row) => this.mapRequestRow(row));
  }

  // ============================================================================
  // Analytics / 分析
  // ============================================================================

  getAnalytics(): Analytics {
    const query = this.db.query(`
      SELECT
        COUNT(*) as total_requests,
        SUM(success) as successful_requests,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_requests,
        AVG(latency) as average_latency,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(cached_tokens) as total_cached_tokens
      FROM requests
    `);

    const result = query.get() as any;

    return {
      totalRequests: result.total_requests || 0,
      successfulRequests: result.successful_requests || 0,
      failedRequests: result.failed_requests || 0,
      averageLatency: result.average_latency || 0,
      totalInputTokens: result.total_input_tokens || 0,
      totalOutputTokens: result.total_output_tokens || 0,
      totalCachedTokens: result.total_cached_tokens || 0,
      estimatedCost: this.calculateCost(
        result.total_input_tokens || 0,
        result.total_output_tokens || 0,
        result.total_cached_tokens || 0,
      ),
    };
  }

  private calculateCost(inputTokens: number, outputTokens: number, cachedTokens: number): number {
    // Simplified cost calculation (adjust based on actual pricing)
    // 简化的成本计算（根据实际定价调整）
    const inputCost = (inputTokens / 1_000_000) * 3.0; // $3 per 1M input tokens / 每百万输入 token 3 美元
    const outputCost = (outputTokens / 1_000_000) * 15.0; // $15 per 1M output tokens / 每百万输出 token 15 美元
    const cacheCost = (cachedTokens / 1_000_000) * 0.3; // $0.3 per 1M cached tokens / 每百万缓存 token 0.3 美元
    return inputCost + outputCost + cacheCost;
  }

  // ============================================================================
  // Helper Methods / 辅助方法
  // ============================================================================

  private mapChannelRow(row: any): Channel {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      baseUrl: row.base_url || undefined,
      apiKey: row.api_key || undefined,
      refreshToken: row.refresh_token || null,
      models: JSON.parse(row.models),
      priority: row.priority,
      weight: row.weight,
      status: row.status,
      requestCount: row.request_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      lastUsedAt: row.last_used_at || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRequestRow(row: any): RequestLog {
    return {
      id: row.id,
      channelId: row.channel_id,
      model: row.model,
      method: row.method,
      path: row.path,
      statusCode: row.status_code,
      latency: row.latency,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      cachedTokens: row.cached_tokens,
      success: row.success === 1,
      error: row.error || undefined,
      timestamp: row.timestamp,
    };
  }

  /**
   * Close database connection
   * 关闭数据库连接
   */
  close() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flushRequests(); // Final flush / 最终刷新
    this.db.close();
  }
}
