/* eslint-disable prefer-arrow-callback,func-names */
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as t from 'io-ts';
import { left, right, isLeft } from 'fp-ts/lib/Either';
import {
  toInputValidationError,
  toSecretsValidationError,
  toStorageAuthenticationError,
  toStorageConfigValidationError,
  toStorageServerError,
  toStorageServerValidationError,
  validationToPromise,
  optional,
  isValid,
  chainValidate,
  getErrorMessage,
  JSONIO,
} from '../../../src/validation/utils';
import {
  InputValidationError,
  StorageNetworkError,
  SecretsValidationError,
  StorageConfigValidationError,
  StorageAuthenticationError,
  StorageServerError,
} from '../../../src/errors';


chai.use(chaiAsPromised);
const { expect, assert } = chai;

describe('Validation Utils', () => {
  describe('toStorageConfigValidationError', () => {
    it('should return StorageConfigValidationError', () => {
      const validationError = t.string.decode(123);
      expect(toStorageConfigValidationError()(validationError)).to.be.instanceOf(StorageConfigValidationError);
    });
  });

  describe('toSecretsValidationError', () => {
    it('should return SecretsValidationError', () => {
      const validationError = t.string.decode(123);
      expect(toSecretsValidationError()(validationError)).to.be.instanceOf(SecretsValidationError);
    });
  });

  describe('toInputValidationError', () => {
    it('should return InputValidationError', () => {
      const validationError = t.string.decode(123);
      expect(toInputValidationError()(validationError)).to.be.instanceOf(InputValidationError);
    });
  });

  describe('toStorageAuthenticationError', () => {
    it('should return StorageAuthenticationError', () => {
      const validationError = t.string.decode(123);
      expect(toStorageAuthenticationError()(validationError)).to.be.instanceOf(StorageAuthenticationError);
    });
  });

  describe('toStorageServerValidationError', () => {
    it('should return StorageServerError', () => {
      const validationError = t.string.decode(123);
      expect(toStorageServerValidationError()(validationError)).to.be.instanceOf(StorageServerError);
    });
  });

  describe('toStorageServerError', () => {
    it('should return StorageServerError if error has integer "code"', () => {
      const error = { code: 123 };
      expect(toStorageServerError()(error)).to.be.instanceOf(StorageServerError);
    });

    it('should return StorageServerError if error.response has integer "status"', () => {
      const error = { response: { status: 123 } };
      expect(toStorageServerError()(error)).to.be.instanceOf(StorageServerError);
    });

    it('should return StorageNetworkError when called without params', () => {
      expect(toStorageServerError()()).to.be.instanceOf(StorageNetworkError);
    });

    it('should return StorageNetworkError if error has neither "code" nor "response.status"', () => {
      const error = { aaa: '123' };
      expect(toStorageServerError()(error)).to.be.instanceOf(StorageNetworkError);
      expect(toStorageServerError()(error).data).to.deep.eq(error);
    });

    it('should return StorageNetworkError if error has non-integer "code"', () => {
      const error = { code: 'ERROR', response: { status: 123 } };
      expect(toStorageServerError()(error)).to.be.instanceOf(StorageNetworkError);
      expect(toStorageServerError()(error).data).to.deep.eq(error);
    });

    it('should return StorageNetworkError if error.response has non-integer "status"', () => {
      const error = { response: { status: 'ERROR' } };
      expect(toStorageServerError()(error)).to.be.instanceOf(StorageNetworkError);
      expect(toStorageServerError()(error).data).to.deep.eq(error);
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
    const codec1 = chainValidate(t.UnknownRecord, (u) => right(u));

    const errorMessage = 'This should have .test prop';
    const codec2 = chainValidate(t.UnknownRecord, (u) => (u as any).test ? right(u) : left(`${errorMessage} but got ${JSON.stringify(u)}`), 'SuperObject');
    const validData = { test: 1 };

    it('should have original codec error', () => {
      const result = codec1.decode(123);
      expect(isLeft(result)).to.equal(true);
      expect(getErrorMessage(result)).to.equal('<UnknownRecord> should be UnknownRecord but got 123');
    });

    it('should have original codec result', () => {
      expect(codec1.decode({})).to.deep.equal(right({}));
    });

    it('should return error for invalid data', () => {
      const result = codec2.decode({});
      expect(isLeft(result)).to.equal(true);
      expect(getErrorMessage(result)).to.include(errorMessage);
    });

    it('should return success for valid data', () => {
      expect(codec2.decode(validData)).to.deep.equal(right(validData));
    });

    it('should return true for valid data with .is()', () => {
      expect(codec2.is(validData)).to.equal(true);
    });

    it('should return false for invalid data with .is()', () => {
      expect(codec2.is('aaaaaa')).to.equal(false);
      expect(codec2.is(123)).to.equal(false);
      expect(codec2.is({})).to.equal(false);
    });
  });

  describe('JSONIO validation', () => {
    const codec = JSONIO;

    describe('.is()', () => {
      it('should return false for invalid JSON', () => {
        expect(codec.is('{ "aaa": 1 ')).to.equal(false);
      });

      it('should return true for valid JSON', () => {
        expect(codec.is('{ "aaa": 1 }')).to.equal(true);
      });
    });

    describe('.decode()', () => {
      it('should not decode invalid JSON', () => {
        expect(isValid(codec.decode('{ "aaa": 1 '))).to.equal(false);
      });

      it('should decode valid JSON', () => {
        expect(isValid(codec.decode('{ "aaa": 1 }'))).to.equal(true);
      });
    });
  });
});
