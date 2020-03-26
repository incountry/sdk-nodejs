const t = require('io-ts');
const { nullable, validateWithIO } = require('./utils');

/**
 * @typedef Record
 * @property {string|null} key
 * @property {string|null} body
 * @property {string|null} profile_key
 * @property {string|null} key2
 * @property {string|null} key3
 * @property {number|null} range_key
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
