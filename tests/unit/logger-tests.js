var Logger = require('../../logger');

var expect = require('chai').expect;

describe('Logger', function() {
    context('with a valid base log level', function() {
        [
            "debug",
            "info",
            "log",
            "warn",
            "error"
        ].forEach(function(baseLogLevel, i, array) {
            context(`when logging with a logLevel greater than or equal to base level of ${baseLogLevel}`, function() {
                for (let j = i; j <= 4; j++) {
                    it(`should capture the log on: ${array[j]}`, function() {
                        var testLogger = Logger.withBaseLogLevel(baseLogLevel);
                        var testTraceWithPrefix = testLogger.trace("test trace id").withPrefix(array[j]);

                        var logWritten = testLogger.write(array[j], `test message`);
                        expect(logWritten).to.be.true;

                        var withTraceWritten = testTraceWithPrefix[array[j]](` test message`);
                        expect(withTraceWritten).to.be.true;
                    })    
                }
            })

            context(`when logging with a logLevel less than the base level of ${baseLogLevel}`, function() {
                for (let j = i - 1; j >= 0; j--) {
                    it(`should not capture the log on: ${array[j]}`, function() {
                        var testLogger = Logger.withBaseLogLevel(baseLogLevel);
                        var testTraceWithPrefix = testLogger.trace("test trace id").withPrefix(array[j]);

                        var logWritten = testLogger.write(array[j], ` test message`);
                        expect(logWritten).to.be.false;

                        var withTraceWritten = testTraceWithPrefix[array[j]](` test message`);
                        expect(withTraceWritten).to.be.false;
                    })
                }
            })
        })
    })
});