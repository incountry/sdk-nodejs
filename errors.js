/* eslint max-classes-per-file: "off" */


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

module.exports = {
  StorageClientError,
  StorageServerError,
  StorageValidationError,
};
