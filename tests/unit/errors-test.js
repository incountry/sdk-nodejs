const chai = require('chai');
chai.use(require('chai-as-promised'));
const { StorageClientError, StorageServerError } = require('../../errors');

const { expect } = chai;

describe('errors', () => {
  let captureStackTrace;
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

    it('should store message end stack trace', () => {
      checkError();
    });

    it('should not call Error.captureStackTrace if it is missing', () => {
      Error.captureStackTrace = undefined;
      checkError();
    });
  });

  describe('StorageServerError', () => {
    const checkError = () => {
      const responseData = { data: 'data' };
      const err = new StorageServerError(500, responseData, 'message');
      expect(err.name).to.eq('StorageServerError');
      expect(err.code).to.eq(500);
      expect(err.responseData).to.deep.equal(responseData);
      expect(err.message).to.eq('message');
      expect(err.stack).to.have.length.greaterThan(0);
    };

    it('should store code, message, responseData end stack trace', () => {
      checkError();
    });

    it('should not call Error.captureStackTrace if it is missing', () => {
      Error.captureStackTrace = undefined;
      checkError();
    });
  });
});
