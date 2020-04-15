const t = require('io-ts');
const { withValidate } = require('io-ts-types/lib/withValidate');
const { either } = require('fp-ts/lib/Either');
const { nullable } = require('./utils');
const { omitNulls } = require('../utils');

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

const RecordWithoutNullsIO = withValidate(RecordIO, (u, c) => either.map(RecordIO.validate(u, c), omitNulls));

module.exports = {
  RecordIO: RecordWithoutNullsIO,
};
