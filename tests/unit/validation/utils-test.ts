/* eslint-disable prefer-arrow-callback,func-names */
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as t from 'io-ts';
import { left, right, isLeft } from 'fp-ts/lib/Either';
import {
  toStorageClientError,
  toStorageServerError,
  validationToPromise,
  optional,
  isValid,
  chainValidate,
  getErrorMessage,
} from '../../../src/validation/utils';
import {
  StorageClientError,
  StorageServerError,
} from '../../../src/errors';


chai.use(chaiAsPromised);
const { expect, assert } = chai;

describe('Validation Utils', () => {
  describe('toStorageClientError', () => {
    it('should return StorageClientError', () => {
      const validationError = t.string.decode(123);
      expect(toStorageClientError()(validationError)).to.be.instanceOf(StorageClientError);
    });
  });

  describe('toStorageServerError', () => {
    it('should return StorageServerError', () => {
      const validationError = t.string.decode(123);
      expect(toStorageServerError()(validationError)).to.be.instanceOf(StorageServerError);
    });
  });

  describe('validationToPromise', () => {
    it('should return resoled promise', async () => {
      await expect(validationToPromise(t.string.decode(123))).to.be.rejected;
      await expect(validationToPromise(t.string.decode(''))).to.be.fulfilled;
    });
  });

  describe('optional', () => {
    const codec = t.string;

    it('should decode valid value', () => {
      expect(isValid(codec.decode(''))).to.equal(true);
    });
    it('should return error for invalid value', () => {
      expect(isValid(codec.decode(1))).to.equal(false);
    });
    it('should return error for undefined input', () => {
      expect(isValid(codec.decode(undefined))).to.equal(false);
    });

    context('same codec wrapped optional', () => {
      const codecWithDefault = optional(codec);

      it('should decode valid value', () => {
        expect(isValid(codecWithDefault.decode(''))).to.equal(true);
      });
      it('should return error for invalid value', () => {
        expect(isValid(codecWithDefault.decode(1))).to.equal(false);
      });
      it('should decode undefined as a valid value', () => {
        const result = codecWithDefault.decode(undefined);
        if (!isValid(result)) {
          throw assert.fail('codec wrapped withDefault should decode valid');
        }
        expect(result.right).to.equal(undefined);
      });
    });
  });

  describe('chainValidate', () => {
    const codec1 = chainValidate(t.string, (u) => right(u));

    const errorMessage = 'This should be string with length than 10';
    const codec2 = chainValidate(t.string, (u) => u.length > 10 ? right(u) : left(`${errorMessage} but got ${JSON.stringify(u)}`), 'StringMoreThan10');
    const validString = 'aaaaaaaaaaa';

    it('should have original codec error', () => {
      const result = codec1.decode(123);
      expect(isLeft(result)).to.equal(true);
      expect(getErrorMessage(result)).to.equal('<string> should be string but got 123');
    });

    it('should have original codec result', () => {
      expect(codec1.decode('test')).to.deep.equal(right('test'));
    });

    it('should return error for invalid data', () => {
      const result = codec2.decode('aaa');
      expect(isLeft(result)).to.equal(true);
      expect(getErrorMessage(result)).to.include(errorMessage);
    });

    it('should return success for valid data', () => {
      expect(codec2.decode(validString)).to.deep.equal(right(validString));
    });

    it('should return true for valid data with .is()', () => {
      expect(codec2.is(validString)).to.equal(true);
    });

    it('should return false for invalid data with .is()', () => {
      expect(codec2.is('aaaaaa')).to.equal(false);
      expect(codec2.is(123)).to.equal(false);
    });
  });
});
