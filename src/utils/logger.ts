import pino from 'pino';

// 
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

//  logger 
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
      return { level: label.toUpperCase };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV || 'development',
  },
});

// 
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

// 
export function createComponentLogger(component: string) {
  return logger.child({ component });
}

// 
export const log = {
  info: (msg: string, data?: object) => logger.info(data || {}, msg),
  warn: (msg: string, data?: object) => logger.warn(data || {}, msg),
  error: (msg: string, data?: object) => logger.error(data || {}, msg),
  debug: (msg: string, data?: object) => logger.debug(data || {}, msg),
  fatal: (msg: string, data?: object) => logger.fatal(data || {}, msg),
};

// 
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

// 
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

// 
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

// Transformer 
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

// 
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

// 
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

// 
export function logShutdown(reason?: string) {
  logger.info({ reason }, '🛑 Routex shutting down');
}

export default logger;
