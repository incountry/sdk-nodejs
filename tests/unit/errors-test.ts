import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { StorageClientError, StorageServerError, StorageCryptoError } from '../../src/errors';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('errors', () => {
  let captureStackTrace: typeof Error.captureStackTrace;
  beforeEach(() => {
    captureStackTrace = Error.captureStackTrace;
  });

  afterEach(() => {
    Error.captureStackTrace = captureStackTrace;
  });

  describe('StorageClientError', () => {
    const checkError = () => {
      const err = new StorageClientError('message');
      expect(err.name).to.eq('StorageClientError');
      expect(err.message).to.eq('message');
      expect(err.stack).to.have.length.greaterThan(0);
    };

    it('should store message and stack trace', () => {
      checkError();
    });

    it('should not call Error.captureStackTrace if it is missing', () => {
      // @ts-ignore
      Error.captureStackTrace = undefined;
      checkError();
    });
  });

  describe('StorageServerError', () => {
    const checkError = () => {
      const responseData = { data: 'data' };
      const err = new StorageServerError('message', 500, responseData);
      expect(err.name).to.eq('StorageServerError');
      expect(err.code).to.eq(500);
      expect(err.data).to.deep.equal(responseData);
      expect(err.message).to.eq('message');
      expect(err.stack).to.have.length.greaterThan(0);
    };

    it('should store code, message, responseData and stack trace', () => {
      checkError();
    });

    it('should not call Error.captureStackTrace if it is missing', () => {
      // @ts-ignore
      Error.captureStackTrace = undefined;
      checkError();
    });
  });

  describe('StorageCryptoError', () => {
    const checkError = () => {
      const err = new StorageCryptoError('message');
      expect(err.name).to.eq('StorageCryptoError');
      expect(err.message).to.eq('message');
      expect(err.stack).to.have.length.greaterThan(0);
    };

    it('should store message and stack trace', () => {
      checkError();
    });

    it('should not call Error.captureStackTrace if it is missing', () => {
      // @ts-ignore
      Error.captureStackTrace = undefined;
      checkError();
    });
  });
});
