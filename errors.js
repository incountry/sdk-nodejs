/* eslint max-classes-per-file: "off" */

const isError = (obj) => obj instanceof Error;

function applyFirstError(fn, ...args) {
  return args.filter(isError).slice(0, 1).forEach(fn);
}

class StorageValidationError extends Error {
  constructor(validation, ...params) {
    super(params);
    this.validation = validation;
    this.name = 'StorageValidationError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageValidationError);
    }
  }
}

class StorageClientError extends Error {
  constructor(...params) {
    super(params);
    this.name = 'StorageClientError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageClientError);
    }
  }
}

class StorageServerError extends Error {
  constructor(code, responseData, ...params) {
    super(params);
    this.code = code;
    this.responseData = responseData;
    this.name = 'StorageServerError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageServerError);
    }
  }
}

class InCryptoError extends Error {
  constructor(...params) {
    super(params);
    this.name = 'InCryptoError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InCryptoError);
    }
  }
}

module.exports = {
  isError,
  applyFirstError,
  StorageClientError,
  StorageServerError,
  InCryptoError,
  StorageValidationError,
};
