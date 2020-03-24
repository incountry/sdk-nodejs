const t = require('io-ts');
const { nullable, validateWithIO } = require('./utils');

/**
 * @typedef Record
 * @property {string} key
 * @property {string} body
 * @property {string} profile_key
 * @property {string} key2
 * @property {string} key3
 * @property {number} range_key
 * @property {number} version
 */

const RecordIO = t.intersection([
  t.type({
    key: t.string,
  }),
  t.partial({
    body: nullable(t.string),
    version: nullable(t.Int),
    profile_key: nullable(t.string),
    range_key: nullable(t.Int),
    key2: nullable(t.string),
    key3: nullable(t.string),
  }),
], 'Record');

const validateRecord = (record) => validateWithIO(record, RecordIO);

module.exports = {
  RecordIO,
  validateRecord,
};
