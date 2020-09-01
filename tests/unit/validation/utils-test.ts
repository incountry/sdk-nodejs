/* eslint-disable prefer-arrow-callback,func-names */
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as t from 'io-ts';
import {
  toStorageClientError,
  toStorageServerError,
  validationToPromise,
  optional,
  isValid,
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
});
