import pino from 'pino';

// 日志级别配置
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// 创建 logger 实例
export const logger = pino({
  level: LOG_LEVEL,
  transport: IS_PRODUCTION
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV || 'development',
  },
});

// 请求日志器
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

// 组件日志器
export function createComponentLogger(component: string) {
  return logger.child({ component });
}

// 便捷方法
export const log = {
  info: (msg: string, data?: object) => logger.info(data || {}, msg),
  warn: (msg: string, data?: object) => logger.warn(data || {}, msg),
  error: (msg: string, data?: object) => logger.error(data || {}, msg),
  debug: (msg: string, data?: object) => logger.debug(data || {}, msg),
  fatal: (msg: string, data?: object) => logger.fatal(data || {}, msg),
};

// 请求日志中间件
export function logRequest(context: {
  method: string;
  url: string;
  status?: number;
  duration?: number;
  error?: Error;
}) {
  const { method, url, status, duration, error } = context;

  if (error) {
    logger.error(
      {
        method,
        url,
        status,
        duration,
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
      },
      `${method} ${url} - ${status} (${duration}ms)`
    );
  }
}

// 渠道操作日志
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

// 负载均衡日志
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

// Transformer 日志
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

// 错误日志
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

// 系统启动日志
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

// 系统关闭日志
export function logShutdown(reason?: string) {
  logger.info({ reason }, '🛑 Routex shutting down');
}

export default logger;
