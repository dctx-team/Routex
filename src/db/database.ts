/**
 *  Bun  SQLite
 */

import { Database as BunSQLite } from 'bun:sqlite';
import type {
  Channel,
  CreateChannelInput,
  UpdateChannelInput,
  RequestLog,
  Analytics,
  RoutingRule,
  CreateRoutingRuleInput,
  UpdateRoutingRuleInput,
  TeeDestination,
  CreateTeeDestinationInput,
  UpdateTeeDestinationInput,
} from '../types';
import type {
  ChannelRow,
  RequestRow,
  AnalyticsRow,
  RoutingRuleRow,
  TeeDestinationRow,
  OAuthSessionRow,
  UserVersionRow,
  CountRow,
} from './types';
import { logger } from '../utils/logger';
import { DynamicTTLManager, type CacheType } from './dynamic-ttl';
import { getEncryptionService, isEncrypted, getApiKey } from '../utils/encryption';

export class Database {
  private db: BunSQLite;
  private requestBuffer: RequestLog = ;
  private flushInterval: Timer | null = null;

  //  TTL 
  private channelCache = new Map<string, { data: Channel, timestamp: number }>;
  private singleChannelCache = new Map<string, { data: Channel, timestamp: number }>;
  private routingRuleCache: { data: RoutingRule, timestamp: number } | null = null;
  private readonly CACHE_TTL: number;
  private cacheCleanupInterval: Timer | null = null;

  //
  private cacheLocks = new Map<string, Promise<any>>;

  // 
  private cacheHits = 0;
  private cacheMisses = 0;
  private queryCount = 0;
  private totalQueryTime = 0;

  //  TTL 
  private ttlManager: DynamicTTLManager;

  constructor(path: string, options?: { cacheTTL?: number }) {
    this.db = new BunSQLite(path);

    //  SQLite PRAGMA 
    this.optimizePragmaSettings;

    //  TTL 30 
    this.CACHE_TTL = options?.cacheTTL || Number(process.env.DB_CACHE_TTL) || 30000;

    //  TTL 
    this.ttlManager = new DynamicTTLManager({
      defaultTTL: this.CACHE_TTL,
    });
    this.ttlManager.start;

    logger.debug({ cacheTTL: this.CACHE_TTL }, '🗄️  Database initialized with cache TTL');

    this.migrate;
    this.startBufferFlush;
    this.startCacheCleanup;
  }

  /**
   *  SQLite PRAGMA 
   */
  private optimizePragmaSettings {
    // WAL
    this.db.exec('PRAGMA journal_mode = WAL');
    logger.debug('✅ Enabled WAL mode for better concurrency');

    // NORMAL
    this.db.exec('PRAGMA synchronous = NORMAL');
    logger.debug('✅ Set synchronous to NORMAL for balanced performance');

    //  - 64MB KB
    const cacheSize = Number(process.env.SQLITE_CACHE_SIZE) || -64000; // -64000 KB = 64 MB
    this.db.exec(`PRAGMA cache_size = ${cacheSize}`);
    logger.debug({ cacheSize: Math.abs(cacheSize) + 'KB' }, '✅ Set cache size');

    // 
    this.db.exec('PRAGMA temp_store = MEMORY');
    logger.debug('✅ Using memory for temporary storage');

    //  I/O - 256MB
    const mmapSize = Number(process.env.SQLITE_MMAP_SIZE) || 268435456; // 256 MB
    this.db.exec(`PRAGMA mmap_size = ${mmapSize}`);
    logger.debug({ mmapSize: (mmapSize / 1024 / 1024) + 'MB' }, '✅ Set memory-mapped I/O size');

    //  - 4KB
    this.db.exec('PRAGMA page_size = 4096');

    //  - 5 
    const busyTimeout = Number(process.env.SQLITE_BUSY_TIMEOUT) || 5000;
    this.db.exec(`PRAGMA busy_timeout = ${busyTimeout}`);
    logger.debug({ timeout: busyTimeout + 'ms' }, '✅ Set busy timeout');

    // 
    this.db.exec('PRAGMA foreign_keys = ON');
    logger.debug('✅ Enabled foreign key constraints');

    //  VACUUM
    if (process.env.SQLITE_AUTO_VACUUM === 'incremental') {
      this.db.exec('PRAGMA auto_vacuum = INCREMENTAL');
      logger.debug('✅ Enabled incremental auto-vacuum');
    }

    logger.info('🗄️  SQLite optimized with performance PRAGMA settings');
  }

