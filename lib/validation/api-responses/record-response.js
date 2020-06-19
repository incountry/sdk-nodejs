const t = require('io-ts');
const { nullable } = require('../utils');

const RecordResponseIO = t.type({
  key: t.string,
  body: t.string,
  country: t.union([t.string, t.null, t.undefined]),
  version: nullable(t.Int),
  profile_key: nullable(t.string),
  range_key: nullable(t.Int),
  key2: nullable(t.string),
  key3: nullable(t.string),
}, 'RecordResponse');

module.exports = {
  RecordResponseIO,
};
