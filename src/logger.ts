const DEBUG = 'debug';
const INFO = 'info';
const LOG = 'log';
const WARN = 'warn';
const ERROR = 'error';

const LogLevel = {
  DEBUG,
  INFO,
  LOG,
  WARN,
  ERROR,
};

type LogLevel =
  typeof DEBUG |
  typeof INFO |
  typeof LOG |
  typeof WARN |
  typeof ERROR;

type Logger = {
  write: (logLevel: LogLevel, message: string, meta?: Record<string, unknown>) => void;
};

function withBaseLogLevel(baseLogLevel: LogLevel): Logger {
  const filterLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    log: 2,
    warn: 3,
    error: 4,
  };

  const baseLevel = filterLevels[baseLogLevel];

  type LoggerMeta = {
    timestamp?: unknown;
    [key: string]: unknown;
  }

  const write = (logLevel: LogLevel, message: string, meta?: LoggerMeta): void => {
    if (filterLevels[logLevel] < baseLevel) {
      return;
    }

    const time = meta && typeof meta.timestamp === 'string' ? meta.timestamp : new Date().toISOString();
    console.log(`${time} [${logLevel}] ${message}`);
  };

  const logger = {
    write,
  };

  return logger;
}

export {
  LogLevel,
  Logger,
  withBaseLogLevel,
};
