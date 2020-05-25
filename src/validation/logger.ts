import * as t from 'io-ts';
import { Override } from '../utils';

type LogLevel = 'debug' | 'info' | 'log' | 'warn' | 'error';

type LoggerMeta = {
  timestamp?: unknown;
  [key: string]: unknown;
}

type Logger = {
  write: (logLevel: LogLevel, message: string, meta?: LoggerMeta) => void;
};

type LoggerValidated = Override<Logger, {
  write: Function;
}>;

const LoggerIO: t.Type<LoggerValidated> = t.type({ write: t.Function }, 'Logger');

export {
  LogLevel,
  LoggerMeta,
  Logger,
  LoggerIO,
};
