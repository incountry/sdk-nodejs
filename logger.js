
module.exports = {
  withBaseLogLevel(baseLogLevel) {
    const filterLevels = {
      debug: 0,
      info: 1,
      log: 2,
      warn: 3,
      error: 4,
    };

    const baseLevel = filterLevels[baseLogLevel];

    const write = (logLevel, message, id, timestamp) => {
      if (filterLevels[logLevel] >= baseLevel) {
        const logEntry = {
          type: 'application.proxy.app_log',
          time: timestamp || new Date().toISOString(),
          level: logLevel,
          message,
        };
        if (id) {
          logEntry.id = id;
        }
        console.log(`${logEntry.time} [${logEntry.level}] ${logEntry.message}`);
        return true;
      }

      return false;
    };

    const logger = {
      write,
      trace(id) {
        return {
          withPrefix(prefix) {
            return {
              debug: (message, timestamp) => write('debug', `${prefix}${message}`, id, timestamp),
              info: (message, timestamp) => write('info', `${prefix}${message}`, id, timestamp),
              log: (message, timestamp) => write('log', `${prefix}${message}`, id, timestamp),
              warn: (message, timestamp) => write('warn', `${prefix}${message}`, id, timestamp),
              error: (message, timestamp) => write('error', `${prefix}${message}`, id, timestamp),
            };
          },
        };
      },
    };

    return logger;
  },
};
