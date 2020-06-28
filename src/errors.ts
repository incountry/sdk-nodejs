/* eslint max-classes-per-file: "off" */

class StorageError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, StorageError.prototype);
    this.name = 'StorageError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageError);
    }
  }
}

class StorageClientError extends StorageError {
  constructor(message: string, readonly data?: unknown) {
    super(message);
    Object.setPrototypeOf(this, StorageClientError.prototype);
    this.name = 'StorageClientError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageClientError);
    }
  }
}

class StorageServerError extends StorageError {
  constructor(message: string, readonly data?: unknown, readonly code?: number | string) {
    super(message);
    Object.setPrototypeOf(this, StorageServerError.prototype);
    this.name = 'StorageServerError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageServerError);
    }
  }
}

class StorageCryptoError extends StorageError {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, StorageCryptoError.prototype);
    this.name = 'StorageCryptoError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageCryptoError);
    }
  }
}

export {
  StorageError,
  StorageClientError,
  StorageServerError,
  StorageCryptoError,
};
