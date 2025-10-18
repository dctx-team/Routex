/**
 * Main server entry point for Routex
 * Routex
 */

import { serve } from 'bun';
import { Database } from './db/database';
import { LoadBalancer } from './core/loadbalancer';
import { ProxyEngine } from './core/proxy';
import { CacheWarmer } from './core/cache-warmer';
import { createAPI } from './api/routes';
import { ConfigManager } from './config/config';
import { SmartRouter } from './core/routing/smart-router';
import { createTransformerManager } from './transformers';
import { logger, logStartup, logShutdown, log } from './utils/logger';
import { metrics } from './core/metrics';
import { i18n, t } from './i18n';
import { en, zhCN } from './i18n/locales';

async function main() {
  //// Initialize i18n
  i18n.addTranslations('en', en);
  i18n.addTranslations('zh-CN', zhCN);

  //// Load configuration
  const configManager = ConfigManager.getInstance();
  const config = configManager.getConfig();

  //// Set locale from config
  i18n.setLocale(config.i18n.locale);

  log.info(t('server.starting'));

  //// Initialize database
  log.info(t('init.database'));
  const db = new Database(config.database.path);

  //// Initialize load balancer
  log.info(t('init.loadBalancer'));
  const loadBalancer = new LoadBalancer(config.strategy);

  //// Initialize SmartRouter
  log.info(t('init.smartRouter'));
  const routingRules = db.getEnabledRoutingRules();
  const smartRouter = new SmartRouter(routingRules);

  //// Initialize TransformerManager / Transformer
  log.info(t('init.transformers'));
  const transformerManager = createTransformerManager();

  //// Initialize proxy engine
  log.info(t('init.proxy'));
  const proxy = new ProxyEngine(db, loadBalancer, smartRouter, transformerManager);

  //// Initialize cache warmer
  log.info('🔥 Initializing cache warmer...');
  const cacheWarmer = new CacheWarmer(db, loadBalancer);

  // Create API
  log.info(t('init.routes'));
  const app = createAPI(db, proxy, loadBalancer, smartRouter, transformerManager, cacheWarmer);

  //// Start server
  const server = serve({
    port: config.server.port,
    hostname: config.server.host,
    fetch: app.fetch,
  });

  // Log startup info
  logStartup({
    port: config.server.port,
    version: '1.1.0-beta',
    channels: db.getChannels().length,
    strategy: config.strategy,
  });

  logger.info({
    urls: {
      server: `http://${config.server.host}:${config.server.port}`,
      dashboard: `http://${config.server.host}:${config.server.port}/dashboard`,
      api: `http://${config.server.host}:${config.server.port}/api`,
      health: `http://${config.server.host}:${config.server.port}/health`,
      proxy: `http://${config.server.host}:${config.server.port}/v1/messages`,
    },
    loadBalancer: {
      strategy: config.strategy,
    },
    routing: {
      rules: routingRules.length,
    },
    transformers: {
      available: transformerManager.list().length,
    },
  }, t('server.running'));

  //// Check if first run
  if (configManager.isFirstRun()) {
    log.info(t('server.firstRun'));
    logger.info({
      gettingStarted: {
        step1: `POST http://${config.server.host}:${config.server.port}/api/channels`,
        step2: 'https://github.com/dctx-team/Routex/blob/main/docs/api.md',
      },
    }, t('gettingStarted.title'));

    configManager.markFirstRunComplete();
  }

  //// Display channel stats
  const channels = db.getChannels();
  const enabledChannels = channels.filter((ch) => ch.status === 'enabled');

  //// Initialize channel metrics
  metrics.setGauge('routex_channels_total', channels.length);
  metrics.setGauge('routex_channels_enabled', enabledChannels.length);

  logger.info({
    channels: {
      total: channels.length,
      enabled: enabledChannels.length,
      disabled: channels.length - enabledChannels.length,
    },
  }, t('analytics.channelStats'));

  if (enabledChannels.length === 0) {
    log.warn(t('server.noChannels'));
  }

  //// Start cache warmer
  await cacheWarmer.start();

  //// Graceful shutdown
  const shutdown = async () => {
    logShutdown(t('server.shutdown'));

    //// Stop cache warmer
    await cacheWarmer.stop();

    //// Shutdown proxy engine (flushes tee stream)
    await proxy.shutdown();

    db.close();
    server.stop();

    log.info(t('server.shutdownComplete'));
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

//// Start server
main().catch((error) => {
  logger.fatal({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  }, '❌ Failed to start Routex');
  process.exit(1);
});
