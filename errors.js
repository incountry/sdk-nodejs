/* eslint max-classes-per-file: "off" */

const isError = (obj) => obj instanceof Error;

class StorageValidationError extends Error {
  constructor(validation, message) {
    super(message);
    this.validation = validation;
    this.name = 'StorageValidationError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageValidationError);
    }
  }
}

class StorageClientError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageClientError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageClientError);
    }
  }
}

class StorageServerError extends Error {
  constructor(code, responseData, message) {
    super(message);
    this.code = code;
    this.responseData = responseData;
    this.name = 'StorageServerError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageServerError);
    }
  }
}

class InCryptoError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InCryptoError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InCryptoError);
    }
  }
}

class SecretKeyAccessorError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecretKeyAccessorError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SecretKeyAccessorError);
    }
  }
}

module.exports = {
  isError,
  StorageClientError,
  StorageServerError,
  InCryptoError,
  SecretKeyAccessorError,
  StorageValidationError,
};