  /**
   * 
   */
  private migrate {
    const version = this.getVersion;

    if (version < 1) {
      this.migrateV1;
    }
    if (version < 2) {
      this.migrateV2;
    }
    if (version < 3) {
      this.migrateV3;
    }
    if (version < 4) {
      this.migrateV4;
    }
    if (version < 5) {
      this.migrateV5;
    }

    this.setVersion(5);
  }

  private getVersion: number {
    const result = this.db.query('PRAGMA user_version').get as UserVersionRow | undefined;
    return result?.user_version ?? 0;
  }

  private setVersion(version: number) {
    this.db.exec(`PRAGMA user_version = ${version}`);
  }

  private migrateV1 {
    // 
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

    // 
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

    // 
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_requests_channel_id ON requests(channel_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_channels_status ON channels(status)');
  }

  private migrateV2 {
    // 
    this.db.exec(`
      ALTER TABLE channels ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0;
    `);
    this.db.exec(`
      ALTER TABLE channels ADD COLUMN last_failure_time INTEGER;
    `);
    this.db.exec(`
      ALTER TABLE channels ADD COLUMN circuit_breaker_until INTEGER;
    `);
    this.db.exec(`
      ALTER TABLE channels ADD COLUMN rate_limited_until INTEGER;
    `);
    this.db.exec(`
      ALTER TABLE channels ADD COLUMN transformers TEXT;
    `);
  }

  private migrateV3 {
    // 
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS routing_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        condition TEXT NOT NULL,
        target_channel TEXT NOT NULL,
        target_model TEXT,
        priority INTEGER NOT NULL DEFAULT 50,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_routing_rules_priority ON routing_rules(priority DESC)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_routing_rules_enabled ON routing_rules(enabled)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_routing_rules_type ON routing_rules(type)');
  }

  private migrateV4 {
    // Tee 
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tee_destinations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        url TEXT,
        headers TEXT,
        method TEXT,
        file_path TEXT,
        custom_handler TEXT,
        filter TEXT,
        retries INTEGER DEFAULT 3,
        timeout INTEGER DEFAULT 5000,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Tee 
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tee_destinations_enabled ON tee_destinations(enabled)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tee_destinations_type ON tee_destinations(type)');
  }

  private migrateV5 {
    // OAuth 
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_sessions (
        id TEXT PRIMARY KEY,
        channel_id TEXT,
        provider TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at INTEGER NOT NULL,
        scopes TEXT NOT NULL,
        user_info TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
      )
    `);

    // OAuth 
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_oauth_sessions_channel_id ON oauth_sessions(channel_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_oauth_sessions_provider ON oauth_sessions(provider)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires_at ON oauth_sessions(expires_at)');
  }

  // ============================================================================
  // 
  // ============================================================================

  createChannel(input: CreateChannelInput): Channel {
    const id = crypto.randomUUID;
    const now = Date.now;

    //  API 
    let encryptedApiKey: string | null = null;
    if (input.apiKey) {
      try {
        const encryption = getEncryptionService;
        encryptedApiKey = encryption.encrypt(input.apiKey);
        logger.debug({
          channelId: id,
          channelName: input.name,
        }, '🔐 API key encrypted for channel');
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
          channelId: id,
        }, '❌ Failed to encrypt API key');
        throw new Error('Failed to encrypt API key');
      }
    }

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
      encryptedApiKey,
      JSON.stringify(input.models),
      input.priority || 50,
      input.weight || 1,
      now,
      now,
    );

    return this.getChannel(id)!;
  }

  getChannel(id: string): Channel | null {
    //  TTL
    const ttl = this.ttlManager.getTTL('singleChannel');

    // 
    const cached = this.singleChannelCache.get(id);
    if (cached && Date.now - cached.timestamp < ttl) {
      this.cacheHits++;
      this.ttlManager.recordHit('singleChannel');
      return cached.data;
    }

    this.cacheMisses++;
    this.ttlManager.recordMiss('singleChannel');

    // 
    const lockKey = `channel:${id}`;
    if (this.cacheLocks.has(lockKey)) {
      logger.debug({ channelId: id }, '🔒 Cache query already in progress');
      // 
      // 
    }

    // 
    this.cacheLocks.set(lockKey, Promise.resolve);

    try {
      const queryStart = Date.now;
      const query = this.db.prepare('SELECT * FROM channels WHERE id = ?');
      const row = query.get(id) as ChannelRow | undefined;
      const queryDuration = Date.now - queryStart;

      // 
      this.queryCount++;
      this.totalQueryTime += queryDuration;

      const channel = row ? this.mapChannelRow(row) : null;

      // 
      if (channel) {
        this.singleChannelCache.set(id, {
          data: channel,
          timestamp: Date.now,
        });
      }

      return channel;
    } finally {
      // 
      this.cacheLocks.delete(lockKey);
    }
  }

  getChannels: Channel {
    //  TTL
    const ttl = this.ttlManager.getTTL('channels');

    // 
    const cached = this.channelCache.get('all');
    if (cached && Date.now - cached.timestamp < ttl) {
      this.ttlManager.recordHit('channels');
      return cached.data;
    }

    this.ttlManager.recordMiss('channels');

    const query = this.db.query('SELECT * FROM channels ORDER BY priority DESC, name ASC');
    const rows = query.all as ChannelRow;
    const channels = rows.map((row) => this.mapChannelRow(row));

    // 
    this.channelCache.set('all', {
      data: channels,
      timestamp: Date.now,
    });

    return channels;
  }

  getEnabledChannels: Channel {
    //  TTL
    const ttl = this.ttlManager.getTTL('enabledChannels');

    // 
    const cached = this.channelCache.get('enabled');
    if (cached && Date.now - cached.timestamp < ttl) {
      this.ttlManager.recordHit('enabledChannels');
      return cached.data;
    }

    this.ttlManager.recordMiss('enabledChannels');

    const query = this.db.query(
      SELECT * FROM channels WHERE status = 'enabled' ORDER BY priority DESC, name ASC
    );
    const rows = query.all as ChannelRow;
    const channels = rows.map((row) => this.mapChannelRow(row));

    // 
    this.channelCache.set('enabled', {
      data: channels,
      timestamp: Date.now,
    });

    return channels;
  }

  updateChannel(id: string, input: UpdateChannelInput): Channel {
    const updates: string = ;
    const values: any = ;

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.apiKey !== undefined) {
      updates.push('api_key = ?');

      //  API 
      if (input.apiKey) {
        try {
          const encryption = getEncryptionService;
          const encryptedApiKey = encryption.encrypt(input.apiKey);
          values.push(encryptedApiKey);
          logger.debug({
            channelId: id,
          }, '🔐 API key encrypted for channel update');
        } catch (error) {
          logger.error({
            error: error instanceof Error ? error.message : 'Unknown error',
            channelId: id,
          }, '❌ Failed to encrypt API key');
          throw new Error('Failed to encrypt API key');
        }
      } else {
        values.push(null);
      }
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
    values.push(Date.now);

    values.push(id);

    const query = this.db.prepare(`UPDATE channels SET ${updates.join(', ')} WHERE id = ?`);
    query.run(...values);

    // 
    this.invalidateChannelCache;

    return this.getChannel(id)!;
  }

  deleteChannel(id: string): boolean {
    const query = this.db.prepare('DELETE FROM channels WHERE id = ?');
    const result = query.run(id);

    // 
    if (result.changes > 0) {
      this.invalidateChannelCache;
    }

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
    query.run(success ? 1 : 0, success ? 0 : 1, Date.now, id);
  }

  // ============================================================================
  // 
  // ============================================================================

  private readonly BATCH_SIZE = 500; //  100 
  private readonly FLUSH_INTERVAL = 1000; //  100ms 

  /**
   * 
   */
  logRequest(log: Omit<RequestLog, 'id'>) {
    this.requestBuffer.push({
      id: crypto.randomUUID,
      ...log,
    });

    // 
    if (this.requestBuffer.length >= this.BATCH_SIZE) {
      this.flushRequests;
    }
  }

  /**
   * 
   */
  private flushRequests {
    if (this.requestBuffer.length === 0) return;

    const query = this.db.prepare(`
      INSERT INTO requests (
        id, channel_id, model, method, path, status_code, latency,
        input_tokens, output_tokens, cached_tokens, success, error, timestamp, trace_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction( => {
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
          log.traceId || null,
        );
      }
    });

    transaction;
    this.requestBuffer = ;
  }

