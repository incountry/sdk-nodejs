const t = require('io-ts');
const { nullable } = require('./utils');

/**
 * @typedef Record
 * @property {string} key
 * @property {number} [version]
 * @property {string|null} [body]
 * @property {string|null} [profile_key]
 * @property {string|null} [key2]
 * @property {string|null} [key3]
 * @property {number|null} [range_key]
 */

const RecordIO = t.intersection([
  t.type({
    key: t.string,
  }),
  t.partial({
    version: t.Int,
    body: nullable(t.string),
    profile_key: nullable(t.string),
    key2: nullable(t.string),
    key3: nullable(t.string),
    range_key: nullable(t.Int),
  }),
], 'Record');

module.exports = {
  RecordIO,
};
