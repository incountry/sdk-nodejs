const t = require('io-ts');
const { nullable } = require('../utils');

const RecordIO = t.type({
  key: t.string,
  body: nullable(t.string),
  country: nullable(t.string),
  version: nullable(t.Int),
  profile_key: nullable(t.string),
  range_key: nullable(t.Int),
  key2: nullable(t.string),
  key3: nullable(t.string),
}, 'RecordIO');

module.exports = RecordIO;
