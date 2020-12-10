import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  StorageClientError,
  StorageConfigValidationError,
  SecretsProviderError,
  SecretsValidationError,
  InputValidationError,
  StorageAuthenticationError,
  StorageNetworkError,
  StorageServerError,
  StorageCryptoError,
} from '../../src/errors';

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

  describe('StorageConfigValidationError', () => {
    const checkError = () => {
      const err = new StorageConfigValidationError('message');
      expect(err.name).to.eq('StorageConfigValidationError');
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

  describe('SecretsProviderError', () => {
    const checkError = () => {
      const err = new SecretsProviderError('message');
      expect(err.name).to.eq('SecretsProviderError');
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

  describe('SecretsValidationError', () => {
    const checkError = () => {
      const err = new SecretsValidationError('message');
      expect(err.name).to.eq('SecretsValidationError');
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

  describe('InputValidationError', () => {
    const checkError = () => {
      const err = new InputValidationError('message');
      expect(err.name).to.eq('InputValidationError');
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

  describe('StorageAuthenticationError', () => {
    const checkError = () => {
      const err = new StorageAuthenticationError('message');
      expect(err.name).to.eq('StorageAuthenticationError');
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

  describe('StorageNetworkError', () => {
    const checkError = () => {
      const errData = { error: 'ETIMEDOUT' };
      const err = new StorageNetworkError('message', 503, errData);
      expect(err.name).to.eq('StorageNetworkError');
      expect(err.code).to.eq(503);
      expect(err.data).to.deep.equal(errData);
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
