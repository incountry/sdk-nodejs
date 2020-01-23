const t = require('io-ts');
const { nullable, validateWithIO } = require('./utils');

const RecordIO = t.type({
  key: t.string,
  body: nullable(t.string),
  version: nullable(t.Int),
  profile_key: nullable(t.string),
  range_key: nullable(t.Int),
  key2: nullable(t.string),
  key3: nullable(t.string),
}, 'RecordIO');

const validateRecord = (record) => validateWithIO(record, RecordIO);

module.exports = {
  RecordIO,
  validateRecord,
};
