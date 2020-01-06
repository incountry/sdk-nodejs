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

class ValidationError extends Error {
  constructor(...params) {
    super(params);
    this.name = 'ValidationError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageClientError);
    }
  }
}

class StorageServerError extends Error {
  constructor(e, message) {
    super(e);
    this.name = 'StorageServerError';
    if (message) {
      this.message = message;
    }
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageServerError);
    }
  }
}

module.exports = {
  StorageClientError,
  StorageServerError,
  ValidationError,
  StorageValidationError,
};
