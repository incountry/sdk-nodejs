const t = require('io-ts');
const { nullable, isValid, createStorageValidationError } = require('./utils');

const RecordIO = t.type({
  key: t.string,
  body: nullable(t.string),
  version: nullable(t.Int),
  profile_key: nullable(t.string),
  range_key: nullable(t.Int),
  key2: nullable(t.string),
  key3: nullable(t.string),
}, 'RecordIO');

function validateRecord(record) {
  const validaton = RecordIO.decode(record);
  return isValid(validaton) ? record : createStorageValidationError(validaton);
}

module.exports = {
  RecordIO,
  validateRecord,
};
