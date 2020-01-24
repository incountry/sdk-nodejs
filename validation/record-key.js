const RECORD_KEY_ERROR_MESSAGE = 'Record key must be a string';

function validateRecordKey(key) {
  if (typeof key !== 'string') {
    return new Error(RECORD_KEY_ERROR_MESSAGE);
  }
  return key;
}

module.exports = {
  RECORD_KEY_ERROR_MESSAGE,
  validateRecordKey,
};
