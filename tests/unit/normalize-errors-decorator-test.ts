/* eslint max-classes-per-file: "off" */
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { normalizeErrors } from '../../src/normalize-errors-decorator';
import { StorageError } from '../../src';

chai.use(chaiAsPromised);
const { expect } = chai;

class CustomError extends Error {}

class A {
  async methodWithCustomError(message: string) { throw new CustomError(message); }

  @normalizeErrors()
  async wrappedMethodWithCustomError(message: string) { throw new CustomError(message); }

  async methodWithStorageError(message: string) { throw new StorageError(message); }

  @normalizeErrors()
  async wrappedMethodWithStorageError(message: string) { throw new CustomError(message); }
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
});
