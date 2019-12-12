/* eslint max-classes-per-file: "off" */

class StorageRecordError extends Error {
  constructor(...params) {
    super(params);
    this.name = 'StorageRecordError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageRecordError);
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
  StorageRecordError,
  StorageServerError,
};
