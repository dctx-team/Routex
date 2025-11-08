#!/usr/bin/env bun
/**
 * 数据迁移脚本：加密现有的明文 API 密钥
 * Data Migration Script: Encrypt Existing Plaintext API Keys
 *
 * 使用方法 (Usage):
 * bun run scripts/migrate-encrypt-keys.ts [--dry-run] [--db-path <path>]
 *
 * 选项 (Options):
 * --dry-run      仅显示将被加密的密钥，不实际修改数据库
 * --db-path      指定数据库文件路径（默认: ./data/routex.db）
 * --force        强制重新加密所有密钥（包括已加密的）
 */

import { Database as BunSQLite } from 'bun:sqlite';
import { getEncryptionService, isEncrypted } from '../src/utils/encryption';
import { logger } from '../src/utils/logger';

// ============================================================================
// 命令行参数解析
// ============================================================================

const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  force: args.includes('--force'),
  dbPath: (() => {
    const dbPathIndex = args.indexOf('--db-path');
    if (dbPathIndex >= 0 && args[dbPathIndex + 1]) {
      return args[dbPathIndex + 1];
    }
    return process.env.DATABASE_PATH || './data/routex.db';
  })(),
};

// ============================================================================
// 主要迁移逻辑
// ============================================================================

interface ChannelRow {
  id: string;
  name: string;
  api_key: string | null;
  refresh_token: string | null;
}

