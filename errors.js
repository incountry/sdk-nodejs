/* eslint max-classes-per-file: "off" */

class StorageServerError extends Error {
  constructor(...params) {
    super(params);
    this.name = 'StorageServerError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageServerError);
    }
  }
}

module.exports = {
  StorageServerError,
};