  /**
   * 
   */
  private startBufferFlush {
    this.flushInterval = setInterval( => {
      this.flushRequests;
    }, this.FLUSH_INTERVAL); //  1000ms1 
  }

  getRequests(limit = 100, offset = 0): RequestLog {
    const query = this.db.query(`
      SELECT * FROM requests
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);
    const rows = query.all(limit, offset) as RequestRow;
    return rows.map((row) => this.mapRequestRow(row));
  }

  getRequestsByChannel(channelId: string, limit = 100): RequestLog {
    const query = this.db.query(`
      SELECT * FROM requests
      WHERE channel_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = query.all(channelId, limit) as RequestRow;
    return rows.map((row) => this.mapRequestRow(row));
  }

  /**
   * 
   */
  getRequestsFiltered(filters: {
    status?: number;
    channelId?: string;
    model?: string;
    q?: string; // search in path
    since?: number; // timestamp >= since
    until?: number; // timestamp <= until
    limit?: number;
    offset?: number;
  }): { rows: RequestLog; total: number } {
    let where = 'WHERE 1=1';
    const params: any = ;

    if (typeof filters.status === 'number') {
      where += ' AND status_code = ?';
      params.push(filters.status);
    }
    if (filters.channelId) {
      where += ' AND channel_id = ?';
      params.push(filters.channelId);
    }
    if (filters.model) {
      where += ' AND model LIKE ?';
      params.push(`%${filters.model}%`);
    }
    if (filters.q) {
      where += ' AND path LIKE ?';
      params.push(`%${filters.q}%`);
    }
    if (typeof filters.since === 'number') {
      where += ' AND timestamp >= ?';
      params.push(filters.since);
    }
    if (typeof filters.until === 'number') {
      where += ' AND timestamp <= ?';
      params.push(filters.until);
    }

    const limit = typeof filters.limit === 'number' ? filters.limit : 100;
    const offset = typeof filters.offset === 'number' ? filters.offset : 0;

    // 
    const countStmt = this.db.query(`SELECT COUNT(*) as count FROM requests ${where}`);
    const countRow = countStmt.get(...params) as CountRow | undefined;
    const total = countRow?.count ?? 0;

    // 
    const dataStmt = this.db.query(
      `SELECT * FROM requests ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
    );
    const rows = dataStmt.all(...params, limit, offset) as RequestRow;
    return { rows: rows.map((r) => this.mapRequestRow(r)), total };
  }

  // ============================================================================
  // 
  // ============================================================================

  getAnalytics: Analytics {
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

    const result = query.get as AnalyticsRow | undefined;

    if (!result) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCachedTokens: 0,
        estimatedCost: 0,
      };
    }

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
    // 
    const inputCost = (inputTokens / 1_000_000) * 3.0; //  token 3 
    const outputCost = (outputTokens / 1_000_000) * 15.0; //  token 15 
    const cacheCost = (cachedTokens / 1_000_000) * 0.3; //  token 0.3 
    return inputCost + outputCost + cacheCost;
  }

  // ============================================================================
  // 
  // ============================================================================

  private mapChannelRow(row: ChannelRow): Channel {
    //  API 
    let decryptedApiKey: string | undefined;
    if (row.api_key) {
      try {
        decryptedApiKey = getApiKey(row.api_key);
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
          channelId: row.id,
        }, '❌ Failed to decrypt API key, using encrypted value');
        // 
        decryptedApiKey = row.api_key;
      }
    }

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      baseUrl: row.base_url || undefined,
      apiKey: decryptedApiKey,
      refreshToken: row.refresh_token || null,
      models: JSON.parse(row.models),
      priority: row.priority,
      weight: row.weight,
      status: row.status,
      requestCount: row.request_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      consecutiveFailures: row.consecutive_failures || 0,
      lastFailureTime: row.last_failure_time || null,
      circuitBreakerUntil: row.circuit_breaker_until || null,
      rateLimitedUntil: row.rate_limited_until || null,
      lastUsedAt: row.last_used_at || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      transformers: row.transformers ? JSON.parse(row.transformers) : undefined,
    };
  }

  private mapRequestRow(row: RequestRow): RequestLog {
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
      traceId: row.trace_id || undefined,
    };
  }

  /**
   * 
   */
  close {
    //  TTL 
    this.ttlManager.stop;

    // 
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }

    // 
    this.flushRequests;

    // 
    this.channelCache.clear;
    this.singleChannelCache.clear;
    this.routingRuleCache = null;

    // 
    this.cacheLocks.clear;

    // 
    this.requestBuffer = ;

    // 
    this.db.close;

    logger.info('✅ Database connection closed and resources cleaned up');
  }

  // ============================================================================
  // 
  // ============================================================================

  /**
   * 
   */
  private invalidateChannelCache {
    this.channelCache.clear;
    this.singleChannelCache.clear;
  }

  /**
   * 
   */
  private startCacheCleanup {
    // 
    this.cacheCleanupInterval = setInterval( => {
      this.cleanupExpiredCache;
    }, 60 * 1000);
  }

  /**
   * 
   */
  private cleanupExpiredCache {
    const now = Date.now;
    let cleaned = 0;

    // 
    for (const [key, entry] of this.channelCache.entries) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.channelCache.delete(key);
        cleaned++;
      }
    }

    for (const [key, entry] of this.singleChannelCache.entries) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.singleChannelCache.delete(key);
        cleaned++;
      }
    }

    // 
    if (this.routingRuleCache && now - this.routingRuleCache.timestamp > this.CACHE_TTL) {
      this.routingRuleCache = null;
      cleaned++;
    }

    if (cleaned > 0) {
      logger.debug({
        cleaned,
        channelCacheSize: this.channelCache.size,
        singleChannelCacheSize: this.singleChannelCache.size,
      }, `🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * 
   */
  getCacheStats {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;
    const avgQueryTime = this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0;

    return {
      cacheTTL: this.CACHE_TTL,
      performance: {
        cacheHits: this.cacheHits,
        cacheMisses: this.cacheMisses,
        totalRequests,
        hitRate: hitRate.toFixed(2) + '%',
        queryCount: this.queryCount,
        avgQueryTime: avgQueryTime.toFixed(2) + 'ms',
        totalQueryTime: this.totalQueryTime,
      },
      channelCache: {
        size: this.channelCache.size,
        entries: Array.from(this.channelCache.keys),
      },
      singleChannelCache: {
        size: this.singleChannelCache.size,
      },
      routingRuleCache: {
        cached: this.routingRuleCache !== null,
      },
      dynamicTTL: this.ttlManager.getStats,
    };
  }

  /**
   * 
   */
  resetPerformanceMetrics {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.queryCount = 0;
    this.totalQueryTime = 0;
    logger.info('📊 Database performance metrics reset');
  }

  /**
   * 
   */
  clearAllCaches {
    this.invalidateChannelCache;
    this.routingRuleCache = null;
    logger.info('✅ All caches cleared');
  }

  // ============================================================================
  // 
  // ============================================================================

  createRoutingRule(input: CreateRoutingRuleInput): RoutingRule {
    const id = crypto.randomUUID;
    const now = Date.now;

    const query = this.db.prepare(`
      INSERT INTO routing_rules (
        id, name, type, condition, target_channel, target_model, priority, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    query.run(
      id,
      input.name,
      input.type,
      JSON.stringify(input.condition),
      input.targetChannel,
      input.targetModel || null,
      input.priority || 50,
      now,
      now
    );

    return this.getRoutingRule(id)!;
  }

  getRoutingRule(id: string): RoutingRule | null {
    const query = this.db.prepare('SELECT * FROM routing_rules WHERE id = ?');
    const row = query.get(id) as RoutingRuleRow | undefined;
    return row ? this.mapRoutingRuleRow(row) : null;
  }

  getRoutingRules: RoutingRule {
    const query = this.db.query('SELECT * FROM routing_rules ORDER BY priority DESC, name ASC');
    const rows = query.all as RoutingRuleRow;
    return rows.map(row => this.mapRoutingRuleRow(row));
  }

  getEnabledRoutingRules: RoutingRule {
    //  TTL
    const ttl = this.ttlManager.getTTL('routingRules');

    // 
    if (this.routingRuleCache && Date.now - this.routingRuleCache.timestamp < ttl) {
      this.ttlManager.recordHit('routingRules');
      return this.routingRuleCache.data;
    }

    this.ttlManager.recordMiss('routingRules');

    const query = this.db.query(
      'SELECT * FROM routing_rules WHERE enabled = 1 ORDER BY priority DESC, name ASC'
    );
    const rows = query.all as RoutingRuleRow;
    const rules = rows.map(row => this.mapRoutingRuleRow(row));

    // 
    this.routingRuleCache = {
      data: rules,
      timestamp: Date.now,
    };

    return rules;
  }

  updateRoutingRule(id: string, input: UpdateRoutingRuleInput): RoutingRule {
    const updates: string = ;
    const values: any = ;

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.condition !== undefined) {
      updates.push('condition = ?');
      values.push(JSON.stringify(input.condition));
    }
    if (input.targetChannel !== undefined) {
      updates.push('target_channel = ?');
      values.push(input.targetChannel);
    }
    if (input.targetModel !== undefined) {
      updates.push('target_model = ?');
      values.push(input.targetModel);
    }
    if (input.priority !== undefined) {
      updates.push('priority = ?');
      values.push(input.priority);
    }
    if (input.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(input.enabled ? 1 : 0);
    }

    updates.push('updated_at = ?');
    values.push(Date.now);
    values.push(id);

    const query = this.db.prepare(`UPDATE routing_rules SET ${updates.join(', ')} WHERE id = ?`);
    query.run(...values);

    // 
    this.routingRuleCache = null;

    return this.getRoutingRule(id)!;
  }

  deleteRoutingRule(id: string): boolean {
    const query = this.db.prepare('DELETE FROM routing_rules WHERE id = ?');
    const result = query.run(id);

    // 
    if (result.changes > 0) {
      this.routingRuleCache = null;
    }

    return result.changes > 0;
  }

  private mapRoutingRuleRow(row: RoutingRuleRow): RoutingRule {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      condition: JSON.parse(row.condition),
      targetChannel: row.target_channel,
      targetModel: row.target_model || undefined,
      priority: row.priority,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * 
   */
  isConnected: boolean {
    try {
      this.db.query('SELECT 1').get;
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Tee 
  // ============================================================================

  createTeeDestination(input: CreateTeeDestinationInput): TeeDestination {
    const id = crypto.randomUUID;
    const now = Date.now;

    const query = this.db.prepare(`
      INSERT INTO tee_destinations (
        id, name, type, enabled, url, headers, method, file_path, custom_handler, filter, retries, timeout, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    query.run(
      id,
      input.name,
      input.type,
      input.enabled !== false ? 1 : 0,
      input.url || null,
      input.headers ? JSON.stringify(input.headers) : null,
      input.method || null,
      input.filePath || null,
      input.customHandler || null,
      input.filter ? JSON.stringify(input.filter) : null,
      input.retries ?? 3,
      input.timeout ?? 5000,
      now,
      now
    );

    return this.getTeeDestination(id)!;
  }

  getTeeDestination(id: string): TeeDestination | null {
    const query = this.db.prepare('SELECT * FROM tee_destinations WHERE id = ?');
    const row = query.get(id) as TeeDestinationRow | undefined;
    return row ? this.mapTeeDestinationRow(row) : null;
  }

  getTeeDestinations: TeeDestination {
    const query = this.db.query('SELECT * FROM tee_destinations ORDER BY name ASC');
    const rows = query.all as TeeDestinationRow;
    return rows.map(row => this.mapTeeDestinationRow(row));
  }

  getEnabledTeeDestinations: TeeDestination {
    const query = this.db.query('SELECT * FROM tee_destinations WHERE enabled = 1 ORDER BY name ASC');
    const rows = query.all as TeeDestinationRow;
    return rows.map(row => this.mapTeeDestinationRow(row));
  }

  updateTeeDestination(id: string, input: UpdateTeeDestinationInput): TeeDestination {
    const updates: string = ;
    const values: any = ;

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(input.enabled ? 1 : 0);
    }
    if (input.url !== undefined) {
      updates.push('url = ?');
      values.push(input.url);
    }
    if (input.headers !== undefined) {
      updates.push('headers = ?');
      values.push(JSON.stringify(input.headers));
    }
    if (input.method !== undefined) {
      updates.push('method = ?');
      values.push(input.method);
    }
    if (input.filePath !== undefined) {
      updates.push('file_path = ?');
      values.push(input.filePath);
    }
    if (input.customHandler !== undefined) {
      updates.push('custom_handler = ?');
      values.push(input.customHandler);
    }
    if (input.filter !== undefined) {
      updates.push('filter = ?');
      values.push(JSON.stringify(input.filter));
    }
    if (input.retries !== undefined) {
      updates.push('retries = ?');
      values.push(input.retries);
    }
    if (input.timeout !== undefined) {
      updates.push('timeout = ?');
      values.push(input.timeout);
    }

    updates.push('updated_at = ?');
    values.push(Date.now);
    values.push(id);

    const query = this.db.prepare(`UPDATE tee_destinations SET ${updates.join(', ')} WHERE id = ?`);
    query.run(...values);

    return this.getTeeDestination(id)!;
  }

  deleteTeeDestination(id: string): boolean {
    const query = this.db.prepare('DELETE FROM tee_destinations WHERE id = ?');
    const result = query.run(id);
    return result.changes > 0;
  }

  private mapTeeDestinationRow(row: TeeDestinationRow): TeeDestination {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      enabled: row.enabled === 1,
      url: row.url || undefined,
      headers: row.headers ? JSON.parse(row.headers) : undefined,
      method: row.method || undefined,
      filePath: row.file_path || undefined,
      customHandler: row.custom_handler || undefined,
      filter: row.filter ? JSON.parse(row.filter) : undefined,
      retries: row.retries,
      timeout: row.timeout,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ============================================================================
  // OAuth 
  // ============================================================================

  createOAuthSession(session: any): void {
    const query = this.db.prepare(`
      INSERT INTO oauth_sessions (
        id, channel_id, provider, access_token, refresh_token,
        expires_at, scopes, user_info, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    query.run(
      session.id,
      session.channelId || null,
      session.provider,
      session.accessToken,
      session.refreshToken || null,
      session.expiresAt,
      JSON.stringify(session.scopes),
      session.userInfo ? JSON.stringify(session.userInfo) : null,
      session.createdAt,
      session.updatedAt
    );
  }

  getOAuthSessions: any {
    const query = this.db.prepare('SELECT * FROM oauth_sessions ORDER BY created_at DESC');
    const rows = query.all as OAuthSessionRow;
    return rows.map(row => ({
      id: row.id,
      channelId: row.channel_id,
      provider: row.provider,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      scopes: JSON.parse(row.scopes),
      userInfo: row.user_info ? JSON.parse(row.user_info) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  getOAuthSession(id: string): any | undefined {
    const query = this.db.prepare('SELECT * FROM oauth_sessions WHERE id = ?');
    const row = query.get(id) as OAuthSessionRow | undefined;

    if (!row) return undefined;

    return {
      id: row.id,
      channelId: row.channel_id,
      provider: row.provider,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      scopes: JSON.parse(row.scopes),
      userInfo: row.user_info ? JSON.parse(row.user_info) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  updateOAuthSession(id: string, session: any): void {
    const query = this.db.prepare(`
      UPDATE oauth_sessions
      SET
        channel_id = ?,
        access_token = ?,
        refresh_token = ?,
        expires_at = ?,
        scopes = ?,
        user_info = ?,
        updated_at = ?
      WHERE id = ?
    `);

    query.run(
      session.channelId || null,
      session.accessToken,
      session.refreshToken || null,
      session.expiresAt,
      JSON.stringify(session.scopes),
      session.userInfo ? JSON.stringify(session.userInfo) : null,
      session.updatedAt,
      id
    );
  }

  deleteOAuthSession(id: string): boolean {
    const query = this.db.prepare('DELETE FROM oauth_sessions WHERE id = ?');
    const result = query.run(id);
    return result.changes > 0;
  }

  // ============================================================================
  //  TTL 
  // ============================================================================

  /**
   *  TTL 
   */
  getDynamicTTLStats {
    return this.ttlManager.getStats;
  }

  /**
   *  TTL 
   */
  adjustTTL(cacheType: CacheType): number {
    return this.ttlManager.adjustTTL(cacheType);
  }

  /**
   *  TTL
   */
  setTTL(cacheType: CacheType, ttl: number) {
    this.ttlManager.setTTL(cacheType, ttl);
  }

  /**
   *  TTL 
   */
  resetTTLStats(cacheType?: CacheType) {
    this.ttlManager.resetStats(cacheType);
  }

  /**
   *  TTL 
   */
  updateTTLConfig(config: {
    minTTL?: number;
    maxTTL?: number;
    targetHitRate?: number;
    adjustmentInterval?: number;
  }) {
    this.ttlManager.updateConfig(config);
  }

  /**
   *  TTL 
   */
  getTTLConfig {
    return this.ttlManager.getConfig;
  }
}
