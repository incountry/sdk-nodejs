/* eslint max-classes-per-file: "off" */
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { normalizeErrors } from '../../src/normalize-errors-decorator';
import { StorageError } from '../../src';

chai.use(chaiAsPromised);
const { expect } = chai;

class CustomError extends Error {}

const customError = (message: string) => new CustomError(message);
const storageError = (message: string) => new StorageError(message);

class A {
  constructor(
    readonly createCustomError = customError,
    readonly createStorageError = storageError,
  ) {}

  async methodWithCustomError(message: string) { throw this.createCustomError(message); }

  @normalizeErrors()
  async wrappedMethodWithCustomError(message: string) { throw this.createCustomError(message); }

  async methodWithStorageError(message: string) { throw this.createStorageError(message); }

  @normalizeErrors()
  async wrappedMethodWithStorageError(message: string) { throw this.createStorageError(message); }
}

const matchErrorMessage = (methodName: string, errorMessage: string) => new RegExp(String.raw`^Error during A\.${methodName}\(\) call\: ${errorMessage}$`);

describe('Normalize errors decorator', () => {
  it('should change other errors to StorageError in wrapped methods', async () => {
    const a = new A();
    const errorMessage = 'test';
    await expect(a.wrappedMethodWithCustomError(errorMessage)).to.be.rejectedWith(StorageError, matchErrorMessage('wrappedMethodWithCustomError', errorMessage));
  });

  it('should not change errors in other methods', async () => {
    const a = new A();
    const errorMessage = 'test';
    await expect(a.methodWithCustomError(errorMessage)).to.be.rejectedWith(CustomError, new RegExp(`^${errorMessage}$`));
  });

  it('should change error message for errors inherited from StorageError in wrapped methods', async () => {
    const a = new A();
    const errorMessage = 'test';
    await expect(a.wrappedMethodWithStorageError(errorMessage)).to.be.rejectedWith(StorageError, matchErrorMessage('wrappedMethodWithStorageError', errorMessage));
  });

  it('should not change error message for errors inherited from StorageError in other methods', async () => {
    const a = new A();
    const errorMessage = 'test';
    await expect(a.methodWithStorageError(errorMessage)).to.be.rejectedWith(StorageError, new RegExp(`^${errorMessage}$`));
  });

  it('should preserve stack trace for all errors in wrapped methods', async () => {
    const errorMessage = 'test';
    const errorStackTrace = 'error at Object.method() file.js:1:1';
    const customErrorWithStackTrace = (message: string) => {
      const error = new CustomError(message);
      error.stack = errorStackTrace;
      return error;
    };

    const storageErrorWithStackTrace = (message: string) => {
      const error = new StorageError(message);
      error.stack = errorStackTrace;
      return error;
    };

    const a = new A(customErrorWithStackTrace, storageErrorWithStackTrace);

    await expect(a.methodWithStorageError(errorMessage)).to.be.rejected.then((error) => {
      expect(error).to.be.instanceOf(StorageError);
      expect(error.message).to.contain(errorMessage);
      expect(error.stack).to.contain(errorStackTrace);
    });

    await expect(a.methodWithCustomError(errorMessage)).to.be.rejected.then((error) => {
      expect(error).to.be.instanceOf(CustomError);
      expect(error.message).to.contain(errorMessage);
      expect(error.stack).to.contain(errorStackTrace);
    });

    await expect(a.wrappedMethodWithStorageError(errorMessage)).to.be.rejected.then((error) => {
      expect(error).to.be.instanceOf(StorageError);
      expect(error.message).to.contain(errorMessage);
      expect(error.stack).to.contain(errorStackTrace);
    });

    await expect(a.wrappedMethodWithCustomError(errorMessage)).to.be.rejected.then((error) => {
      expect(error).to.be.instanceOf(StorageError);
      expect(error.message).to.contain(errorMessage);
      expect(error.stack).to.contain(errorStackTrace);
    });
  });
});
