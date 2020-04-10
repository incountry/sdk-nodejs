const t = require('io-ts');

const RECORD_KEY_ERROR_MESSAGE = 'Record key must be a string';

function validateRecordKey(key) {
  if (typeof key !== 'string') {
    return new Error(RECORD_KEY_ERROR_MESSAGE);
  }
  return key;
}

const RecordKeyIO = new t.Type(
  'CountryCode',
  (u) => t.string.is(u),
  (u, c) => {
    if (!t.string.is(u)) {
      return t.failure(u, c, RECORD_KEY_ERROR_MESSAGE);
    }

    return t.success(u);
  },
  String,
);

module.exports = {
  RECORD_KEY_ERROR_MESSAGE,
  RecordKeyIO,
  validateRecordKey,
};
