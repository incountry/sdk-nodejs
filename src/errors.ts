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

class StorageConfigValidationError extends StorageClientError {
  constructor(message: string, readonly data?: unknown) {
    super(message);
    Object.setPrototypeOf(this, StorageConfigValidationError.prototype);
    this.name = 'StorageConfigValidationError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageConfigValidationError);
    }
  }
}

class SecretsProviderError extends StorageClientError {
  constructor(message: string, readonly data?: unknown) {
    super(message);
    Object.setPrototypeOf(this, SecretsProviderError.prototype);
    this.name = 'SecretsProviderError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SecretsProviderError);
    }
  }
}

class SecretsValidationError extends StorageClientError {
  constructor(message: string, readonly data?: unknown) {
    super(message);
    Object.setPrototypeOf(this, SecretsValidationError.prototype);
    this.name = 'SecretsValidationError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SecretsValidationError);
    }
  }
}

class InputValidationError extends StorageClientError {
  constructor(message: string, readonly data?: unknown) {
    super(message);
    Object.setPrototypeOf(this, InputValidationError.prototype);
    this.name = 'InputValidationError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InputValidationError);
    }
  }
}

class StorageAuthenticationError extends StorageClientError {
  constructor(message: string, readonly data?: unknown) {
    super(message);
    Object.setPrototypeOf(this, StorageAuthenticationError.prototype);
    this.name = 'StorageAuthenticationError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageAuthenticationError);
    }
  }
}

class StorageServerError extends StorageError {
  constructor(message: string, readonly code?: number, readonly data?: unknown) {
    super(message);
    Object.setPrototypeOf(this, StorageServerError.prototype);
    this.name = 'StorageServerError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageServerError);
    }
  }
}

class StorageNetworkError extends StorageServerError {
  constructor(message: string, readonly data?: unknown) {
    super(message, undefined, data);
    Object.setPrototypeOf(this, StorageNetworkError.prototype);
    this.name = 'StorageNetworkError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageNetworkError);
    }
  }
}

class StorageCryptoError extends StorageError {
  constructor(message: string, readonly data?: unknown) {
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
  StorageConfigValidationError,
  SecretsProviderError,
  SecretsValidationError,
  InputValidationError,
  StorageAuthenticationError,
  StorageServerError,
  StorageCryptoError,
  StorageNetworkError,
};
