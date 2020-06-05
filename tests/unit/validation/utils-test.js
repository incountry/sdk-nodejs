/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const t = require('io-ts');
const {
  toStorageClientError,
  toStorageServerError,
  validationToPromise,
} = require('../../../lib/validation/utils');
const {
  StorageClientError,
  StorageServerError,
} = require('../../../lib/errors');

const { expect } = chai;

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
});
