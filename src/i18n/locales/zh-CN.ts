/**
 * Chinese (Simplified) translations
 */

import type { Translations } from './en';

export const zhCN: Translations = {
  // 服务器
  server: {
    starting: '🎯 正在启动 Routex...',
    running: '✅ Routex 正在运行！',
    shutdown: '🛑 正在关闭 Routex...',
    shutdownComplete: '✅ 关闭完成',
    firstRun: '👋 欢迎使用 Routex！这是您第一次运行。',
    noChannels: '⚠️  未找到已启用的渠道！请添加渠道以开始路由请求。',
  },

  // 初始化
  init: {
    database: '📦 正在初始化数据库...',
    loadBalancer: '⚖️  正在初始化负载均衡器...',
    smartRouter: '🧠 正在初始化智能路由器...',
    transformers: '🔄 正在初始化转换器管理器...',
    proxy: '🔀 正在初始化代理引擎...',
    routes: '🛣️  正在设置路由...',
    teeStream: '📤 Tee Stream 已初始化，包含 {{count}} 个目标',
    teeStreamUpdated: '📤 Tee Stream 目标已更新：{{count}} 个活跃',
  },

  // 渠道
  channel: {
    created: '渠道已创建',
    updated: '渠道已更新',
    deleted: '渠道已删除',
    notFound: '未找到渠道 {{id}}',
    enabled: '渠道已启用',
    disabled: '渠道已禁用',
    testing: '正在测试渠道 {{name}}...',
    testSuccess: '渠道 {{name}} 测试通过',
    testFailed: '渠道 {{name}} 测试失败',
  },

  // 路由
  routing: {
    smartRouter: '🧠 智能路由器匹配规则：{{rule}} → {{channel}}',
    loadBalancer: '⚖️  负载均衡器选择：{{channel}}',
    noAvailableChannel: '没有可用的渠道',
    retry: '⚠️  使用不同渠道重试：{{channel}}',
  },

  // 熔断器
  circuitBreaker: {
    opened: '🔴 渠道 {{channel}} 的熔断器已打开',
    reset: '🟢 渠道 {{channel}} 的熔断器已重置',
  },

  // 转换器
  transformer: {
    pipeline: '转换器流水线：{{count}} 个转换器',
    applied: '转换器 {{name}} 已应用',
    error: '转换器 {{name}} 错误',
  },

  // Tee Stream
  tee: {
    queued: '📤 Tee 已排队：{{count}} 项',
    processing: '📤 正在处理 tee 批次：{{size}} 项',
    sent: '✅ Tee 发送成功：{{destination}}',
    retry: '⚠️  Tee 重试 {{attempt}}/{{max}}：{{destination}}',
    flushing: '📤 正在刷新 tee 队列...',
    shutdown: '📤 Tee Stream 关闭完成',
  },

  // 请求
  request: {
    succeeded: '✅ 请求成功：{{channel}} ({{latency}}ms)',
    failed: '❌ 请求失败',
    forwarding: '📡 转发到 {{provider}}',
  },

  // 分析
  analytics: {
    channelStats: '📡 渠道统计',
    totalChannels: '总渠道数：{{total}}',
    enabledChannels: '已启用渠道：{{enabled}}',
    disabledChannels: '已禁用渠道：{{disabled}}',
  },

  // 错误
  error: {
    validation: '验证错误',
    notFound: '未找到',
    channelError: '渠道错误',
    transformerError: '转换器错误',
    circuitBreakerOpen: '熔断器已打开',
    noAvailableChannel: '没有可用的渠道',
    maxRetriesExceeded: '超过最大重试次数',
    unknown: '未知错误',
  },

  // API
  api: {
    invalidFormat: '无效格式',
    missingFields: '缺少必填字段：{{fields}}',
    invalidStrategy: '无效策略',
    channelDeleted: '渠道已删除',
    teeDestinationDeleted: 'Tee 目标已删除',
    metricsReset: '指标已重置',
  },

  // 健康检查
  health: {
    healthy: '健康',
    degraded: '降级',
    alive: '存活',
    ready: '就绪',
    notReady: '未就绪',
    noChannelsConfigured: '未配置渠道',
    noEnabledChannels: '没有可用的已启用渠道',
  },

  // 入门指南
  gettingStarted: {
    title: '📖 入门指南',
    step1: '创建您的第一个渠道',
    step2: '阅读 API 文档',
  },
};
