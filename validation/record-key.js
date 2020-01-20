const RECORD_KEY_ERROR_MESSAGE = 'Record key must be a string';

function validateRecordKey(key) {
  if (typeof key !== 'string') {
    throw Error(RECORD_KEY_ERROR_MESSAGE);
  }
}

module.exports = {
  RECORD_KEY_ERROR_MESSAGE,
  validateRecordKey,
};
