/* eslint max-classes-per-file: "off" */

const isError = (obj) => obj instanceof Error;

class StorageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageError);
    }
  }
}

class StorageClientError extends StorageError {
  constructor(message, data) {
    super(message);
    this.name = 'StorageClientError';
    this.data = data;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageClientError);
    }
  }
}

class StorageServerError extends StorageError {
  constructor(message, data, code) {
    super(message);
    this.name = 'StorageServerError';
    this.data = data;
    this.code = code;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageServerError);
    }
  }
}

class StorageCryptoError extends StorageError {
  constructor(message) {
    super(message);
    this.name = 'StorageCryptoError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageCryptoError);
    }
  }
}
module.exports = {
  isError,
  StorageError,
  StorageClientError,
  StorageServerError,
  StorageCryptoError,
};
