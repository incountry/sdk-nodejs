/* eslint-disable no-unused-vars */
const { expect } = require('chai');
const sinon = require('sinon');
const Logger = require('../../logger');


describe('logger', () => {
  const timestamp = new Date().toISOString();
  const message = 'test message';
  const prefix = 'testPrefix';
  const createExpected = (level) => `${timestamp} [${level}] ${message}`;
  const createExpectedTrace = (level, id) => `${timestamp} [${level}] ${prefix}${message}`;
  let spy;
  const levels = [
    'debug',
    'info',
    'log',
    'warn',
    'error',
  ];

  beforeEach(() => {
    spy = sinon.spy(console, 'log');
  });

  afterEach(() => {
    console.log.restore();
  });

  levels.forEach((baseLogLevel, idx, array) => {
    context(`with ${baseLogLevel} log level`, () => {
      const logger = Logger.withBaseLogLevel(baseLogLevel);
      const validLevels = levels.slice(idx);
      const invalidLevels = levels.slice(0, idx);
      invalidLevels.forEach((level) => {
        it(`should not print ${level} message`, () => {
          logger.write(level, message, null, timestamp);
          expect(spy.notCalled).equal(true);
        });
        it(`should not print ${level} message from trace`, () => {
          const testTraceWithPrefix = logger.trace('test trace id').withPrefix('testPrefix', timestamp);
          testTraceWithPrefix[level](message, timestamp);
          expect(spy.notCalled).equal(true);
        });
      });
      validLevels.forEach((level) => {
        it(`should print ${level} message`, () => {
          logger.write(level, message, null, timestamp);
          const expected = createExpected(level);
          expect(spy.calledWith(expected)).equal(true);
        });
        it(`should print ${level} message from trace`, () => {
          const expected = createExpectedTrace(level, 'test trace id');
          const testTraceWithPrefix = logger.trace('test trace id').withPrefix(prefix, timestamp);
          testTraceWithPrefix[level](message, timestamp);
          expect(spy.calledWith(expected)).equal(true);
        });
      });
    });
  });
});
