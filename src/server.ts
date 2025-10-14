/**
 * Main server entry point for Routex
 * Routex 的主服务器入口
 */

import { serve } from 'bun';
import { Database } from './db/database';
import { LoadBalancer } from './core/loadbalancer';
import { ProxyEngine } from './core/proxy';
import { createAPI } from './api/routes';
import { ConfigManager } from './config/config';

async function main() {
  console.log('🎯 Starting Routex...');
  console.log('🎯 启动 Routex...\n');

  // Load configuration / 加载配置
  const configManager = ConfigManager.getInstance();
  const config = configManager.getConfig();

  // Initialize database / 初始化数据库
  console.log('📦 Initializing database...');
  console.log('📦 初始化数据库...');
  const db = new Database(config.database.path);

  // Initialize load balancer / 初始化负载均衡器
  console.log('⚖️  Initializing load balancer...');
  console.log('⚖️  初始化负载均衡器...');
  const loadBalancer = new LoadBalancer(config.strategy);

  // Initialize proxy engine / 初始化代理引擎
  console.log('🔀 Initializing proxy engine...');
  console.log('🔀 初始化代理引擎...');
  const proxy = new ProxyEngine(db, loadBalancer);

  // Create API / 创建 API
  console.log('🛣️  Setting up routes...');
  console.log('🛣️  设置路由...');
  const app = createAPI(db, proxy, loadBalancer);

  // Start server / 启动服务器
  const server = serve({
    port: config.server.port,
    hostname: config.server.host,
    fetch: app.fetch,
  });

  console.log('\n✅ Routex is running! / Routex 正在运行！\n');
  console.log(`🌐 Server: http://${config.server.host}:${config.server.port}`);
  console.log(`📊 API: http://${config.server.host}:${config.server.port}/api`);
  console.log(`🏥 Health: http://${config.server.host}:${config.server.port}/health`);
  console.log(`🔀 Proxy: http://${config.server.host}:${config.server.port}/v1/messages`);
  console.log(`\n⚖️  Load Balance Strategy: ${config.strategy}`);
  console.log(`⚖️  负载均衡策略: ${config.strategy}\n`);

  // Check if first run / 检查是否为首次运行
  if (configManager.isFirstRun()) {
    console.log('👋 Welcome to Routex!');
    console.log('👋 欢迎使用 Routex！\n');
    console.log('💡 This is your first time running Routex.');
    console.log('💡 这是您第一次运行 Routex。\n');
    console.log('📖 To get started:');
    console.log('📖 开始使用：');
    console.log('   1. Create your first channel:');
    console.log('      创建您的第一个渠道：');
    console.log(`      POST http://${config.server.host}:${config.server.port}/api/channels\n`);
    console.log('   2. Check the API documentation:');
    console.log('      查看 API 文档：');
    console.log('      https://github.com/dctx-team/Routex/blob/main/docs/api.md\n');

    configManager.markFirstRunComplete();
  }

  // Display channel stats / 显示渠道统计
  const channels = db.getChannels();
  const enabledChannels = channels.filter((ch) => ch.status === 'enabled');

  console.log(`📡 Total Channels: ${channels.length}`);
  console.log(`📡 渠道总数: ${channels.length}`);
  console.log(`✅ Enabled Channels: ${enabledChannels.length}`);
  console.log(`✅ 启用的渠道: ${enabledChannels.length}\n`);

  if (enabledChannels.length === 0) {
    console.log('⚠️  Warning: No enabled channels found!');
    console.log('⚠️  警告：未找到启用的渠道！');
    console.log('   Add a channel to start routing requests.');
    console.log('   添加渠道以开始路由请求。\n');
  }

  // Graceful shutdown / 优雅关闭
  const shutdown = () => {
    console.log('\n🛑 Shutting down Routex...');
    console.log('🛑 关闭 Routex...');

    db.close();
    server.stop();

    console.log('✅ Shutdown complete');
    console.log('✅ 关闭完成');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Start server / 启动服务器
main().catch((error) => {
  console.error('❌ Failed to start Routex:', error);
  console.error('❌ 启动 Routex 失败:', error);
  process.exit(1);
});
