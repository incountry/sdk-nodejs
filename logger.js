module.exports = {
    withBaseLogLevel: function(baseLogLevel) {
        var filterLevels = {
            "debug": 0,
            "info": 1,
            "log": 2,
            "warn": 3,
            "error": 4
        };

        var baseLevel = filterLevels[baseLogLevel];

        var write = function(logLevel, message, id, timeStamp) {
            if (filterLevels[logLevel] >= baseLevel) {
                let logEntry = {
                    message: message,
                    id: id,
                    timeStamp: timeStamp || (new Date()).toISOString()
                };
                console[logLevel](logEntry);
                return true;
            }

            return false;
        };

        return {
            write: write,
            trace: function(id) {
                return {
                    withPrefix: function(prefix) {
                        return {
                            debug: (message) => write("debug", `${prefix}${message}`, id),
                            info: (message) => write("info", `${prefix}${message}`, id),
                            log: (message) => write("log", `${prefix}${message}`, id),
                            warn: (message) => write("warn", `${prefix}${message}`, id),
                            error: (message) => write("error", `${prefix}${message}`, id)
                        }
                    }
                }
            }
        }
    }
}