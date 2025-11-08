import pino from 'pino';

// 全局日志级别和模块特定覆盖
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const LOG_FORMAT = process.env.LOG_FORMAT || (IS_PRODUCTION ? 'json' : 'pretty');

// 模块特定的日志级别（例如：LOG_LEVEL_DATABASE=debug）
const moduleLogLevels: Record<string, string> = {};

// 从环境变量解析模块特定的日志级别
Object.keys(process.env).forEach((key) => {
  if (key.startsWith('LOG_LEVEL_')) {
    const moduleName = key.replace('LOG_LEVEL_', '').toLowerCase();
    moduleLogLevels[moduleName] = process.env[key] || LOG_LEVEL;
  }
});

// 创建基础 logger 实例
export const logger = pino({
  level: LOG_LEVEL,
  transport:
    LOG_FORMAT === 'pretty'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
      : undefined,
  formatters: {
    level: (label) => {
      // 确保级别标签是字符串，而不是函数引用
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV || 'development',
  },
});

// 创建具有自定义日志级别的模块特定 logger
export function createModuleLogger(moduleName: string) {
  const moduleLevel = moduleLogLevels[moduleName.toLowerCase()] || LOG_LEVEL;

  return logger.child({
    module: moduleName,
    level: moduleLevel
  });
}

// 创建用于请求跟踪的 logger
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

// 旧版组件 logger（已弃用，请改用 createModuleLogger）
export function createComponentLogger(component: string) {
  return createModuleLogger(component);
}

/**
 * 获取当前日志配置
 */
export function getLogConfig() {
  return {
    globalLevel: LOG_LEVEL,
    format: LOG_FORMAT,
    isProduction: IS_PRODUCTION,
    moduleOverrides: moduleLogLevels,
  };
}

/**
 * 动态设置特定模块的日志级别
 * 注意：这仅影响此调用后创建的新 logger 实例
 */
export function setModuleLogLevel(moduleName: string, level: string) {
  moduleLogLevels[moduleName.toLowerCase()] = level;
  logger.info({ module: moduleName, level }, `Log level updated for module: ${moduleName}`);
}

// 辅助函数
export const log = {
  info: (msg: string, data?: object) => logger.info(data || {}, msg),
  warn: (msg: string, data?: object) => logger.warn(data || {}, msg),
  error: (msg: string, data?: object) => logger.error(data || {}, msg),
  debug: (msg: string, data?: object) => logger.debug(data || {}, msg),
  fatal: (msg: string, data?: object) => logger.fatal(data || {}, msg),
};

// 请求日志辅助函数
export function logRequest(context: {
  method: string;
  url: string;
  status?: number;
  duration?: number;
  error?: Error;
  requestId?: string;
}) {
  const { method, url, status, duration, error, requestId } = context;

  if (error) {
    logger.error(
      {
        method,
        url,
        status,
        duration,
        requestId,
        error: {
          message: error.message,
          stack: error.stack,
        },
      },
      `${method} ${url} - ${status} (${duration}ms) - ERROR`
    );
  } else {
    logger.info(
      {
        method,
        url,
        status,
        duration,
        requestId,
      },
      `${method} ${url} - ${status} (${duration}ms)`
    );
  }
}

// 频道操作日志辅助函数
export function logChannelOperation(
  operation: 'create' | 'update' | 'delete' | 'select',
  channelName: string,
  details?: object
) {
  logger.info(
    {
      operation,
      channel: channelName,
      ...details,
    },
    `Channel ${operation}: ${channelName}`
  );
}

// 负载均衡器日志辅助函数
export function logLoadBalancer(
  strategy: string,
  selectedChannel: string,
  details?: object
) {
  logger.debug(
    {
      strategy,
      selectedChannel,
      ...details,
    },
    `Load balancer selected: ${selectedChannel} (strategy: ${strategy})`
  );
}

// 转换器日志辅助函数
export function logTransformer(
  transformerName: string,
  operation: 'request' | 'response',
  details?: object
) {
  logger.debug(
    {
      transformer: transformerName,
      operation,
      ...details,
    },
    `Transformer ${transformerName} applied to ${operation}`
  );
}

// 错误日志辅助函数
export function logError(error: Error, context?: object) {
  logger.error(
    {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    },
    `Error: ${error.message}`
  );
}

// 启动日志辅助函数
export function logStartup(config: {
  port: number;
  version: string;
  channels: number;
  strategy: string;
}) {
  logger.info(
    config,
    `🚀 Routex v${config.version} started on port ${config.port}`
  );
}

// 关闭日志辅助函数
export function logShutdown(reason?: string) {
  logger.info({ reason }, '🛑 Routex shutting down');
}

export default logger;
