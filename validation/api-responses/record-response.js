const t = require('io-ts');
const { nullable, validateWithIO } = require('../utils');

const RecordResponseIO = t.type({
  key: t.string,
  body: t.string,
  country: nullable(t.string),
  version: t.Int,
  profile_key: nullable(t.string),
  range_key: nullable(t.Int),
  key2: nullable(t.string),
  key3: nullable(t.string),
}, 'RecordResponse');

const validateRecordResponse = (record) => validateWithIO(record, RecordResponseIO);

module.exports = {
  RecordResponseIO,
  validateRecordResponse,
};