async function migrateEncryptKeys() {
  logger.info('🔐 Starting API key encryption migration...');
  logger.info(`Database path: ${options.dbPath}`);
  logger.info(`Dry run mode: ${options.dryRun ? 'YES' : 'NO'}`);
  logger.info(`Force re-encrypt: ${options.force ? 'YES' : 'NO'}`);

  // 连接数据库
  const db = new BunSQLite(options.dbPath);

  try {
    // 检查数据库连接
    db.query('SELECT 1').get();
    logger.info('✅ Database connection successful');
  } catch (error) {
    logger.error('❌ Failed to connect to database');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // 获取加密服务
  const encryption = getEncryptionService();

  // 查询所有频道
  const query = db.query('SELECT id, name, api_key, refresh_token FROM channels');
  const channels = query.all() as ChannelRow[];

  logger.info(`Found ${channels.length} channels in database`);

  // 统计信息
  const stats = {
    total: channels.length,
    encrypted: 0,
    plaintext: 0,
    skipped: 0,
    migrated: 0,
    errors: 0,
  };

  // 处理每个频道
  for (const channel of channels) {
    const needsEncryption: Array<'api_key' | 'refresh_token'> = [];

    // 检查 API 密钥
    if (channel.api_key) {
      const apiKeyEncrypted = isEncrypted(channel.api_key);

      if (apiKeyEncrypted && !options.force) {
        stats.encrypted++;
        logger.debug({
          channelId: channel.id,
          channelName: channel.name,
        }, '✓ API key already encrypted');
      } else {
        stats.plaintext++;
        needsEncryption.push('api_key');
        logger.info({
          channelId: channel.id,
          channelName: channel.name,
        }, `${options.force ? '🔄' : '🔓'} API key ${options.force ? 'will be re-encrypted' : 'needs encryption'}`);
      }
    }

    // 检查 Refresh Token（如果存在）
    if (channel.refresh_token) {
      const refreshTokenEncrypted = isEncrypted(channel.refresh_token);

      if (refreshTokenEncrypted && !options.force) {
        logger.debug({
          channelId: channel.id,
          channelName: channel.name,
        }, '✓ Refresh token already encrypted');
      } else {
        needsEncryption.push('refresh_token');
        logger.info({
          channelId: channel.id,
          channelName: channel.name,
        }, `${options.force ? '🔄' : '🔓'} Refresh token ${options.force ? 'will be re-encrypted' : 'needs encryption'}`);
      }
    }

    // 如果没有需要加密的内容，跳过
    if (needsEncryption.length === 0) {
      stats.skipped++;
      continue;
    }

    // Dry run 模式：只显示，不实际加密
    if (options.dryRun) {
      logger.info({
        channelId: channel.id,
        channelName: channel.name,
        fields: needsEncryption,
      }, '[DRY RUN] Would encrypt these fields');
      continue;
    }

    // 实际加密
    try {
      const updates: string[] = [];
      const values: any[] = [];

      for (const field of needsEncryption) {
        if (field === 'api_key' && channel.api_key) {
          // 如果是强制模式且已加密，先解密
          let plaintext = channel.api_key;
          if (options.force && isEncrypted(channel.api_key)) {
            try {
              plaintext = encryption.decrypt(channel.api_key);
            } catch (error) {
              logger.warn({
                channelId: channel.id,
                error: error instanceof Error ? error.message : 'Unknown',
              }, 'Failed to decrypt for re-encryption, treating as plaintext');
            }
          }

          const encrypted = encryption.encrypt(plaintext);
          updates.push('api_key = ?');
          values.push(encrypted);
        }

        if (field === 'refresh_token' && channel.refresh_token) {
          // 如果是强制模式且已加密，先解密
          let plaintext = channel.refresh_token;
          if (options.force && isEncrypted(channel.refresh_token)) {
            try {
              plaintext = encryption.decrypt(channel.refresh_token);
            } catch (error) {
              logger.warn({
                channelId: channel.id,
                error: error instanceof Error ? error.message : 'Unknown',
              }, 'Failed to decrypt refresh token for re-encryption, treating as plaintext');
            }
          }

          const encrypted = encryption.encrypt(plaintext);
          updates.push('refresh_token = ?');
          values.push(encrypted);
        }
      }

      if (updates.length > 0) {
        updates.push('updated_at = ?');
        values.push(Date.now());
        values.push(channel.id);

        const updateQuery = db.prepare(
          `UPDATE channels SET ${updates.join(', ')} WHERE id = ?`
        );
        updateQuery.run(...values);

        stats.migrated++;
        logger.info({
          channelId: channel.id,
          channelName: channel.name,
          fields: needsEncryption,
        }, '✅ Successfully encrypted');
      }
    } catch (error) {
      stats.errors++;
      logger.error({
        channelId: channel.id,
        channelName: channel.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, '❌ Failed to encrypt');
    }
  }

  // 关闭数据库连接
  db.close();

  // 打印迁移摘要
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('📊 Migration Summary:');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info(`Total channels:           ${stats.total}`);
  logger.info(`Already encrypted:        ${stats.encrypted}`);
  logger.info(`Plaintext found:          ${stats.plaintext}`);
  logger.info(`Skipped:                  ${stats.skipped}`);
  logger.info(`${options.dryRun ? 'Would migrate:' : 'Migrated:'}           ${options.dryRun ? stats.plaintext : stats.migrated}`);
  logger.info(`Errors:                   ${stats.errors}`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (options.dryRun) {
    logger.info('');
    logger.info('ℹ️  This was a DRY RUN. No changes were made to the database.');
    logger.info('ℹ️  Run without --dry-run flag to perform actual encryption.');
  } else if (stats.migrated > 0) {
    logger.info('');
    logger.info(`✅ Successfully encrypted ${stats.migrated} API key(s)`);
    logger.info('');
    logger.info('⚠️  IMPORTANT: Make sure to backup your database before running this migration in production!');
  } else {
    logger.info('');
    logger.info('✅ No migration needed. All API keys are already encrypted.');
  }

  if (stats.errors > 0) {
    logger.warn('');
    logger.warn(`⚠️  ${stats.errors} error(s) occurred during migration. Check logs above.`);
    process.exit(1);
  }
}

// ============================================================================
// 执行迁移
// ============================================================================

migrateEncryptKeys().catch((error) => {
  logger.error('❌ Migration failed:');
  logger.error(error);
  process.exit(1);
});
