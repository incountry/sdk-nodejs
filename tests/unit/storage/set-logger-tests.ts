import * as chai from 'chai';
import { Storage, createStorage } from '../../../src/storage';
import { InputValidationError } from '../../../src/errors';

const { expect } = chai;

describe('Storage', () => {
  describe('interface methods', () => {
    describe('setLogger', () => {
      let storage: Storage;

      beforeEach(async () => {
        storage = await createStorage({
          apiKey: 'apiKey',
          environmentId: 'envId',
          encrypt: false,
        });
      });

      it('should throw an error if called with falsy argument', () => {
        [null, undefined, false].forEach((logger) => {
        // @ts-ignore
          expect(() => storage.setLogger(logger))
            .to.throw(InputValidationError, 'setLogger() Validation Error: <Logger> should be { write: Function }');
        });
      });

      it('should throw an error if provided logger is not object or has no "write" method', () => {
        const wrongLoggers = [42, () => null];
        wrongLoggers.forEach((logger) => {
        // @ts-ignore
          expect(() => storage.setLogger(logger))
            .to.throw(InputValidationError, 'setLogger() Validation Error: <Logger> should be { write: Function }');
        });
      });

      it('should throw an error if provided logger\'s "write" method is not a function', () => {
        const wrongLoggers = [{}, { write: 'write' }, { write: {} }];
        wrongLoggers.forEach((logger) => {
        // @ts-ignore
          expect(() => storage.setLogger(logger))
            .to.throw(InputValidationError, 'setLogger() Validation Error: <Logger>.write should be Function');
        });
      });
    });
  });
});
