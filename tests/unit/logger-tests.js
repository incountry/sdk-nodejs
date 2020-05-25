/* eslint-disable no-unused-expressions */
/* eslint-disable no-unused-vars */
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);
const { expect } = chai;

const Logger = require('../../lib/logger');

describe('logger', () => {
  const message = 'test message';
  const createExpected = (level) => `[${level}] ${message}`;

  const levels = [
    'debug',
    'info',
    'log',
    'warn',
    'error',
  ];

  beforeEach(() => {
    sinon.spy(console, 'log');
  });

  afterEach(() => {
    console.log.restore();
  });

  levels.forEach((baseLogLevel, idx) => {
    context(`with "${baseLogLevel}" log level`, () => {
      const logger = Logger.withBaseLogLevel(baseLogLevel);
      const validLevels = levels.slice(idx);
      const invalidLevels = levels.slice(0, idx);

      invalidLevels.forEach((level) => {
        it(`should not print "${level}" message`, () => {
          logger.write(level, message);
          expect(console.log).to.not.been.called;
        });
      });

      validLevels.forEach((level) => {
        it(`should print "${level}" message`, () => {
          logger.write(level, message);
          const expected = createExpected(level);
          expect(console.log).to.be.calledWithMatch(expected);
        });
      });
    });
  });

  it('should use current time when the timestamp is not specified', () => {
    const level = 'debug';
    const logger = Logger.withBaseLogLevel(level);
    logger.write(level, message);
    expect(console.log).to.be.calledWithMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('should use specified time', () => {
    const level = 'debug';
    const logger = Logger.withBaseLogLevel(level);
    const timestamp = new Date().toISOString();
    logger.write(level, message, { timestamp });
    expect(console.log).to.be.calledWithMatch(timestamp);
  });
});
